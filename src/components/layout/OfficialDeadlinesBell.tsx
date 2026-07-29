import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn, formatDate } from '@/lib/utils';
import {
  useArchiveOfficialDeadline,
  useMarkAllAsRead,
  useMarkAsRead,
  useOfficialDeadlines,
  useUnreadCount,
  SOURCE_LABEL,
  type OfficialDeadline,
} from '@/hooks/useOfficialDeadlines';
import { toast } from 'sonner';

/** Cor + label compacto da severidade. */
const SEVERITY_CLASS: Record<
  OfficialDeadline['severity'],
  { dot: string; bg: string; text: string }
> = {
  INFO: {
    dot: 'bg-slate-400',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
  },
  ATENCAO: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  URGENTE: {
    dot: 'bg-rose-600',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
  },
};

export function OfficialDeadlinesBell() {
  const [open, setOpen] = useState(false);
  const { data: unread = 0 } = useUnreadCount();
  const { data: items = [] } = useOfficialDeadlines();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const archive = useArchiveOfficialDeadline();

  // Mostra os 10 primeiros — a query já ordena urgentes não-lidos no topo.
  const top = items.slice(0, 10);

  async function onMarkAll() {
    try {
      const n = await markAllAsRead.mutateAsync();
      toast.success(
        n > 0
          ? `${n} aviso${n === 1 ? '' : 's'} marcado${n === 1 ? '' : 's'} como lido${n === 1 ? '' : 's'}.`
          : 'Nada novo para marcar.',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  async function onMark(id: string) {
    try {
      await markAsRead.mutateAsync(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  async function onArchive(id: string) {
    try {
      await archive.mutateAsync(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Avisos oficiais${unread > 0 ? ` · ${unread} não lido${unread === 1 ? '' : 's'}` : ''}`}
          className="relative"
        >
          <Bell
            className={cn(
              'h-5 w-5',
              unread > 0 && 'text-brand-700',
            )}
          />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[22rem] p-0">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Avisos oficiais
            </p>
            <p className="text-[11px] text-slate-500">
              {unread > 0
                ? `${unread} não lido${unread === 1 ? '' : 's'}`
                : 'Tudo em dia'}
            </p>
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAll}
              disabled={markAllAsRead.isPending}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todos
            </Button>
          )}
        </header>

        {top.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhum aviso por enquanto.
          </div>
        ) : (
          <ul className="max-h-[360px] overflow-y-auto">
            {top.map((d) => {
              const sev = SEVERITY_CLASS[d.severity];
              return (
                <li
                  key={d.id}
                  className={cn(
                    'border-b border-slate-100 px-3 py-2.5 last:border-b-0',
                    !d.is_read && 'bg-brand-50/40',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', sev.dot)}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate text-sm',
                          d.is_read ? 'text-slate-600' : 'font-medium text-slate-900',
                        )}
                      >
                        {d.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {SOURCE_LABEL[d.source]} ·{' '}
                        {formatDate(d.published_at)}
                        {d.due_date && (
                          <>
                            {' · prazo '}
                            <span className={sev.text}>{formatDate(d.due_date)}</span>
                          </>
                        )}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1">
                        {d.source_url && (
                          <a
                            href={d.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-brand-700 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Abrir fonte
                          </a>
                        )}
                        {!d.is_read && (
                          <button
                            type="button"
                            onClick={() => onMark(d.id)}
                            className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900"
                          >
                            <Check className="h-3 w-3" />
                            Marcar lido
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onArchive(d.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600"
                          aria-label="Arquivar aviso"
                          title="Arquivar"
                        >
                          <Archive className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="border-t border-slate-200 px-4 py-2">
          <Link
            to="/avisos-oficiais"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Ver todos os avisos →
          </Link>
        </footer>
      </PopoverContent>
    </Popover>
  );
}