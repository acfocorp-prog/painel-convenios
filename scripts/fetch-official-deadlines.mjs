#!/usr/bin/env node
// scripts/fetch-official-deadlines.mjs
//
// Busca avisos oficiais em fontes públicas e faz upsert em
// public.official_deadlines via Supabase REST + service-role key.
//
// Fontes:
//   1. Querido Diário  → https://api.queridodiario.ok.org.br/gazettes/
//      Indexa D.O. municipais e algumas edições federais. É a fonte mais
//      confiável para "Diário Oficial do meu município".
//   2. FNDE            → https://www.gov.br/fnde/rss.xml
//      Comunicados, editais, prestações de contas de programas federais.
//   3. MEC             → https://www.gov.br/mec/rss.xml
//      Notícias do Ministério da Educação (SIMEC, PAR, formação etc.).
//
// DOU (federal) direto foi descartado: IN.gov.br exige CSRF token + cookies
// de sessão, inviável em fetch server-side.
//
// Configuração via env (lido pelo GitHub Actions):
//   SUPABASE_URL                  ex.: https://abc.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY     service_role key (NUNCA expor no front)
//   QD_TERRITORY_IDS              CSV de códigos IBGE a varrer (opcional;
//                                 default = principais capitais brasileiras)
//   LOOKBACK_DAYS                 janela de busca retroativa (default: 14)
//
// Saída: log estruturado em stdout (capturado pelo GitHub Actions).
// Falha não-fatal: se uma fonte falhar, tenta a próxima. Exit 1 só se o
// upsert final falhar.

import crypto from 'node:crypto';

// ─── Classificador: categoria + severidade a partir de título + texto ──
const CATEGORY_RULES = [
  { cat: 'SIMEC', keys: ['simec', 'plano de ações articuladas', 'plano de acoes articuladas', 'pde escola', 'pde-escola', 'pdde interativo'] },
  { cat: 'CONVENIO', keys: ['convênio', 'convenio', 'fnde', 'pdde', 'pnae', 'pnate', 'censo escolar', 'repasse', 'prestação de contas', 'prestacao de contas', 'recurso federal'] },
  { cat: 'BIENIO', keys: ['biênio', 'bienio', 'eleição de diretor', 'eleicao de diretor', 'processo bienal', 'cronograma bienal', 'gestão democrática', 'gestao democratica'] },
  { cat: 'MANDATO', keys: ['mandato tampão', 'mandato tampao', 'designação temporária', 'designacao temporaria', 'vacância', 'vacancia', 'caráter temporário', 'carater temporaria'] },
];

const URGENT_KEYS = ['urgente', 'prazo final', 'imediato', 'encerra hoje', 'último dia', 'ultimo dia', 'encerramento'];
const ATTENTION_KEYS = ['atenção', 'atencao', 'prorrogar', 'aditamento', 'suspenso'];

