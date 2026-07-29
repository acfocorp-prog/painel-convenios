// supabase/functions/fetch-deadlines/index.ts
//
// Edge Function invocada diariamente pelo pg_cron (ver migration
// `20260729000000_official_deadlines_pg_cron.sql`). Faz o mesmo trabalho
// do script Node `scripts/fetch-official-deadlines.mjs` — busca em
// Querido Diário, FNDE RSS e MEC RSS, classifica, e faz upsert em
// `public.official_deadlines` via Supabase REST + service-role key.
//
// Secrets (configurados no Dashboard → Edge Functions → Secrets):
//   SUPABASE_URL                  ex.: https://abc.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY     service_role key (NUNCA expor)
//   QD_TERRITORY_IDS              CSV de IBGE codes (opcional)
//   LOOKBACK_DAYS                 janela retroativa (opcional, default 14)
//
// Deploy:
//   npx supabase functions deploy fetch-deadlines --no-verify-jwt
// Invocação manual:
//   curl -X POST "$SUPABASE_URL/functions/v1/fetch-deadlines" \
//        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

const DEFAULT_TERRITORIES = [
  '3550308', // São Paulo
  '3304557', // Rio de Janeiro
  '5300108', // Brasília (DF)
  '3106200', // Belo Horizonte
];

const CATEGORY_RULES: Array<{ cat: string; keys: string[] }> = [
  { cat: 'SIMEC', keys: ['simec', 'plano de ações articuladas', 'plano de acoes articuladas', 'pde escola', 'pde-escola', 'pdde interativo'] },
  { cat: 'CONVENIO', keys: ['convênio', 'convenio', 'fnde', 'pdde', 'pnae', 'pnate', 'censo escolar', 'repasse', 'prestação de contas', 'prestacao de contas', 'recurso federal'] },
  { cat: 'BIENIO', keys: ['biênio', 'bienio', 'eleição de diretor', 'eleicao de diretor', 'processo bienal', 'cronograma bienal', 'gestão democrática', 'gestao democratica'] },
  { cat: 'MANDATO', keys: ['mandato tampão', 'mandato tampao', 'designação temporária', 'designacao temporaria', 'vacância', 'vacancia', 'caráter temporário', 'carater temporaria'] },
];

const URGENT_KEYS = ['urgente', 'prazo final', 'imediato', 'encerra hoje', 'último dia', 'ultimo dia', 'encerramento'];
const ATTENTION_KEYS = ['atenção', 'atencao', 'prorrogar', 'aditamento', 'suspenso'];

const QD_QUERY_BAGS: Array<{ tag: string; q: string }> = [
  { tag: 'convenio', q: 'convênio educação FNDE' },
  { tag: 'simec', q: 'SIMEC adesão escola municipal' },
  { tag: 'bienio', q: 'biênio diretores escolha' },
  { tag: 'mandato', q: 'mandato tampão designação diretor' },
  { tag: 'geral', q: 'secretaria municipal educação prazo' },
];

const RSS_FEEDS: Array<{ url: string; source: string }> = [
  { url: 'https://www.gov.br/fnde/rss.xml', source: 'FNDE' },
  { url: 'https://www.gov.br/mec/rss.xml', source: 'MEC' },
];

// Diário Oficial de Itaboraí/RJ — portal oficial (AdConvênios).
// QD (Querido Diário) tem Itaboraí cadastrado mas sem dados scraped
// (availability_date vazio). Então raspamos direto do portal municipal.
const ITABORAI_DO_FEEDS: Array<{ url: string; label: string }> = [
  { url: 'https://doeita.ad-convenios.com/', label: 'Itaboraí/RJ' },
  { url: 'https://www.itaborai.rj.gov.br/diario-oficial/', label: 'Itaboraí/RJ (fallback)' },
];

