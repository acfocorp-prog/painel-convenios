import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from './useAuth';

type MandatosInsert = Database['public']['Tables']['mandatos_tampao']['Insert'];

export type MandatoRow = {
  id: string;
  escola_id: string | null;
  start_date: string;
  end_date: string;
  due_date: string | null;
  status_id: string;
  priority: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  // joins — opcionais (null quando escola_id é null OU escola removida)
  escolas?: { id: string; name: string; inep: string } | null;
  status_catalog?: {
    id: string;
    code: string;
    label: string;
    color: string;
    is_terminal: boolean;
  };
};

export interface MandatoFilters {
  escolaId?: string;
  statusCode?: string;
  /** Quando true, retorna apenas mandatos SEM escola (da secretaria). */
  onlySecretaria?: boolean;
  search?: string;
  mode?: 'all' | 'atrasados' | 'concluidos';
}

const SELECT = `
  *,
  escolas:escola_id ( id, name, inep ),
  status_catalog:status_id ( id, code, label, color, is_terminal )
`;

export function useMandatos(filters: MandatoFilters = {}) {
  return useQuery({
    queryKey: ['mandatos', filters],
    queryFn: async () => {
      let q = supabase
        .from('mandatos_tampao')
        .select(SELECT)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filters.escolaId) q = q.eq('escola_id', filters.escolaId);
      if (filters.onlySecretaria) q = q.is('escola_id', null);
      if (filters.search && filters.search.trim()) {
        const t = filters.search.trim();
        q = q.or(`notes.ilike.%${t}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []) as unknown as MandatoRow[];

      if (filters.statusCode) {
        rows = rows.filter((r) => r.status_catalog?.code === filters.statusCode);
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

export function useMandatoById(id: string | undefined) {
  return useQuery({
    queryKey: ['mandato', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mandatos_tampao')
        .select(SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MandatoRow | null;
    },
  });
}

export interface MandatoInsertInput {
  /**
   * `null` = mandato da secretaria (não vinculado a uma escola).
   * String UUID = vinculado à escola correspondente.
   */
  escola_id: string | null;
  start_date: string;
  end_date: string;
  due_date?: string | null;
  status_id: string;
  priority?: boolean;
  notes?: string | null;
}

export function useCreateMandato() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: MandatoInsertInput) => {
      const payload: MandatosInsert = {
        escola_id: input.escola_id,
        start_date: input.start_date,
        end_date: input.end_date,
        due_date: input.due_date ?? null,
        status_id: input.status_id,
        priority: input.priority ?? false,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
        deleted_at: null,
      };
      const { data, error } = await supabase
        .from('mandatos_tampao')
        .insert(payload)
        .select(SELECT)
        .single();
      if (error) throw error;
      return data as unknown as MandatoRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['mandatos'] });
      if (data.escola_id) {
        qc.invalidateQueries({ queryKey: ['escola', data.escola_id] });
      }
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['concluidos'] });
    },
  });
}

export function useUpdateMandato(id: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<MandatoInsertInput>) => {
      const update = {
        ...input,
        updated_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('mandatos_tampao')
        .update(update)
        .eq('id', id)
        .select(SELECT)
        .single();
      if (error) throw error;
      return data as unknown as MandatoRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['mandatos'] });
      qc.invalidateQueries({ queryKey: ['mandato', id] });
      if (data.escola_id) {
        qc.invalidateQueries({ queryKey: ['escola', data.escola_id] });
      }
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['concluidos'] });
    },
  });
}

export function useDeleteMandato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mandatos_tampao')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mandatos'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['concluidos'] });
    },
  });
}
