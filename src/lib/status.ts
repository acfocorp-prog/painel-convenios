/**
 * Mapeamento de código de status → rótulo PT-BR e cor (Tailwind).
 * Cores vêm do tailwind.config (status.ok, status.warn, status.danger).
 */
export interface StatusStyle {
  code: string;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  isTerminal: boolean;
}

export const STATUS_STYLES: Record<string, StatusStyle> = {
  EM_ANDAMENTO: {
    code: 'EM_ANDAMENTO',
    label: 'Em andamento',
    bgClass: 'bg-status-warn/10',
    textClass: 'text-status-warn',
    borderClass: 'border-status-warn/30',
    isTerminal: false,
  },
  ATRASADO: {
    code: 'ATRASADO',
    label: 'Atrasado',
    bgClass: 'bg-status-danger/10',
    textClass: 'text-status-danger',
    borderClass: 'border-status-danger/30',
    isTerminal: false,
  },
  CONCLUIDO: {
    code: 'CONCLUIDO',
    label: 'Concluído',
    bgClass: 'bg-status-ok/10',
    textClass: 'text-status-ok',
    borderClass: 'border-status-ok/30',
    isTerminal: true,
  },
  CANCELADO: {
    code: 'CANCELADO',
    label: 'Cancelado',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-600',
    borderClass: 'border-slate-300',
    isTerminal: true,
  },
};

export function statusStyle(code: string | null | undefined): StatusStyle {
  if (!code) return STATUS_STYLES.EM_ANDAMENTO;
  return STATUS_STYLES[code] ?? STATUS_STYLES.EM_ANDAMENTO;
}

/** Códigos de tipo de registro (polimórfico). */
export const REGISTRO_TIPO = {
  CONVENIO: 'CONVENIO',
  SIMEC: 'SIMEC',
  BIENIO: 'BIENIO',
  MANDATO: 'MANDATO',
} as const;
export type RegistroTipo = (typeof REGISTRO_TIPO)[keyof typeof REGISTRO_TIPO];

export const REGISTRO_TIPO_LABEL: Record<RegistroTipo, string> = {
  CONVENIO: 'Convênio',
  SIMEC: 'SIMEC',
  BIENIO: 'Biênio',
  MANDATO: 'Mandato Tampão',
};
