import {
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Categoria de prazo — usada para pintar badges e ordenar listas.
 * - `atrasado`: due_date < hoje
 * - `hoje`: due_date == hoje
 * - `proximo`: due_date dentro da janela (ex: 7 dias)
 * - `futuro`: além da janela
 * - `sem_prazo`: due_date nulo
 */
export type DueCategory =
  | 'atrasado'
  | 'hoje'
  | 'proximo'
  | 'futuro'
  | 'sem_prazo';

export interface DueInfo {
  category: DueCategory;
  /** Dias inteiros até o prazo (negativo se atrasado). null se sem prazo. */
  daysUntil: number | null;
  /** Texto curto pronto pra UI, ex: "vence em 3 dias" / "atrasado há 2 dias". */
  label: string;
}

const hoje = () => startOfDay(new Date());

export function parseDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Supabase retorna 'YYYY-MM-DD' para colunas date — parseISO funciona.
  const d = parseISO(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param dueDateString data de prazo (YYYY-MM-DD)
 * @param statusCode código de status (EM_ANDAMENTO, CONCLUIDO, …)
 * @param diasAntecedencia janela para considerar "próximo" (lê de config)
 */
export function getDueInfo(
  dueDateString: string | null | undefined,
  statusCode: string | null | undefined,
  diasAntecedencia = 7,
): DueInfo {
  const due = parseDueDate(dueDateString);

  if (!due) {
    return { category: 'sem_prazo', daysUntil: null, label: 'Sem prazo' };
  }

  // Se o status já é terminal (CONCLUIDO / CANCELADO), prazo não "atrasa".
  const isTerminal =
    statusCode === 'CONCLUIDO' || statusCode === 'CANCELADO';

  const days = differenceInCalendarDays(due, hoje());

  if (isBefore(due, hoje()) && !isTerminal) {
    const atrasadoDias = Math.abs(days);
    return {
      category: 'atrasado',
      daysUntil: days,
      label:
        atrasadoDias === 0
          ? 'Vencia hoje'
          : atrasadoDias === 1
            ? 'Atrasado há 1 dia'
            : `Atrasado há ${atrasadoDias} dias`,
    };
  }

  if (days === 0) {
    return { category: 'hoje', daysUntil: 0, label: 'Vence hoje' };
  }

  if (days > 0 && days <= diasAntecedencia) {
    return {
      category: 'proximo',
      daysUntil: days,
      label:
        days === 1
          ? 'Vence amanhã'
          : days < diasAntecedencia
            ? `Vence em ${days} dias`
            : `Vence em ${days} dias`,
    };
  }

  return {
    category: 'futuro',
    daysUntil: days,
    label: days > 30 ? 'Prazo distante' : `Em ${days} dias`,
  };
}

export function formatLongDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}
