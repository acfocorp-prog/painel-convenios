import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RegistroTipo } from '@/lib/status';

/**
 * Entrada da trilha de auditoria de mudança de status.
 *
 * `registro_tipo` + `registro_id` formam a chave polimórfica que liga
 * esta entrada à tabela do módulo (convenios, simec_adhesions, bienios,
 * mandatos_tampao). O trigger `*_status_audit` grava automaticamente
 * quando o `status_id` de qualquer uma dessas tabelas muda.
 */
export type StatusHistoryEntry = {
  id: string;
  registro_tipo: RegistroTipo;
  registro_id: string;
  old_status_id: string | null;
  new_status_id: string;
  comment: string | null;
  changed_by: string | null;
  changed_at: string;
};

/**
 * Lista o histórico de mudanças de status de um registro (polimórfico).
 * Usado pelas páginas de detalhe dos 4 módulos.
 */
export function useStatusHistory(
  registroTipo: RegistroTipo,
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
