import { Badge } from '@/components/ui/badge';
import { statusStyle } from '@/lib/status';

export function StatusBadge({ code }: { code: string | null | undefined }) {
  const s = statusStyle(code);

  // Mapeia o status em variantes do Badge.
  const variant =
    s.code === 'CONCLUIDO'
      ? 'ok'
      : s.code === 'ATRASADO'
        ? 'danger'
        : s.code === 'CANCELADO'
          ? 'neutral'
          : 'warn';

  return <Badge variant={variant}>{s.label}</Badge>;
}
