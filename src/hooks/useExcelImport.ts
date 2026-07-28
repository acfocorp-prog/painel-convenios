import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { importFromExcel, ESCOLA_IMPORT_COLUMNS } from '@/lib/excel';
import { useAuth } from './useAuth';

/**
 * Importa planilha de escolas a partir de um File .xlsx.
 *
 * Estratégia:
 *  1. Lê planilha (exceljs, header-tolerant).
 *  2. Filtra linhas com erro de coerce OU campos obrigatórios faltando.
 *  3. Faz 1 bulk-insert com todas as linhas válidas.
 *  4. Quando o Supabase retornar unique_violation (INEP duplicado),
 *     identifica quais INEPs colidiram e faz fallback com insert 1-a-1
 *     pra reportar precisamente cada linha pulada.
 *  5. Retorna { inserted: number, skipped: { rowIndex, reason }[] }.
 *
 * Não sobrescreve INEP existente — política é skip + report.
 */

export interface ImportResult {
  inserted: number;
  skipped: Array<{
    rowIndex: number;
    inep: string;
    name: string;
    reason: string;
  }>;
  total: number;
  parseErrors: Array<{
    rowIndex: number;
    reason: string;
  }>;
}

export function useImportEscolas() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File): Promise<ImportResult> => {
      const rows = await importFromExcel(file, ESCOLA_IMPORT_COLUMNS);

      const parseErrors: ImportResult['parseErrors'] = [];
      const validRows: Array<{ rowIndex: number; inep: string; name: string; active: boolean }> = [];

      for (const r of rows) {
        if (r.errors.length > 0) {
          parseErrors.push({ rowIndex: r.rowIndex, reason: r.errors.join('; ') });
          continue;
        }
        const inep = String(r.data.inep ?? '').trim();
        const name = String(r.data.name ?? '').trim();
        const active = (r.data.active as boolean | null) ?? true;

        if (!inep || !name) {
          parseErrors.push({
            rowIndex: r.rowIndex,
            reason: !inep ? 'INEP vazio' : 'Nome vazio',
          });
          continue;
        }

        validRows.push({ rowIndex: r.rowIndex, inep, name, active });
      }

      if (validRows.length === 0) {
        return {
          inserted: 0,
          skipped: [],
          total: rows.length,
          parseErrors,
        };
      }

      const payload = validRows.map((r) => ({
        inep: r.inep,
        name: r.name,
        active: r.active,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
        deleted_at: null,
      }));

      const skipped: ImportResult['skipped'] = [];

      // Bulk insert — tenta tudo de uma vez
      const { error: bulkError, data: bulkData } = await supabase
        .from('escolas')
        .insert(payload)
        .select('id, inep');

      if (!bulkError && bulkData) {
        // Bulk OK — quantos foram inseridos? O `select` retorna TODAS as linhas
        // inseridas, então sabemos quantas foram aceitas.
        const insertedCount = bulkData.length;
        const acceptedIineps = new Set(bulkData.map((r) => r.inep));
        const rejected = validRows.filter((r) => !acceptedIineps.has(r.inep));
        skipped.push(
          ...rejected.map((r) => ({
            rowIndex: r.rowIndex,
            inep: r.inep,
            name: r.name,
            reason: 'INEP já cadastrado (colisão)',
          })),
        );
        return {
          inserted: insertedCount,
          skipped,
          total: rows.length,
          parseErrors,
        };
      }

      // Bulk falhou — provavelmente unique violation. Tenta 1-a-1.
      // Códigos PostgREST para unique_violation = '23505'
      const isUniqueViolation =
        bulkError?.code === '23505' ||
        /duplicate key|unique constraint/i.test(bulkError?.message ?? '');

      if (!isUniqueViolation) {
        // Outro erro (permissão, conexão, schema): propaga.
        throw new Error(
          bulkError?.message ?? 'Falha ao importar escolas (erro desconhecido)',
        );
      }

      let inserted = 0;
      for (const r of validRows) {
        const { error } = await supabase
          .from('escolas')
          .insert({
            inep: r.inep,
            name: r.name,
            active: r.active,
            created_by: user?.id ?? null,
            updated_by: user?.id ?? null,
            deleted_at: null,
          })
          .select('id')
          .maybeSingle();

        if (error) {
          const dup = error.code === '23505';
          skipped.push({
            rowIndex: r.rowIndex,
            inep: r.inep,
            name: r.name,
            reason: dup ? 'INEP já cadastrado' : error.message,
          });
        } else {
          inserted++;
        }
      }

      return {
        inserted,
        skipped,
        total: rows.length,
        parseErrors,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escolas'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}