function classify(text) {
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

// ─── HTTP helpers com timeout + retries ────────────────────────────────
async function fetchJSON(url, { timeoutMs = 12_000, retries = 2, headers = {} } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'painel-convenios-cron/1.0 (+github.com/acfocorp-prog/painel-convenios)',
          Accept: 'application/json',
          ...headers,
        },
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

async function fetchText(url, { timeoutMs = 12_000, retries = 2, headers = {} } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'painel-convenios-cron/1.0 (+github.com/acfocorp-prog/painel-convenios)',
          Accept: '*/*',
          ...headers,
        },
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

// ─── Querido Diário ─────────────────────────────────────────────────────
// API real: https://api.queridodiario.ok.org.br/gazettes/
// Docs: https://queridodiario.ok.org.br/api/gazettes/ (SPA, ver env.js p/ base URL)
const DEFAULT_TERRITORIES = [
  '3550308', // São Paulo
  '3304557', // Rio de Janeiro
  '5300108', // Brasília (DF)
  '2304400', // Fortaleza
  '2927408', // Salvador
  '3106200', // Belo Horizonte
  '1302603', // Manaus
  '4106902', // Curitiba
  '2611606', // Recife
  '5208707', // Goiânia
  '1501402', // Belém
  '4314902', // Porto Alegre
];

const QD_QUERY_BAGS = [
  { tag: 'convenio', q: 'convênio educação FNDE' },
  { tag: 'simec',    q: 'SIMEC adesão escola municipal' },
  { tag: 'bienio',   q: 'biênio diretores escolha' },
  { tag: 'mandato',  q: 'mandato tampão designação diretor' },
  { tag: 'geral',    q: 'secretaria municipal educação prazo' },
];

async function fetchQueridoDiario(territories, sinceISO) {
  const items = [];
  for (const territory of territories) {
    for (const bag of QD_QUERY_BAGS) {
      const url = new URL('https://api.queridodiario.ok.org.br/gazettes/');
      url.searchParams.set('querystring', bag.q);
      url.searchParams.set('territory_ids', territory);
      url.searchParams.set('start_date', sinceISO);
      url.searchParams.set('end_date', new Date().toISOString().slice(0, 10));
      url.searchParams.set('size', '15');
      url.searchParams.set('sort_by', 'relevance');
      try {
        const data = await fetchJSON(url.toString());
        for (const g of data.gazettes || []) {
          const excerpt = (g.excerpts?.[0] || '').slice(0, 500);
          const date = g.date;
          const text = `${g.territory_name || ''} ${excerpt}`.trim();
          const { category, severity } = classify(text);
          // source_external_id estável: dedup entre runs.
          const extId = hashId(`qd:${territory}:${date}:${bag.tag}:${g.url || ''}`);
          items.push({
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
      } catch (e) {
        console.warn(`[qd] ${territory}/${bag.tag} falhou: ${e.message}`);
      }
    }
  }
  return items;
}

// ─── RSS feeds (FNDE, MEC) ──────────────────────────────────────────────
const RSS_FEEDS = [
  { url: 'https://www.gov.br/fnde/rss.xml', source: 'FNDE' },
  { url: 'https://www.gov.br/mec/rss.xml', source: 'MEC' },
];

async function fetchRSS(url, source) {
  try {
    const xml = await fetchText(url);
    return parseRSS(xml, source);
  } catch (e) {
    console.warn(`[${source}] falhou: ${e.message}`);
    return [];
  }
}

function getTag(block, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? m[1] : null;
}

function stripTags(s) {
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

function parseRSS(xml, source) {
  const items = [];
  // RSS 2.0 + RDF/RSS 1.0: <item>...</item>
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = stripTags(getTag(block, 'title'));
    // RSS 2.0: <link>https://...</link>  | RDF: <link>resource="..."/>
    let link = getTag(block, 'link')?.trim();
    if (!link) {
      const linkRes = block.match(/<link[^>]+resource="([^"]+)"/i);
      if (linkRes) link = linkRes[1].trim();
    }
    const guid = getTag(block, 'guid')?.trim();
    const pubDate = getTag(block, 'pubDate')?.trim();
    const description = stripTags(getTag(block, 'description'));
    if (!title || (!link && !guid)) continue;
    const url = link || guid;
    const date = pubDate
      ? new Date(pubDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const { category, severity } = classify(`${title} ${description || ''}`);
    items.push({
      title,
      description: description ? description.slice(0, 500) : null,
      source,
      source_url: url,
      source_external_id: hashId(`${source}:${url}`),
      category,
      severity,
      due_date: null,
      published_at: date,
    });
  }
  return items;
}

function hashId(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 24);
}

// ─── Main ──────────────────────────────────────────────────────────────
async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
    process.exit(1);
  }

  const territories = (process.env.QD_TERRITORY_IDS || DEFAULT_TERRITORIES.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const lookbackDays = Math.max(1, parseInt(process.env.LOOKBACK_DAYS || '14', 10));
  const sinceISO = new Date(Date.now() - lookbackDays * 86_400_000)
    .toISOString()
    .slice(0, 10);

  console.log(`[fetch] desde=${sinceISO} · territórios=${territories.length}`);

  // Coleta paralela — uma fonte caindo não derruba as outras.
  const fetches = await Promise.allSettled([
    fetchQueridoDiario(territories, sinceISO),
    ...RSS_FEEDS.map((f) => fetchRSS(f.url, f.source)),
  ]);

  const qdItems = fetches[0].status === 'fulfilled' ? fetches[0].value : [];
  const fndeItems = fetches[1].status === 'fulfilled' ? fetches[1].value : [];
  const mecItems = fetches[2].status === 'fulfilled' ? fetches[2].value : [];
  if (fetches[0].status === 'rejected') console.warn('[qd] erro:', fetches[0].reason?.message);
  if (fetches[1].status === 'rejected') console.warn('[FNDE] erro:', fetches[1].reason?.message);
  if (fetches[2].status === 'rejected') console.warn('[MEC] erro:', fetches[2].reason?.message);

  const all = [...qdItems, ...fndeItems, ...mecItems];
  console.log(
    `[fetch] coletados: QD=${qdItems.length} FNDE=${fndeItems.length} MEC=${mecItems.length} total=${all.length}`,
  );

  if (all.length === 0) {
    console.log('[fetch] nada para inserir. saindo (ok).');
    return;
  }

  // Dedup em memória por (source, source_external_id) — UPSERT em batch evita
  // duplicatas dentro do mesmo run (categoria re-classificada, etc.).
  const dedup = new Map();
  for (const item of all) {
    const k = `${item.source}::${item.source_external_id}`;
    if (!dedup.has(k)) dedup.set(k, item);
  }
  const rows = [...dedup.values()];
  if (rows.length !== all.length) {
    console.log(`[fetch] dedup em memória: ${all.length} → ${rows.length}`);
  }

  // Upsert via REST — dedup por (source, source_external_id).
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
    console.error(`[fetch] upsert falhou: HTTP ${res.status} — ${text}`);
    process.exit(1);
  }
  console.log(`[fetch] ✓ upsert de ${rows.length} linhas OK.`);
}

main().catch((e) => {
  console.error('[fetch] erro fatal:', e);
  process.exit(1);
});
