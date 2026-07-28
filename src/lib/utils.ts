import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina classes condicionalmente e resolve conflitos do Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata valor em BRL (R$ 1.234,56). */
export function formatBRL(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Formata data ISO/Date → dd/MM/yyyy. Aceita null/undefined. */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Mostra "há 3 min" / "há 2 dias". */
export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'agora há pouco';
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days} dia${days === 1 ? '' : 's'}`;
  return formatDate(d);
}

/** Iniciais a partir de nome completo. */
export function initialsOf(name?: string | null, fallback = '?') {
  if (!name) return fallback;
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
