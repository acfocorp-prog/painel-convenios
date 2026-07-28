import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StatTileProps {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Valor grande em destaque (ex: numero de atrasados). */
  value: number;
  /** Rótulo curto para o valor (ex: "atrasados"). */
  valueLabel: string;
  /** Sub-texto secundário (ex: "3 em aberto · 5 concluídos"). */
  secondary?: string;
  /** Cor de identidade do módulo (categórica). Não é status; é identidade. */
  accentClass?: string;
}

/**
 * Stat tile categoria "headline number" — medida única focal + subtexto.
 * Status palette (vermelho/âmbar/verde) é reservada para sinalizar o estado
 * do item; a cor de identidade do módulo fica num canto como "tinta de
 * patrimônio", não como estado.
 */
export function StatTile({
  to,
  icon: Icon,
  label,
  value,
  valueLabel,
  secondary,
  accentClass,
}: StatTileProps) {
  const isAttention = value > 0;

  return (
    <Link
      to={to}
      className="block rounded-2xl border border-slate-200 bg-white p-3 shadow-card transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              accentClass ?? 'bg-brand-50 text-brand-700',
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-3xl font-bold tabular-nums leading-none',
            isAttention ? 'text-status-danger' : 'text-slate-900',
          )}
        >
          {value}
        </span>
        <span className="text-xs text-slate-500">{valueLabel}</span>
      </div>

      {secondary && (
        <p className="mt-1 text-[11px] text-slate-500">{secondary}</p>
      )}
    </Link>
  );
}
