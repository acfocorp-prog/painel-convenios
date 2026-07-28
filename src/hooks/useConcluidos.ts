import { useQuery } from '@tanstack/react-query';
import { useConvenios, type ConvenioRow } from './useConvenios';
import { useSimec, type SimecRow } from './useSimec';
import { useBienios, type BienioRow } from './useBienios';
import { useMandatos, type MandatoRow } from './useMandatos';

/**
 * União cross-module de todos os registros com status terminal
 * (CONCLUIDO + CANCELADO), agrupados por módulo, ordenados por
 * `updated_at desc` dentro de cada módulo.
 *
 * Usado pela página /concluídos como fonte única — evita ter
 * uma query por seção.
 */

export type ConcluidoEntry =
  | {
      tipo: 'CONVENIO';
      id: string;
      updated_at: string;
      data: ConvenioRow;
    }
  | {
      tipo: 'SIMEC';
      id: string;
      updated_at: string;
      data: SimecRow;
    }
  | {
      tipo: 'BIENIO';
      id: string;
      updated_at: string;
      data: BienioRow;
    }
  | {
      tipo: 'MANDATO';
      id: string;
      updated_at: string;
      data: MandatoRow;
    };

export interface ConcluidosGrouped {
  convenios: Array<Extract<ConcluidoEntry, { tipo: 'CONVENIO' }>>;
  simec: Array<Extract<ConcluidoEntry, { tipo: 'SIMEC' }>>;
  bienios: Array<Extract<ConcluidoEntry, { tipo: 'BIENIO' }>>;
  mandatos: Array<Extract<ConcluidoEntry, { tipo: 'MANDATO' }>>;
  total: number;
  isLoading: boolean;
}

function sortByUpdatedDesc(a: ConcluidoEntry, b: ConcluidoEntry) {
  return b.updated_at.localeCompare(a.updated_at);
}

/**
 * Encapsula as 4 queries `mode='concluidos'` e devolve tudo agrupado.
 *
 * Como os 4 hooks já vêm cacheados e reagem a invalidações (`['convenios']`,
 * `['simec']`, `['bienios']`, `['mandatos']`, `['concluidos']`), esta
 * composição não dispara fetch extra — só observa o cache existente.
 */
export function useConcluidos(): ConcluidosGrouped {
  const c = useConvenios({ mode: 'concluidos' });
  const s = useSimec({ mode: 'concluidos' });
  const b = useBienios({ mode: 'concluidos' });
  const m = useMandatos({ mode: 'concluidos' });

  const isLoading = c.isLoading || s.isLoading || b.isLoading || m.isLoading;

  const convenios: ConcluidosGrouped['convenios'] = (c.data ?? [])
    .map((row) => ({
      tipo: 'CONVENIO' as const,
      id: row.id,
      updated_at: row.updated_at,
      data: row,
    }))
    .sort(sortByUpdatedDesc);

  const simec: ConcluidosGrouped['simec'] = (s.data ?? [])
    .map((row) => ({
      tipo: 'SIMEC' as const,
      id: row.id,
      updated_at: row.updated_at,
      data: row,
    }))
    .sort(sortByUpdatedDesc);

  const bienios: ConcluidosGrouped['bienios'] = (b.data ?? [])
    .map((row) => ({
      tipo: 'BIENIO' as const,
      id: row.id,
      updated_at: row.updated_at,
      data: row,
    }))
    .sort(sortByUpdatedDesc);

  const mandatos: ConcluidosGrouped['mandatos'] = (m.data ?? [])
    .map((row) => ({
      tipo: 'MANDATO' as const,
      id: row.id,
      updated_at: row.updated_at,
      data: row,
    }))
    .sort(sortByUpdatedDesc);

  return {
    convenios,
    simec,
    bienios,
    mandatos,
    total: convenios.length + simec.length + bienios.length + mandatos.length,
    isLoading,
  };
}

/**
 * Hook leve só pra KPI — retorna total sem agrupar.
 * Útil em cards da Visão Geral.
 */
export function useConcluidosCount() {
  const grouped = useConcluidos();
  return { count: grouped.total, isLoading: grouped.isLoading };
}

/**
 * Reexport do React Query puro pra casos que precisem de chave de cache explícita
 * (ex: realtime invalidation). Hoje as mutations já invalidam `['concluidos']`
 * via cache dos hooks individuais, mas este marcador existe pra uso futuro.
 */
export function useConcluidosQueryKey() {
  return useQuery({
    queryKey: ['concluidos'],
    enabled: false,
    queryFn: () => null,
  });
}