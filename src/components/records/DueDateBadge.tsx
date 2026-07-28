import { Badge } from '@/components/ui/badge';
import { getDueInfo } from '@/lib/dates';
import { cn } from '@/lib/utils';

interface DueDateBadgeProps {
  dueDate: string | null | undefined;
  statusCode?: string | null;
  diasAntecedencia?: number;
  className?: string;
}

export function DueDateBadge({
  dueDate,
  statusCode,
  diasAntecedencia,
  className,
}: DueDateBadgeProps) {
  const info = getDueInfo(dueDate, statusCode, diasAntecedencia);

  if (info.category === 'sem_prazo') {
    return null;
  }

  const variant =
    info.category === 'atrasado'
      ? 'danger'
      : info.category === 'hoje'
        ? 'danger'
        : info.category === 'proximo'
          ? 'warn'
          : 'neutral';

  return (
    <Badge variant={variant} className={cn('whitespace-nowrap', className)}>
      {info.label}
    </Badge>
  );
}
