import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { importFromExcel, ESCOLA_IMPORT_COLUMNS } from '@/lib/excel';
import { useAuth } from './useAuth';
import type { Database } from '@/types/database';

/**
 * Importa planilha de escolas a partir de um File .xlsx/.xls(HTML).
 *
 * Aceita tanto:
 *  - xlsx "padrão" (Excel/Sheets) com colunas INEP/Nome/Ativo
 *  - HTML do modelo FNDE "Situação Cadastral das Entidades" (salvo como
 *    .xls pelo FNDE) com 18 colunas incluindo DDD/Telefone, Email, CNPJ
 *    EEX/UEX, Rede, Localização, Mandato Dirigente e Data Fim do Mandato.
 *
 * Estratégia:
 *  1. Lê planilha (parser dual em lib/excel.ts).
 *  2. Filtra linhas com erro de coerce OU campos obrigatórios faltando.
 *  3. Monta `phone` a partir de `phone_ddd` + `phone` quando vierem separados.
 *  4. Faz 1 bulk-insert com todas as linhas válidas.
 *  5. Quando o Supabase retornar unique_violation (INEP duplicado),
 *     identifica quais INEPs colidiram e faz fallback com insert 1-a-1
 *     pra reportar precisamente cada linha pulada.
 *  6. Retorna { inserted, skipped, total, parseErrors }.
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

/**
 * Monta o telefone final: se vier `phone_ddd` + `phone` separados, concatena
 * só dígitos. Se só vier um dos dois, usa o que tem.
 */
function buildPhone(ddd: unknown, phone: unknown): string | null {
  const dddStr = ddd != null ? String(ddd).replace(/\D/g, '') : '';
  const phoneStr = phone != null ? String(phone).replace(/\D/g, '') : '';
  if (!dddStr && !phoneStr) return null;
  return `${dddStr}${phoneStr}` || null;
}

/** Limpa string: trim + remove aspas/colchete inicial comum em CSVs do FNDE. */
function clean(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).replace(/^'/, '').trim() || null;
}

export function useImportEscolas() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File): Promise<ImportResult> => {
      const rows = await importFromExcel(file, ESCOLA_IMPORT_COLUMNS);

      const parseErrors: ImportResult['parseErrors'] = [];
      const validRows: Array<{
        rowIndex: number;
        inep: string;
        name: string;
        active: boolean;
        payload: Record<string, unknown>;
      }> = [];

      for (const r of rows) {
        if (r.errors.length > 0) {
          parseErrors.push({ rowIndex: r.rowIndex, reason: r.errors.join('; ') });
          continue;
        }
        const inep = clean(r.data.inep) ?? '';
        const name = clean(r.data.name) ?? '';
        const active = (r.data.active as boolean | null) ?? true;

        if (!inep || !name) {
          parseErrors.push({
            rowIndex: r.rowIndex,
            reason: !inep ? 'INEP vazio' : 'Nome vazio',
          });
          continue;
        }

        const phone = buildPhone(r.data.phone_ddd, r.data.phone);

        const payload: Record<string, unknown> = {
          inep,
          name,
          active,
          phone,
          email: clean(r.data.email),
          cnpj_eex: clean(r.data.cnpj_eex),
          cnpj_uex: clean(r.data.cnpj_uex),
          rede_atendimento: clean(r.data.rede_atendimento),
          localizacao: clean(r.data.localizacao),
          mandato_dirigente: clean(r.data.mandato_dirigente),
          data_fim_mandato: (r.data.data_fim_mandato as string | null) ?? null,
        };

        validRows.push({ rowIndex: r.rowIndex, inep, name, active, payload });
      }

      if (validRows.length === 0) {
        return {
          inserted: 0,
          skipped: [],
          total: rows.length,
          parseErrors,
        };
      }

      const inserts: Database['public']['Tables']['escolas']['Insert'][] = validRows.map((r) => ({
        ...(r.payload as Database['public']['Tables']['escolas']['Insert']),
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
        deleted_at: null,
      }));

      const skipped: ImportResult['skipped'] = [];

      // Bulk insert — tenta tudo de uma vez
      const { error: bulkError, data: bulkData } = await supabase
        .from('escolas')
        .insert(inserts)
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
            ...(r.payload as Database['public']['Tables']['escolas']['Insert']),
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
