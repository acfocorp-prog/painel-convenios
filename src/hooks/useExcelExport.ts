import { useCallback } from 'react';
import { exportToExcel, type ColumnSpec } from '@/lib/excel';
import { formatDate, formatBRL } from '@/lib/utils';

/**
 * Hook com geradores de planilha pré-configurados por módulo.
 * Cada função gera 1 sheet; `exportAll` gera 5 sheets (1 por módulo +
 * concluídos).
 *
 * Bind no botão "Exportar XLSX" da list page:
 *   <ExportButton onExport={useConveniosExport(data)} label="Exportar" />
 */

export interface ExportButtonProps<T> {
  rows: T[];
  columns: ColumnSpec<T>[];
  filename: string;
  sheetName?: string;
}

export function buildExcelFilename(prefix: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `${prefix}-${today}.xlsx`;
}

// ── Convênios ──────────────────────────────────────────────────────────
import type { ConvenioRow } from './useConvenios';
export const CONVENIO_EXPORT_COLUMNS: ColumnSpec<ConvenioRow>[] = [
  { key: 'ref', header: 'Referência', width: 18 },
  { key: 'year', header: 'Ano', type: 'number', width: 6 },
  { key: 'verba_tipo_id', header: 'Verba', width: 16 },
  { key: 'description', header: 'Descrição', width: 40 },
  { key: 'amount', header: 'Valor', type: 'number', width: 14 },
  { key: 'due_date', header: 'Prazo', width: 12 },
  { key: 'launched', header: 'Lançado', width: 10 },
  { key: 'launched_at', header: 'Lançado em', width: 12 },
  { key: 'status_id', header: 'Status', width: 14 },
  { key: 'priority', header: 'Prioridade', width: 10 },
  { key: 'escola_id', header: 'Escola (INEP)', width: 18 },
  { key: 'bank_branch', header: 'Agência', width: 10 },
  { key: 'bank_account', header: 'Conta', width: 14 },
  { key: 'process_link', header: 'Link do processo', width: 30 },
  { key: 'notes', header: 'Anotações', width: 30 },
  { key: 'updated_at', header: 'Atualizado em', width: 22 },
];

// exceljs não formata booleans/numbers automaticamente pra PT-BR, mas vamos
// renderizar valor e data manualmente via transform fn.
function serializeConvenioRow(r: ConvenioRow): Record<string, unknown> {
  return {
    ...r,
    amount: r.amount != null ? formatBRL(r.amount) : '',
    escola_id: r.escolas?.inep ?? '',
    verba_tipo_id: r.verba_tipos?.label ?? '',
    status_id: r.status_catalog?.label ?? '',
    due_date: formatDate(r.due_date),
    launched_at: formatDate(r.launched_at),
    updated_at: formatDate(r.updated_at),
  };
}

export function useConvenioExport(rows: ConvenioRow[]) {
  return useCallback(() => {
    void exportToExcel<Record<string, unknown>>(buildExcelFilename('convenios'), [
      {
        name: 'Convênios',
        columns: CONVENIO_EXPORT_COLUMNS as ColumnSpec<Record<string, unknown>>[],
        rows: rows.map(serializeConvenioRow),
      },
    ]);
  }, [rows]);
}

// ── SIMEC ──────────────────────────────────────────────────────────────
import type { SimecRow } from './useSimec';
export const SIMEC_EXPORT_COLUMNS: ColumnSpec<SimecRow>[] = [
  { key: 'program', header: 'Programa', width: 32 },
  { key: 'year', header: 'Ano', type: 'number', width: 6 },
  { key: 'due_date', header: 'Prazo', width: 12 },
  { key: 'status_id', header: 'Status', width: 14 },
  { key: 'priority', header: 'Prioridade', width: 10 },
  { key: 'escola_id', header: 'Escola (INEP)', width: 18 },
  { key: 'notes', header: 'Anotações', width: 30 },
  { key: 'updated_at', header: 'Atualizado em', width: 22 },
];

function serializeSimecRow(r: SimecRow): Record<string, unknown> {
  return {
    ...r,
    escola_id: r.escolas?.inep ?? '',
    status_id: r.status_catalog?.label ?? '',
    due_date: formatDate(r.due_date),
    updated_at: formatDate(r.updated_at),
  };
}

export function useSimecExport(rows: SimecRow[]) {
  return useCallback(() => {
    void exportToExcel<Record<string, unknown>>(buildExcelFilename('simec'), [
      {
        name: 'SIMEC',
        columns: SIMEC_EXPORT_COLUMNS as ColumnSpec<Record<string, unknown>>[],
        rows: rows.map(serializeSimecRow),
      },
    ]);
  }, [rows]);
}

