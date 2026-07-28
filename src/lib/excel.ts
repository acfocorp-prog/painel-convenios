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
 * Import lê a 1ª sheet, mapeia linhas pelo header (case-insensitive, ignora
 * acentos) e devolve `{ rowIndex, data, errors }` por linha pra validação
 * separada. O componente decide se mostra erro ou segue.
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
 * Lê o 1º sheet de um File .xlsx/.xls e mapeia linhas pelo header.
 * Tolerante a colunas extras (ignoradas) e a colunas faltantes (viram undefined).
 *
 * @returns array de ParsedRow com data parcial + errors por linha
 */
export async function importFromExcel<T>(
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
    const normalized = normalizeHeader(String(cell.value ?? ''));
    const match = columns.find((c) => normalizeHeader(c.header) === normalized);
    if (match) colIndex[match.key] = colNumber;
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

export const ESCOLA_IMPORT_COLUMNS: ColumnSpec<EscolaRow>[] = [
  { key: 'inep', header: 'INEP', type: 'string', width: 14 },
  { key: 'name', header: 'Nome', type: 'string', width: 48 },
  { key: 'active', header: 'Ativo', type: 'boolean', width: 8 },
];

export const ESCOLA_EXPORT_COLUMNS: ColumnSpec<EscolaRow>[] = [
  { key: 'inep', header: 'INEP', width: 14 },
  { key: 'name', header: 'Nome', width: 48 },
  { key: 'active', header: 'Ativo', width: 8 },
  { key: 'last_movement_at', header: 'Última movimentação', width: 22 },
  { key: 'created_at', header: 'Criado em', width: 22 },
  { key: 'updated_at', header: 'Atualizado em', width: 22 },
];