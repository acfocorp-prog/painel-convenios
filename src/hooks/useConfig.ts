import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

/**
 * Config KV simples: a tabela `config` tem 1 linha por chave com `value jsonb`.
 * Sem versionamento de schema — chave+valor e nada mais.
 */

const DEFAULT_LEMBRETE_DIAS = 7;

export function useConfigNumber(key: string, defaultValue: number) {
  return useQuery({
    queryKey: ['config', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      if (!data) return defaultValue;
      const v = (data.value as { value?: number } | number | null) ?? defaultValue;
      if (typeof v === 'number') return v;
      if (typeof v === 'object' && v && 'value' in v && typeof v.value === 'number') {
        return v.value;
      }
      return defaultValue;
    },
  });
}

export function useSetConfigNumber(key: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (value: number) => {
      const payload = { value };
      const { error } = await supabase
        .from('config')
        .upsert(
          {
            key,
            value: payload,
            updated_by: user?.id ?? null,
          },
          { onConflict: 'key' },
        );
      if (error) throw error;
      return value;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

export const CONFIG_KEYS = {
  LEMBRETE_DIAS: 'lembrete_dias_antecedencia',
} as const;

export { DEFAULT_LEMBRETE_DIAS };