// ── Biênios ────────────────────────────────────────────────────────────
import type { BienioRow } from './useBienios';
export const BIENIO_EXPORT_COLUMNS: ColumnSpec<BienioRow>[] = [
  { key: 'start_year', header: 'Início', type: 'number', width: 8 },
  { key: 'end_year', header: 'Fim', type: 'number', width: 8 },
  { key: 'due_date', header: 'Prazo', width: 12 },
  { key: 'ata_signed_at', header: 'Ata assinada em', width: 14 },
  { key: 'notary_validated', header: 'Validado cartório', width: 14 },
  { key: 'notary_validation_date', header: 'Validado em', width: 14 },
  { key: 'status_id', header: 'Status', width: 14 },
  { key: 'priority', header: 'Prioridade', width: 10 },
  { key: 'escola_id', header: 'Escola (INEP)', width: 18 },
  { key: 'notes', header: 'Anotações', width: 30 },
  { key: 'updated_at', header: 'Atualizado em', width: 22 },
];

function serializeBienioRow(r: BienioRow): Record<string, unknown> {
  return {
    ...r,
    escola_id: r.escolas?.inep ?? '',
    status_id: r.status_catalog?.label ?? '',
    due_date: formatDate(r.due_date),
    ata_signed_at: formatDate(r.ata_signed_at),
    notary_validation_date: formatDate(r.notary_validation_date),
    updated_at: formatDate(r.updated_at),
  };
}

export function useBienioExport(rows: BienioRow[]) {
  return useCallback(() => {
    void exportToExcel<Record<string, unknown>>(buildExcelFilename('bienios'), [
      {
        name: 'Biênios',
        columns: BIENIO_EXPORT_COLUMNS as ColumnSpec<Record<string, unknown>>[],
        rows: rows.map(serializeBienioRow),
      },
    ]);
  }, [rows]);
}

// ── Mandatos ───────────────────────────────────────────────────────────
import type { MandatoRow } from './useMandatos';
export const MANDATO_EXPORT_COLUMNS: ColumnSpec<MandatoRow>[] = [
  { key: 'escola_id', header: 'Escola (INEP)', width: 18 },
  { key: 'start_date', header: 'Início', width: 12 },
  { key: 'end_date', header: 'Fim', width: 12 },
  { key: 'due_date', header: 'Prazo', width: 12 },
  { key: 'status_id', header: 'Status', width: 14 },
  { key: 'priority', header: 'Prioridade', width: 10 },
  { key: 'notes', header: 'Anotações', width: 30 },
  { key: 'updated_at', header: 'Atualizado em', width: 22 },
];

function serializeMandatoRow(r: MandatoRow): Record<string, unknown> {
  return {
    ...r,
    escola_id: r.escola_id
      ? r.escolas?.inep ?? '(escola removida)'
      : '(Secretaria)',
    status_id: r.status_catalog?.label ?? '',
    start_date: formatDate(r.start_date),
    end_date: formatDate(r.end_date),
    due_date: formatDate(r.due_date),
    updated_at: formatDate(r.updated_at),
  };
}

export function useMandatoExport(rows: MandatoRow[]) {
  return useCallback(() => {
    void exportToExcel<Record<string, unknown>>(buildExcelFilename('mandatos'), [
      {
        name: 'Mandatos',
        columns: MANDATO_EXPORT_COLUMNS as ColumnSpec<Record<string, unknown>>[],
        rows: rows.map(serializeMandatoRow),
      },
    ]);
  }, [rows]);
}

// ── Escolas ────────────────────────────────────────────────────────────
import type { Escola } from './useEscolas';
import { formatCNPJ, formatPhone } from '@/lib/utils';

export const ESCOLA_EXPORT_HOOK_COLUMNS: ColumnSpec<Escola>[] = [
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

function serializeEscolaRow(r: Escola): Record<string, unknown> {
  return {
    ...r,
    phone: formatPhone(r.phone),
    cnpj_eex: formatCNPJ(r.cnpj_eex),
    cnpj_uex: formatCNPJ(r.cnpj_uex),
    data_fim_mandato: formatDate(r.data_fim_mandato),
    last_movement_at: formatDate(r.last_movement_at),
    created_at: formatDate(r.created_at),
    updated_at: formatDate(r.updated_at),
  };
}

export function useEscolaExport(rows: Escola[]) {
  return useCallback(() => {
    void exportToExcel<Record<string, unknown>>(buildExcelFilename('escolas'), [
      {
        name: 'Escolas',
        columns: ESCOLA_EXPORT_HOOK_COLUMNS as ColumnSpec<Record<string, unknown>>[],
        rows: rows.map(serializeEscolaRow),
      },
    ]);
  }, [rows]);
}