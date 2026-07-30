import ExcelJS from 'exceljs';

/**
 * Helpers de Excel usando exceljs (browser-side, sem dependência Node).
 *
 * Estratégia: cada export/import é descrito como `{ name, headers, rows }`.
 * `headers` é uma tupla `[chave, rótulo PT-BR, tipo?]`. O `tipo` é usado pelo
 * import pra fazer coerce (date → string ISO, number → number, etc).
 *
 * Export escreve 1 sheet com cabeçalho formatado (negrito, fundo brand-50,
 * congelar primeira linha).
 *
 * Import detecta automaticamente o formato do arquivo a partir dos primeiros
 * bytes:
 *  - `<` ... → HTML (modelo FNDE "Situação Cadastral das Entidades" salvo
 *    como .xls). Usa DOMParser nativo.
 *  - `PK` (50 4B) → xlsx (zip). Usa exceljs.xlsx.load().
 *  - .xls binário legacy (BIFF/OLE2) NÃO é suportado — FNDE não usa mais.
 *
 * Reconhecimento de cabeçalho é tolerante: aliases configurados via
 * `HEADER_ALIASES` mapeiam nomes do FNDE ("Código Escola") para a chave
 * canônica (`inep`). Normalização é case + accent-insensitive.
 */

// ── Tipos ──────────────────────────────────────────────────────────────

export type ColumnType = 'string' | 'number' | 'date' | 'boolean';

export interface ColumnSpec<T = unknown> {
  key: keyof T & string;
  header: string;
  type?: ColumnType;
  /** Largura em caracteres (default 16). */
  width?: number;
}

export interface SheetSpec<T> {
  name: string;
  columns: ColumnSpec<T>[];
  rows: T[];
}

export interface ParsedRow<T> {
  rowIndex: number; // 1-based, ignorando header
  data: Partial<T>;
  errors: string[];
}

// ── Helpers internos ───────────────────────────────────────────────────

function normalizeHeader(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Coerce valor de célula pra tipo declarado na coluna. */
function coerce(value: unknown, type: ColumnType | undefined): unknown {
  if (value === null || value === undefined || value === '') return null;
  if (!type || type === 'string') {
    // exceljs pode entregar Date como objeto; normaliza pra ISO quando
    // header é declarado como 'date' mas coluna é tipo string.
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value);
  }
  if (type === 'date') {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    // string/num: tenta Date
    const d = new Date(value as string | number);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (type === 'number') {
    if (typeof value === 'number') return value;
    const s = String(value).replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    const s = String(value).toLowerCase().trim();
    if (['sim', 's', 'true', '1', 'verdadeiro'].includes(s)) return true;
    if (['nao', 'não', 'n', 'false', '0', 'falso'].includes(s)) return false;
    return null;
  }
  return value;
}

/**
 * Aliases de cabeçalho: chave canônica → variantes aceitas (case/accent
 * insensitivity). Usado tanto no xlsx (FNDE exporta com "Código Escola")
 * quanto no HTML. Não inclui a chave canônica — ela é sempre aceita.
 */
export const HEADER_ALIASES: Record<string, string[]> = {
  inep: ['codigo escola', 'cod escola'],
  name: ['escola', 'nome da escola', 'nome'],
  active: ['ativo', 'situacao', 'situação'],
  phone: ['telefone', 'fone', 'tel', 'phone'],
  phone_ddd: ['ddd', 'ddd telefone', 'codigo ddd', 'cod ddd'],
  email: ['e-mail', 'email', 'correio eletronico'],
  cnpj_eex: ['cnpj eex', 'cnpj da eex', 'cnpj entidade', 'cnpj da entidade executora'],
  cnpj_uex: ['cnpj uex', 'cnpj da uex', 'cnpj unidade', 'cnpj da unidade executora'],
  rede_atendimento: ['rede', 'rede de atendimento'],
  localizacao: ['localização', 'localizacao'],
  mandato_dirigente: ['mandato', 'mandato dirigente', 'situacao mandato'],
  data_fim_mandato: [
    'data fim mandato',
    'data fim do mandato',
    'termino mandato',
    'término mandato',
    'validade mandato',
  ],
};

/**
 * Dado o header da planilha (texto bruto) e a lista de colunas canônicas,
 * devolve o `key` da coluna correspondente ou `null` se não reconhecido.
 * Aceita o header canônico exato OU qualquer variante em HEADER_ALIASES.
 */
function matchColumnKey(headerText: string, columns: ColumnSpec[]): string | null {
  const norm = normalizeHeader(headerText);
  if (!norm) return null;
  // match exato na chave canônica (sem precisar estar em aliases)
  const direct = columns.find((c) => normalizeHeader(c.header) === norm);
  if (direct) return direct.key;
  // match via alias
  for (const [canonKey, aliases] of Object.entries(HEADER_ALIASES)) {
    if (!columns.some((c) => c.key === canonKey)) continue;
    if (aliases.some((a) => normalizeHeader(a) === norm)) return canonKey;
  }
  return null;
}

// ── Export ─────────────────────────────────────────────────────────────

/**
 * Exporta 1 sheet (ou várias) pra um arquivo .xlsx baixado pelo browser.
 * @param filename  nome do arquivo, ex.: 'convenios-2026-07-28.xlsx'
 * @param sheets    array de sheets a incluir
 */
export async function exportToExcel<T>(
  filename: string,
  sheets: SheetSpec<T>[],
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Painel de Convênios';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    ws.columns = sheet.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 16,
    }));

    // Estilo do header
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FF1E293B' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    headerRow.alignment = { vertical: 'middle', wrapText: true };

    // Linhas
    for (const r of sheet.rows) {
      const row = ws.addRow([]);
      sheet.columns.forEach((c, idx) => {
        const raw = (r as Record<string, unknown>)[c.key];
        const coerced = coerce(raw, c.type);
        row.getCell(idx + 1).value = (coerced ?? '') as ExcelJS.CellValue;
      });
    }

    // Zebra leve — fills alternados melhoram legibilidade
    for (let i = 2; i <= ws.rowCount; i++) {
      if (i % 2 === 0) {
        const row = ws.getRow(i);
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFAFAFA' },
        };
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename);
}

