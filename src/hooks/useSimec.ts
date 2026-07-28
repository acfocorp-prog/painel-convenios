import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from './useAuth';

type SimecInsert = Database['public']['Tables']['simec_adhesions']['Insert'];

export type SimecRow = {
  id: string;
  escola_id: string;
  program: string;
  year: number;
  due_date: string | null;
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

export interface SimecFilters {
  year?: number;
  escolaId?: string;
  statusCode?: string;
  search?: string;
  /** 'atrasados': apenas itens atrasados (status EM_ANDAMENTO + due_date < hoje) */
  mode?: 'all' | 'atrasados' | 'concluidos';
}

const SELECT = `
  *,
  escolas:escola_id ( id, name, inep ),
  status_catalog:status_id ( id, code, label, color, is_terminal )
`;

export function useSimec(filters: SimecFilters = {}) {
  return useQuery({
    queryKey: ['simec', filters],
    queryFn: async () => {
      let q = supabase
        .from('simec_adhesions')
        .select(SELECT)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filters.year) q = q.eq('year', filters.year);
      if (filters.escolaId) q = q.eq('escola_id', filters.escolaId);
      if (filters.search && filters.search.trim()) {
        const t = filters.search.trim();
        q = q.or(`program.ilike.%${t}%,notes.ilike.%${t}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []) as unknown as SimecRow[];

      // Filtros por código de status (precisam resolver pelo join) e modo.
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

export function useSimecById(id: string | undefined) {
  return useQuery({
    queryKey: ['simec', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simec_adhesions')
        .select(SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SimecRow | null;
    },
  });
}

export interface SimecInsertInput {
  escola_id: string;
  program: string;
  year: number;
  due_date?: string | null;
  status_id: string;
  priority?: boolean;
  notes?: string | null;
}

export function useCreateSimec() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: SimecInsertInput) => {
      const payload: SimecInsert = {
        escola_id: input.escola_id,
        program: input.program,
        year: input.year,
        due_date: input.due_date ?? null,
        status_id: input.status_id,
        priority: input.priority ?? false,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
        deleted_at: null,
      };
      const { data, error } = await supabase
        .from('simec_adhesions')
        .insert(payload)
        .select(SELECT)
        .single();
      if (error) throw error;
      return data as unknown as SimecRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['simec'] });
      qc.invalidateQueries({ queryKey: ['escola', data.escola_id] });
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['concluidos'] });
    },
  });
}

export function useUpdateSimec(id: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<SimecInsertInput>) => {
      const update = {
        ...input,
        updated_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('simec_adhesions')
        .update(update)
        .eq('id', id)
        .select(SELECT)
        .single();
      if (error) throw error;
      return data as unknown as SimecRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['simec'] });
      qc.invalidateQueries({ queryKey: ['simec', id] });
      if (data?.escola_id) {
        qc.invalidateQueries({ queryKey: ['escola', data.escola_id] });
      }
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['concluidos'] });
    },
  });
}

export function useDeleteSimec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('simec_adhesions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simec'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['concluidos'] });
    },
  });
}
