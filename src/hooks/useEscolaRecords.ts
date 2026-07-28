import { useConvenios, type ConvenioRow } from './useConvenios';
import { useSimec, type SimecRow } from './useSimec';
import { useBienios, type BienioRow } from './useBienios';
import { useMandatos, type MandatoRow } from './useMandatos';

/**
 * Agrega todos os registros de uma escola (não-deletados) das 4 tabelas filhas.
 *
 * Não dispara queries extras: reusa as queries cacheadas dos hooks individuais
 * e filtra client-side por `escolaId`. Quando uma dessas queries invalidar
 * (criação/edição), esta composição re-renderiza automaticamente.
 *
 * Mandatos SEM escola (mandato da secretaria) não aparecem aqui — escopo é
 * estritamente "dentro desta escola".
 */

export interface EscolaRecords {
  convenios: ConvenioRow[];
  simec: SimecRow[];
  bienios: BienioRow[];
  mandatos: MandatoRow[];
  total: number;
  isLoading: boolean;
}

export function useEscolaRecords(escolaId: string | undefined): EscolaRecords {
  const c = useConvenios({ escolaId });
  const s = useSimec({ escolaId });
  const b = useBienios({ escolaId });
  const m = useMandatos({ escolaId });

  const isLoading = c.isLoading || s.isLoading || b.isLoading || m.isLoading;

  const convenios = c.data ?? [];
  const simec = s.data ?? [];
  const bienios = b.data ?? [];
  // Mandato sem escola cai fora do escopo "desta escola".
  const mandatos = (m.data ?? []).filter((row) => row.escola_id !== null);

  return {
    convenios,
    simec,
    bienios,
    mandatos,
    total: convenios.length + simec.length + bienios.length + mandatos.length,
    isLoading,
  };
}