// ── Import ─────────────────────────────────────────────────────────────

/**
 * Detecta formato do arquivo pelos primeiros bytes:
 *  - `PK` (0x50 0x4B) → xlsx (zip)
 *  - `<` → HTML
 *  - qualquer outra coisa → erro
 */
async function detectFormat(file: File): Promise<'xlsx' | 'html'> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (head[0] === 0x50 && head[1] === 0x4b) return 'xlsx';
  // 0x3C = '<'
  if (head[0] === 0x3c) return 'html';
  // alguns HTMLs vêm com BOM UTF-8 antes do '<'
  if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf && head[3] === 0x3c) return 'html';
  throw new Error(
    'Formato não suportado. Use .xlsx (Excel/Sheets) ou o modelo FNDE (.xls/HTML).',
  );
}

/**
 * Lê o arquivo e mapeia linhas pelo header. Aceita .xlsx e HTML (modelo FNDE).
 *
 * Tolerante a:
 *  - colunas extras (ignoradas)
 *  - colunas faltantes (viram undefined)
 *  - aliases do FNDE ("Código Escola" → inep, etc)
 *
 * @returns array de ParsedRow com data parcial + errors por linha
 */
export async function importFromExcel<T>(
  file: File,
  columns: ColumnSpec<T>[],
): Promise<ParsedRow<T>[]> {
  const fmt = await detectFormat(file);
  if (fmt === 'html') return parseHTMLTable(file, columns);
  return parseXLSX(file, columns);
}

async function parseXLSX<T>(
  file: File,
  columns: ColumnSpec<T>[],
): Promise<ParsedRow<T>[]> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  // Mapeia header da planilha → chave de coluna
  const headerRow = ws.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const key = matchColumnKey(String(cell.value ?? ''), columns as ColumnSpec[]);
    if (key) colIndex[key] = colNumber;
  });

  const out: ParsedRow<T>[] = [];

  // Linhas: a partir da 2 (assumindo header na linha 1)
  for (let i = 2; i <= ws.rowCount; i++) {
    const r = ws.getRow(i);
    if (r.hasValues === false) continue; // pula linhas vazias

    const data: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const col of columns) {
      const colNum = colIndex[col.key];
      if (!colNum) continue; // coluna ausente → pula (não é erro)
      const raw = r.getCell(colNum).value;
      const coerced = coerce(raw, col.type);
      if (coerced === null && raw !== null && raw !== '') {
        // só reclama se tinha valor mas falhou o coerce
        errors.push(
          `Coluna "${col.header}": valor inválido (${String(raw).slice(0, 20)})`,
        );
      }
      data[col.key] = coerced;
    }

    out.push({
      rowIndex: i,
      data: data as Partial<T>,
      errors,
    });
  }

  return out;
}

/**
 * Parser de planilha HTML (modelo FNDE "Situação Cadastral das Entidades",
 * salvo pelo FNDE como .xls mas com conteúdo HTML).
 *
 * Estratégia:
 *  - Lê arquivo como texto (UTF-8 com fallback pra WINDOWS-1252).
 *  - Usa DOMParser pra achar a 2ª `<table>` (a 1ª é o cabeçalho do FNDE com
 *    logo + filtros; a 2ª contém a lista de escolas com `<th>` headers).
 *  - Mapeia cada `<th>` → chave canônica via matchColumnKey.
 *  - Lê cada `<tr>` posterior, coleta texto das `<td>` por posição.
 */
