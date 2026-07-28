import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from './useAuth';

type ConveniosInsert = Database['public']['Tables']['convenios']['Insert'];

export type ConvenioRow = {
  id: string;
  ref: string | null;
  year: number;
  verba_tipo_id: string;
  description: string | null;
  amount: number | null;
  due_date: string | null;
  launched: boolean;
  launched_at: string | null;
  status_id: string;
  priority: boolean;
  notes: string | null;
  escola_id: string | null;
  bank_branch: string | null;
  bank_account: string | null;
  process_link: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  // joins convenientes — opcionais
  verba_tipos?: { code: string; label: string; requires_bank_info: boolean };
  escolas?: { id: string; name: string; inep: string } | null;
  status_catalog?: {
    id: string;
    code: string;
    label: string;
    color: string;
    is_terminal: boolean;
  };
};

export interface ConvenioFilters {
  year?: number;
  verbaTipoId?: string;
  statusCode?: string;
  escolaId?: string;
  search?: string;
  /** 'atrasados': apenas itens atrasados (status EM_ANDAMENTO + due_date < hoje) */
  mode?: 'all' | 'atrasados' | 'concluidos';
}

const SELECT = `
  *,
  verba_tipos:verba_tipo_id ( code, label, requires_bank_info ),
  escolas:escola_id ( id, name, inep ),
  status_catalog:status_id ( id, code, label, color, is_terminal )
`;

export function useConvenios(filters: ConvenioFilters = {}) {
  return useQuery({
    queryKey: ['convenios', filters],
    queryFn: async () => {
      let q = supabase
        .from('convenios')
        .select(SELECT)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filters.year) q = q.eq('year', filters.year);
      if (filters.verbaTipoId) q = q.eq('verba_tipo_id', filters.verbaTipoId);
      if (filters.escolaId) q = q.eq('escola_id', filters.escolaId);
      if (filters.search && filters.search.trim()) {
        const t = filters.search.trim();
        q = q.or(`ref.ilike.%${t}%,description.ilike.%${t}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []) as unknown as ConvenioRow[];

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

export function useConvenio(id: string | undefined) {
  return useQuery({
    queryKey: ['convenio', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('convenios')
        .select(SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ConvenioRow | null;
    },
  });
}

export interface ConvenioInsert {
  ref?: string | null;
  year: number;
  verba_tipo_id: string;
  description?: string | null;
  amount?: number | null;
  due_date?: string | null;
  launched?: boolean;
  launched_at?: string | null;
  status_id: string;
  priority?: boolean;
  notes?: string | null;
  escola_id?: string | null;
  bank_branch?: string | null;
  bank_account?: string | null;
  process_link?: string | null;
}

export function useCreateConvenio() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: ConvenioInsert) => {
      const payload: ConveniosInsert = {
        ref: input.ref ?? null,
        year: input.year,
        verba_tipo_id: input.verba_tipo_id,
        description: input.description ?? null,
        amount: input.amount ?? null,
        due_date: input.due_date ?? null,
        launched: input.launched ?? false,
        launched_at: input.launched_at ?? null,
        status_id: input.status_id,
        priority: input.priority ?? false,
        notes: input.notes ?? null,
        escola_id: input.escola_id ?? null,
        bank_branch: input.bank_branch ?? null,
        bank_account: input.bank_account ?? null,
        process_link: input.process_link ?? null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
        deleted_at: null,
      };
      const { data, error } = await supabase
        .from('convenios')
        .insert(payload)
        .select(SELECT)
        .single();
      if (error) throw error;
      return data as unknown as ConvenioRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convenios'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export function useUpdateConvenio(id: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<ConvenioInsert>) => {
      const update = {
        ...input,
        updated_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('convenios')
        .update(update)
        .eq('id', id)
        .select(SELECT)
        .single();
      if (error) throw error;
      return data as unknown as ConvenioRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['convenios'] });
      qc.invalidateQueries({ queryKey: ['convenio', id] });
      if (data?.escola_id) {
        qc.invalidateQueries({ queryKey: ['escola', data.escola_id] });
      }
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export function useDeleteConvenio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('convenios')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convenios'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

/* Status history do registro */

export type StatusHistoryEntry = {
  id: string;
  registro_tipo: 'CONVENIO';
  registro_id: string;
  old_status_id: string | null;
  new_status_id: string;
  comment: string | null;
  changed_by: string | null;
  changed_at: string;
};

export function useStatusHistory(
  registroTipo: 'CONVENIO',
  registroId: string | undefined,
) {
  return useQuery({
    queryKey: ['status_history', registroTipo, registroId],
    enabled: !!registroId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_history')
        .select('*')
        .eq('registro_tipo', registroTipo)
        .eq('registro_id', registroId!)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as StatusHistoryEntry[];
    },
  });
}