// ─── HTTP helpers com timeout + retries ────────────────────────────────
async function fetchJSON(url: string, init: RequestInit = {}): Promise<unknown> {
  let lastErr: Error | null = null;
  for (let i = 0; i <= 2; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      clearTimeout(t);
      lastErr = e as Error;
      if (i < 2) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr!;
}

async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  let lastErr: Error | null = null;
  for (let i = 0; i <= 2; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      clearTimeout(t);
      lastErr = e as Error;
      if (i < 2) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr!;
}

function classify(text: string): { category: string; severity: string } {
  const t = (text || '').toLowerCase();
  let category = 'GERAL';
  for (const rule of CATEGORY_RULES) {
    if (rule.keys.some((k) => t.includes(k))) {
      category = rule.cat;
      break;
    }
  }
  let severity = 'INFO';
  if (URGENT_KEYS.some((k) => t.includes(k))) severity = 'URGENTE';
  else if (ATTENTION_KEYS.some((k) => t.includes(k))) severity = 'ATENCAO';
  return { category, severity };
}

async function sha1(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

function stripTags(s: string | null): string | null {
  if (!s) return null;
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function getTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? m[1] : null;
}

interface ParsedItem {
  title: string;
  description: string | null;
  source: string;
  source_url: string;
  source_external_id: string;
  category: string;
  severity: string;
  due_date: null;
  published_at: string;
}

async function parseRSS(xml: string, source: string): Promise<ParsedItem[]> {
  const items: ParsedItem[] = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = stripTags(getTag(block, 'title'));
    let link = getTag(block, 'link')?.trim();
    if (!link) {
      const linkRes = block.match(/<link[^>]+resource="([^"]+)"/i);
      if (linkRes) link = linkRes[1].trim();
    }
    const guid = getTag(block, 'guid')?.trim();
    const pubDate = getTag(block, 'pubDate')?.trim();
    const description = stripTags(getTag(block, 'description'));
    if (!title || (!link && !guid)) continue;
    const url = link || guid!;
    const date = pubDate
      ? new Date(pubDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const { category, severity } = classify(`${title} ${description || ''}`);
    const extId = await sha1(url);
    items.push({
      title,
      description: description ? description.slice(0, 500) : null,
      source,
      source_url: url,
      source_external_id: `${source}:${extId}`,
      category,
      severity,
      due_date: null,
      published_at: date,
    });
  }
  return items;
}

async function fetchRSS(url: string, source: string): Promise<ParsedItem[]> {
  try {
    const xml = await fetchText(url, {
      headers: {
        'User-Agent': 'painel-convenios-cron/1.0 (+github.com/acfocorp-prog/painel-convenios)',
        Accept: '*/*',
      },
    });
    return await parseRSS(xml, source);
  } catch (e) {
    console.warn(`[${source}] falhou: ${(e as Error).message}`);
    return [];
  }
}

async function fetchQueridoDiario(territories: string[], sinceISO: string): Promise<ParsedItem[]> {
  // Paraleliza todos os pares (território × query_bag) pra caber no timeout
  // do pg_net.http_post (5s por padrão). 4 territórios × 5 bags = 20 chamadas
  // simultâneas; cada QD retorna ≤15 itens.
  const fetches = territories.flatMap((territory) =>
    QD_QUERY_BAGS.map(async (bag) => {
      const u = new URL('https://api.queridodiario.ok.org.br/gazettes/');
      u.searchParams.set('querystring', bag.q);
      u.searchParams.set('territory_ids', territory);
      u.searchParams.set('start_date', sinceISO);
      u.searchParams.set('end_date', new Date().toISOString().slice(0, 10));
      u.searchParams.set('size', '15');
      u.searchParams.set('sort_by', 'relevance');
      try {
        const data = (await fetchJSON(u.toString(), {
          headers: {
            'User-Agent': 'painel-convenios-cron/1.0 (+github.com/acfocorp-prog/painel-convenios)',
            Accept: 'application/json',
          },
        })) as { gazettes?: Array<{ date: string; url: string; territory_name?: string; excerpts?: string[] }> };
        const out: ParsedItem[] = [];
        for (const g of data.gazettes || []) {
          const excerpt = (g.excerpts?.[0] || '').slice(0, 500);
          const date = g.date;
          const text = `${g.territory_name || ''} ${excerpt}`.trim();
          const { category, severity } = classify(text);
          const extId = await sha1(`qd:${territory}:${date}:${bag.tag}:${g.url || ''}`);
          out.push({
            title: `${g.territory_name || 'Município'} — Diário Oficial ${date}`,
            description: excerpt || null,
            source: 'QUERIDO_DIARIO',
            source_url: g.url,
            source_external_id: extId,
            category,
            severity,
            due_date: null,
            published_at: date,
          });
        }
        return out;
      } catch (e) {
        console.warn(`[qd] ${territory}/${bag.tag} falhou: ${(e as Error).message}`);
        return [];
      }
    }),
  );
  const all = await Promise.all(fetches);
  return all.flat();
}

// ─── Diário Oficial de Itaboraí/RJ ────────────────────────────────────
// QD (Querido Diário) tem Itaboraí cadastrado (3301900) mas sem dados
// scraped (availability_date vazio). Então raspamos direto do portal
// municipal. Tenta o host real primeiro (doeita.ad-convenios.com) e, se
// falhar (DNS/rede), cai pra URL da prefeitura.
async function fetchItaboraiDO(
  feeds: Array<{ url: string; label: string }>,
  collectDebug?: string[],
): Promise<ParsedItem[]> {
  // Hosts da Prefeitura de Itaboraí (doeita.ad-convenios.com e
  // portal.ib.itaborai.rj.gov.br) estão em DNS interno municipal e não
  // resolvem de redes públicas. Tentamos mesmo assim (best-effort) e
  // logamos o erro se falhar — quando a infraestrutura resolver, o cron
  // começa a coletar automaticamente sem precisar mexer em código.
  const log = (m: string) => {
    console.log(`[itaborai] ${m}`);
    collectDebug?.push(m);
  };
  for (const feed of feeds) {
    try {
      const html = await fetchText(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; painel-convenios-cron/1.0; +github.com/acfocorp-prog/painel-convenios)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      const items = await parseItaboraiList(html, feed.url, feed.label);
      if (items.length > 0) {
        log(`${feed.url} → ${items.length} itens`);
        return items;
      }
    } catch (e) {
      log(`${feed.url} falhou: ${(e as Error).message}`);
    }
  }
  return [];
}

async function parseItaboraiList(html: string, baseUrl: string, label: string): Promise<ParsedItem[]> {
  // Extrair todos os <a> com href + texto visível. Filtrar por palavras
  // que pareçam edições/publicações/atos. Datas no formato BR (DD/MM/YYYY)
  // ou ISO (YYYY-MM-DD).
  const items: ParsedItem[] = [];
  const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  const dateReBR = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
  const dateReISO = /\b(\d{4})-(\d{2})-(\d{2})\b/;

  while ((m = anchorRe.exec(html))) {
    const attrs = m[1];
    const text = (stripTags(m[2]) || '').replace(/\s+/g, ' ').trim();
    if (text.length < 5 || text.length > 200) continue;
    const hrefMatch = attrs.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    if (!/\.pdf$|diario|edicao|publicacao|download|visualizar|\/do\//i.test(href)) continue;

    const hasDate = dateReBR.test(text) || dateReISO.test(text);
    const looksLikeItem = /di[aá]rio|edi[cç][aã]o|publica[cç][aã]o|ato|portaria|decreto|lei|extrato|termo|aviso/i.test(text);
    if (!hasDate && !looksLikeItem) continue;

    let abs: string;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(abs)) continue;
    seen.add(abs);

    let dateISO: string | null = null;
    const br = text.match(dateReBR);
    if (br) dateISO = `${br[3]}-${br[2]}-${br[1]}`;
    else {
      const iso = text.match(dateReISO);
      if (iso) dateISO = `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
    if (!dateISO) dateISO = new Date().toISOString().slice(0, 10);

    // Filtra janela retroativa pra não poluir o banco
    const sinceMs = Date.now() - 60 * 86_400_000;
    if (new Date(dateISO).getTime() < sinceMs) continue;

    const { category, severity } = classify(`${label} ${text}`);
    const extId = await sha1(`itaborai:${abs}`);
    items.push({
      title: `${label} — ${text.slice(0, 120)}`,
      description: null,
      source: 'PREFEITURA',
      source_url: abs,
      source_external_id: `PREFEITURA_ITABORAI:${extId}`,
      category,
      severity,
      due_date: null,
      published_at: dateISO,
    });
  }
  return items.slice(0, 30);
}

Deno.serve(async () => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const territories = (Deno.env.get('QD_TERRITORY_IDS') || DEFAULT_TERRITORIES.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const lookbackDays = Math.max(1, parseInt(Deno.env.get('LOOKBACK_DAYS') || '14', 10));
  const sinceISO = new Date(Date.now() - lookbackDays * 86_400_000).toISOString().slice(0, 10);

  console.log(`[fetch] desde=${sinceISO} · territórios=${territories.length}`);

  const debugItaborai: string[] = [];
  const [qdItems, fndeItems, mecItems, itaboraiItems] = await Promise.all([
    fetchQueridoDiario(territories, sinceISO),
    fetchRSS(RSS_FEEDS[0].url, RSS_FEEDS[0].source),
    fetchRSS(RSS_FEEDS[1].url, RSS_FEEDS[1].source),
    fetchItaboraiDO(ITABORAI_DO_FEEDS, debugItaborai),
  ]);

  const all = [...qdItems, ...fndeItems, ...mecItems, ...itaboraiItems];
  console.log(
    `[fetch] coletados: QD=${qdItems.length} FNDE=${fndeItems.length} MEC=${mecItems.length} ` +
    `Itaboraí=${itaboraiItems.length} total=${all.length}`,
  );
  console.log(`[itaborai-debug] ${debugItaborai.join(' | ')}`);

  if (all.length === 0) {
    return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const dedup = new Map<string, ParsedItem>();
  for (const item of all) {
    const k = `${item.source}::${item.source_external_id}`;
    if (!dedup.has(k)) dedup.set(k, item);
  }
  const rows = [...dedup.values()];

  const endpoint = `${SUPABASE_URL}/rest/v1/official_deadlines?on_conflict=source,source_external_id`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ error: `upsert falhou: HTTP ${res.status}`, detail: text }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      inserted: rows.length,
      breakdown: {
        qd: qdItems.length,
        fnde: fndeItems.length,
        mec: mecItems.length,
        itaborai: itaboraiItems.length,
      },
      itaboraiDebug: debugItaborai,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});