async function parseHTMLTable<T>(
  file: File,
  columns: ColumnSpec<T>[],
): Promise<ParsedRow<T>[]> {
  // Tenta UTF-8 primeiro; se vier com caracteres quebrados (�), tenta WIN1252.
  let html = await file.text();
  if (/�/.test(html) || /Situaï¿½/.test(html)) {
    const buf = await file.arrayBuffer();
    try {
      html = new TextDecoder('windows-1252').decode(buf);
    } catch {
      // mantém o texto original
    }
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  if (tables.length === 0) return [];

  // Procura a 1ª tabela que tenha <th> (cabeçalho de colunas).
  let dataTable: HTMLTableElement | null = null;
  for (const t of Array.from(tables)) {
    if (t.querySelector('th')) {
      dataTable = t as HTMLTableElement;
      break;
    }
  }
  if (!dataTable) return [];

  const headerCells = Array.from(dataTable.querySelectorAll('tr:first-child > th'));
  if (headerCells.length === 0) return [];

  // Mapeia índice da coluna → key canônica
  const colKeys: Array<string | null> = headerCells.map((th) =>
    matchColumnKey((th.textContent || '').trim(), columns as ColumnSpec[]),
  );

  const out: ParsedRow<T>[] = [];
  const rows = Array.from(dataTable.querySelectorAll('tr')).slice(1); // pula header

  for (let i = 0; i < rows.length; i++) {
    const tr = rows[i];
    const cells = Array.from(tr.querySelectorAll('td'));
    if (cells.length === 0) continue;
    // Linha vazia (sem texto em nenhuma célula) → pula
    const joined = cells.map((c) => (c.textContent || '').trim()).join('');
    if (!joined) continue;

    const data: Record<string, unknown> = {};
    const errors: string[] = [];

    for (let c = 0; c < colKeys.length; c++) {
      const key = colKeys[c];
      if (!key) continue;
      const text = (cells[c]?.textContent || '').trim();
      const col = columns.find((cc) => cc.key === key);
      const coerced = coerce(text, col?.type);
      if (coerced === null && text !== '') {
        errors.push(
          `Coluna "${col?.header ?? key}": valor inválido (${text.slice(0, 20)})`,
        );
      }
      data[key] = coerced;
    }

    out.push({
      rowIndex: i + 2, // header na linha 1, dados a partir da linha 2
      data: data as Partial<T>,
      errors,
    });
  }

  return out;
}

// ── Browser download helper ────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Libera URL na próxima tick pra não vazar memória em imports sucessivos.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ── Headers compartilhados (escolas) ───────────────────────────────────

import type { Database } from '@/types/database';
type EscolaRow = Database['public']['Tables']['escolas']['Row'];

// `phone_ddd` é um alias temporário (não vira coluna) usado pra montar
// `phone` antes de gravar — vem do "DDD Telefone" do modelo FNDE.
type EscolaImportRow = EscolaRow & { phone_ddd?: string | null };

export const ESCOLA_IMPORT_COLUMNS: ColumnSpec<EscolaImportRow>[] = [
  { key: 'inep', header: 'INEP', type: 'string', width: 14 },
  { key: 'name', header: 'Nome', type: 'string', width: 48 },
  { key: 'active', header: 'Ativo', type: 'boolean', width: 8 },
  { key: 'phone_ddd', header: 'DDD Telefone', type: 'string', width: 8 },
  { key: 'phone', header: 'Telefone', type: 'string', width: 18 },
  { key: 'email', header: 'Email', type: 'string', width: 32 },
  { key: 'cnpj_eex', header: 'CNPJ EEX', type: 'string', width: 22 },
  { key: 'cnpj_uex', header: 'CNPJ UEX', type: 'string', width: 22 },
  { key: 'rede_atendimento', header: 'Rede de Atendimento', type: 'string', width: 20 },
  { key: 'localizacao', header: 'Localização', type: 'string', width: 14 },
  { key: 'mandato_dirigente', header: 'Mandato Dirigente', type: 'string', width: 18 },
  { key: 'data_fim_mandato', header: 'Data Fim do Mandato', type: 'date', width: 18 },
];

export const ESCOLA_EXPORT_COLUMNS: ColumnSpec<EscolaRow>[] = [
  { key: 'inep', header: 'INEP', width: 14 },
  { key: 'name', header: 'Nome', width: 48 },
  { key: 'active', header: 'Ativo', width: 8 },
  { key: 'phone', header: 'Telefone', width: 18 },
  { key: 'email', header: 'Email', width: 32 },
  { key: 'cnpj_eex', header: 'CNPJ EEX', width: 22 },
  { key: 'cnpj_uex', header: 'CNPJ UEX', width: 22 },
  { key: 'rede_atendimento', header: 'Rede', width: 14 },
  { key: 'localizacao', header: 'Localização', width: 14 },
  { key: 'mandato_dirigente', header: 'Mandato', width: 14 },
  { key: 'data_fim_mandato', header: 'Fim do Mandato', width: 16 },
  { key: 'last_movement_at', header: 'Última movimentação', width: 22 },
  { key: 'created_at', header: 'Criado em', width: 22 },
  { key: 'updated_at', header: 'Atualizado em', width: 22 },
];
