import { useConvenios, type ConvenioRow } from './useConvenios';
import { useSimec, type SimecRow } from './useSimec';
import { useBienios, type BienioRow } from './useBienios';
import { useMandatos, type MandatoRow } from './useMandatos';

/**
 * Ranking de escolas com mais registros em atraso (status EM_ANDAMENTO
 * + due_date < hoje). Cada entrada conta 1 ocorrência por módulo.
 */

export interface RankingEntry {
  escolaId: string;
  escolaNome: string;
  escolaInep: string;
  totalAtrasos: number;
  breakdown: {
    convenios: number;
    simec: number;
    bienios: number;
    mandatos: number;
  };
}

const ZERO = { convenios: 0, simec: 0, bienios: 0, mandatos: 0 };

export function useRanking(): {
  entries: RankingEntry[];
  total: number;
  isLoading: boolean;
} {
  const c = useConvenios();
  const s = useSimec();
  const b = useBienios();
  const m = useMandatos();

  const isLoading = c.isLoading || s.isLoading || b.isLoading || m.isLoading;

  const today = new Date().toISOString().slice(0, 10);

  function isLate(
    statusCode: string | undefined,
    dueDate: string | null,
  ): boolean {
    return (
      statusCode === 'EM_ANDAMENTO' && !!dueDate && dueDate < today
    );
  }

  const acc = new Map<string, RankingEntry>();

  function bump(
    escolaId: string | null,
    escolaNome: string | null,
    escolaInep: string | null,
    bucket: keyof RankingEntry['breakdown'],
  ) {
    if (!escolaId) return; // mandato da secretaria não conta
    const key = escolaId;
    const existing = acc.get(key);
    if (existing) {
      existing.totalAtrasos++;
      existing.breakdown[bucket]++;
    } else {
      acc.set(key, {
        escolaId,
        escolaNome: escolaNome ?? '(escola removida)',
        escolaInep: escolaInep ?? '—',
        totalAtrasos: 1,
        breakdown: { ...ZERO, [bucket]: 1 },
      });
    }
  }

  for (const r of (c.data ?? []) as ConvenioRow[]) {
    if (isLate(r.status_catalog?.code, r.due_date)) {
      bump(r.escola_id, r.escolas?.name ?? null, r.escolas?.inep ?? null, 'convenios');
    }
  }
  for (const r of (s.data ?? []) as SimecRow[]) {
    if (isLate(r.status_catalog?.code, r.due_date)) {
      bump(r.escola_id, r.escolas?.name ?? null, r.escolas?.inep ?? null, 'simec');
    }
  }
  for (const r of (b.data ?? []) as BienioRow[]) {
    if (isLate(r.status_catalog?.code, r.due_date)) {
      bump(r.escola_id, r.escolas?.name ?? null, r.escolas?.inep ?? null, 'bienios');
    }
  }
  for (const r of (m.data ?? []) as MandatoRow[]) {
    if (isLate(r.status_catalog?.code, r.due_date)) {
      bump(r.escola_id, r.escolas?.name ?? null, r.escolas?.inep ?? null, 'mandatos');
    }
  }

  const entries = Array.from(acc.values()).sort(
    (a, b) => b.totalAtrasos - a.totalAtrasos,
  );

  return { entries, total: entries.length, isLoading };
}