import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Deadline } from '@/hooks/useOverview';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { REGISTRO_TIPO_LABEL } from '@/lib/status';
import { getDueInfo } from '@/lib/dates';

export function DeadlineRow({ deadline }: { deadline: Deadline }) {
  const info = getDueInfo(
    deadline.dueDate,
    deadline.statusCode,
    7, // consistente com Overview
  );

  const variant =
    info.category === 'atrasado' || info.category === 'hoje'
      ? 'danger'
      : info.category === 'proximo'
        ? 'warn'
        : 'neutral';

  return (
    <Link
      to={deadline.href}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-card transition active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {deadline.title}
          </p>
          <Badge variant="neutral" className="shrink-0 text-[10px]">
            {REGISTRO_TIPO_LABEL[deadline.tipo]}
          </Badge>
        </div>
        {deadline.subtitle && (
          <p className="truncate text-xs text-slate-500">{deadline.subtitle}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <Badge variant={variant}>{info.label}</Badge>
        <span className="text-[10px] text-slate-500">
          {formatDate(deadline.dueDate)}
        </span>
      </div>

      <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
    </Link>
  );
}
