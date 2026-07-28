import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from './useAuth';
import { useStatusCatalog } from './useLookups';

type BieniosInsert = Database['public']['Tables']['bienios']['Insert'];

export type BienioRow = {
  id: string;
  escola_id: string;
  start_year: number;
  end_year: number;
  due_date: string | null;
  ata_signed_at: string | null;
  notary_validated: boolean;
  notary_validation_date: string | null;
  status_id: string;
  priority: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  // joins — opcionais
  escolas?: { id: string; name: string; inep: string } | null;
  status_catalog?: {
    id: string;
    code: string;
    label: string;
    color: string;
    is_terminal: boolean;
  };
};

export interface BienioFilters {
  escolaId?: string;
  statusCode?: string;
  /** Filtra por bienios ainda NÃO validados no cartório */
  pendingNotary?: boolean;
  search?: string;
  mode?: 'all' | 'atrasados' | 'concluidos';
}

const SELECT = `
  *,
  escolas:escola_id ( id, name, inep ),
  status_catalog:status_id ( id, code, label, color, is_terminal )
`;

export function useBienios(filters: BienioFilters = {}) {
  return useQuery({
    queryKey: ['bienios', filters],
    queryFn: async () => {
      let q = supabase
        .from('bienios')
        .select(SELECT)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filters.escolaId) q = q.eq('escola_id', filters.escolaId);
      if (filters.search && filters.search.trim()) {
        const t = filters.search.trim();
        q = q.or(`notes.ilike.%${t}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []) as unknown as BienioRow[];

      if (filters.statusCode) {
        rows = rows.filter((r) => r.status_catalog?.code === filters.statusCode);
      }
      if (filters.pendingNotary) {
        rows = rows.filter((r) => !r.notary_validated);
      }
      if (filters.mode === 'atrasados') {
        const today = new Date().toISOString().slice(0, 10);
        rows = rows.filter(
          (r) =>
            r.status_catalog?.code === 'EM_ANDAMENTO' &&
            r.due_date !== null &&
            r.due_date < today,
        );
      }
      if (filters.mode === 'concluidos') {
        rows = rows.filter((r) =>
          ['CONCLUIDO', 'CANCELADO'].includes(r.status_catalog?.code ?? ''),
        );
      }

      return rows;
    },
  });
}

export function useBienioById(id: string | undefined) {
  return useQuery({
    queryKey: ['bienio', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bienios')
        .select(SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BienioRow | null;
    },
  });
}

export interface BienioInsertInput {
  escola_id: string;
  start_year: number;
  end_year: number;
  due_date?: string | null;
  ata_signed_at?: string | null;
  notary_validated?: boolean;
  notary_validation_date?: string | null;
  status_id: string;
  priority?: boolean;
  notes?: string | null;
}

export function useCreateBienio() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: BienioInsertInput) => {
      const payload: BieniosInsert = {
        escola_id: input.escola_id,
        start_year: input.start_year,
        end_year: input.end_year,
        due_date: input.due_date ?? null,
        ata_signed_at: input.ata_signed_at ?? null,
        notary_validated: input.notary_validated ?? false,
        notary_validation_date: input.notary_validation_date ?? null,
        status_id: input.status_id,
        priority: input.priority ?? false,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
        deleted_at: null,
      };
      const { data, error } = await supabase
        .from('bienios')
        .insert(payload)
        .select(SELECT)
        .single();
      if (error) throw error;
      return data as unknown as BienioRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bienios'] });
      qc.invalidateQueries({ queryKey: ['escola', data.escola_id] });
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['concluidos'] });
    },
  });
}

export function useUpdateBienio(id: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<BienioInsertInput>) => {
      const update = {
        ...input,
        updated_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('bienios')
        .update(update)
        .eq('id', id)
        .select(SELECT)
        .single();
      if (error) throw error;
      return data as unknown as BienioRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bienios'] });
      qc.invalidateQueries({ queryKey: ['bienio', id] });
      if (data?.escola_id) {
        qc.invalidateQueries({ queryKey: ['escola', data.escola_id] });
      }
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['concluidos'] });
    },
  });
}

export function useDeleteBienio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bienios')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bienios'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['concluidos'] });
    },
  });
}

/**
 * Mutation dedicada: marca `notary_validated=true`, `notary_validation_date=now()`
 * E muda status pra CONCLUIDO na mesma operação.
 * O trigger `*_status_audit` grava automaticamente em `status_history`.
 */
export function useValidateBienio(id: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: statusCatalog } = useStatusCatalog();

  return useMutation({
    mutationFn: async () => {
      if (!statusCatalog) throw new Error('Catálogo de status indisponível');
      const concluido = statusCatalog.find((s) => s.code === 'CONCLUIDO');
      if (!concluido) throw new Error('Status CONCLUIDO não encontrado no catálogo');
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('bienios')
        .update({
          notary_validated: true,
          notary_validation_date: today,
          status_id: concluido.id,
          updated_by: user?.id ?? null,
        })
        .eq('id', id)
        .select(SELECT)
        .single();
      if (error) throw error;
      return data as unknown as BienioRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bienios'] });
      qc.invalidateQueries({ queryKey: ['bienio', id] });
      if (data?.escola_id) {
        qc.invalidateQueries({ queryKey: ['escola', data.escola_id] });
      }
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['concluidos'] });
    },
  });
}
