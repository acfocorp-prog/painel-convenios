import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type VerbaTipo = {
  id: string;
  code: string;
  label: string;
  requires_bank_info: boolean;
  sort_order: number;
  active: boolean;
};

export type StatusCatalogItem = {
  id: string;
  code: 'EM_ANDAMENTO' | 'ATRASADO' | 'CONCLUIDO' | 'CANCELADO';
  label: string;
  color: string;
  is_terminal: boolean;
  sort_order: number;
};

export function useVerbaTipos() {
  return useQuery({
    queryKey: ['verba_tipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verba_tipos')
        .select('id, code, label, requires_bank_info, sort_order, active')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as VerbaTipo[];
    },
    staleTime: Infinity,
  });
}

export function useStatusCatalog() {
  return useQuery({
    queryKey: ['status_catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_catalog')
        .select('id, code, label, color, is_terminal, sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StatusCatalogItem[];
    },
    staleTime: Infinity,
  });
}

/** Helpers estáticos — resolvem IDs uma vez no carregamento. */
export function useInitialStatusId() {
  const { data } = useStatusCatalog();
  return data?.find((s) => s.code === 'EM_ANDAMENTO')?.id;
}
