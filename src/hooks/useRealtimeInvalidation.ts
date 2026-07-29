import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook único de Realtime: monta 1 channel postgres_changes escutando as 5
 * tabelas de negócio + status_history. Cada evento invalida broad query
 * keys (`['convenios']`, `['simec']`, etc.), e o react-query refetch.
 *
 * - Stale time padrão do query-client (30s) deduplica refetches paralelos.
 * - Canal é desmontado quando o hook unmounts ou o usuário desloga.
 * - Sem subscription = zero overhead (Realtime só conecta se hook está montado).
 *
 * Tabelas monitoradas:
 *  - escolas              → invalidate ['escolas'], ['overview']
 *  - convenios            → invalidate ['convenios'], ['overview'], ['concluidos']
 *  - simec_adhesions      → invalidate ['simec'], ['overview'], ['concluidos']
 *  - bienios              → invalidate ['bienios'], ['overview'], ['concluidos']
 *  - mandatos_tampao      → invalidate ['mandatos'], ['overview'], ['concluidos']
 *  - status_history       → invalidate ['status_history']
 */

const TABLE_INVALIDATIONS: Record<string, string[][]> = {
  escolas: [['escolas'], ['overview'], ['concluidos']],
  convenios: [['convenios'], ['overview'], ['concluidos']],
  simec_adhesions: [['simec'], ['overview'], ['concluidos']],
  bienios: [['bienios'], ['overview'], ['concluidos']],
  mandatos_tampao: [['mandatos'], ['overview'], ['concluidos']],
  status_history: [['status_history']],
  official_deadlines: [['official_deadlines'], ['official_deadlines_unread']],
  official_deadline_reads: [
    ['official_deadlines'],
    ['official_deadlines_unread'],
  ],
};

const REALTIME_EVENT = 'postgres_changes' as const;

export function useRealtimeInvalidation() {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Se já existe canal, não recria (idempotente em StrictMode duplo-mount).
    if (channelRef.current) return;

    const channel = supabase.channel('painel-invalidation');

    for (const [table, keys] of Object.entries(TABLE_INVALIDATIONS)) {
      channel.on(
        REALTIME_EVENT,
        { event: '*', schema: 'public', table },
        () => {
          for (const key of keys) {
            qc.invalidateQueries({ queryKey: [key] });
          }
        },
      );
    }

    channel.subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [qc]);
}