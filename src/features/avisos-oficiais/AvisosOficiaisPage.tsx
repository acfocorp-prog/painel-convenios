import { useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Bell,
  Check,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatDate } from '@/lib/utils';
import {
  CATEGORY_LABEL,
  SEVERITY_LABEL,
  SOURCE_LABEL,
  useArchiveOfficialDeadline,
  useMarkAllAsRead,
  useMarkAsRead,
  useOfficialDeadlines,
  useUnarchiveOfficialDeadline,
  type OfficialDeadlineCategory,
  type OfficialDeadlineSeverity,
  type OfficialDeadlineSource,
} from '@/hooks/useOfficialDeadlines';

type FilterKey = 'all' | 'unread' | 'urgent';

export function AvisosOficiaisPage() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [source, setSource] = useState<'ALL' | OfficialDeadlineSource>('ALL');
  const [category, setCategory] = useState<'ALL' | OfficialDeadlineCategory>(
    'ALL',
  );
  const [showArchived, setShowArchived] = useState(false);

  const { data: items = [], isLoading } = useOfficialDeadlines({
    includeArchived: showArchived,
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const archive = useArchiveOfficialDeadline();
  const unarchive = useUnarchiveOfficialDeadline();

  const filtered = useMemo(() => {
    return items.filter((d) => {
      if (filter === 'unread' && d.is_read) return false;
      if (filter === 'urgent' && d.severity !== 'URGENTE') return false;
      if (source !== 'ALL' && d.source !== source) return false;
      if (category !== 'ALL' && d.category !== category) return false;
      return true;
    });
  }, [items, filter, source, category]);

  const unreadCount = items.filter((d) => !d.is_read && !d.is_archived).length;
  const totalActive = items.filter((d) => !d.is_archived).length;

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
      toast.success('Aviso arquivado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  async function onUnarchive(id: string) {
    try {
      await unarchive.mutateAsync(id);
      toast.success('Aviso reativado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Avisos oficiais"
        description={
          isLoading
            ? 'Carregando…'
            : `${totalActive} ativo${totalActive === 1 ? '' : 's'} · ${unreadCount} não lido${unreadCount === 1 ? '' : 's'}`
        }
      />

      {/* Filtros */}
      <div className="space-y-2 px-4">
        <div className="flex flex-wrap gap-2">
          <FilterPill
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="Todos"
            count={items.filter((d) => !d.is_archived).length}
          />
          <FilterPill
            active={filter === 'unread'}
            onClick={() => setFilter('unread')}
            label="Não lidos"
            count={unreadCount}
            tone="brand"
          />
          <FilterPill
            active={filter === 'urgent'}
            onClick={() => setFilter('urgent')}
            label="Urgentes"
            count={items.filter(
              (d) => !d.is_archived && d.severity === 'URGENTE',
            ).length}
            tone="rose"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-slate-400" />
          <Select
            value={source}
            onValueChange={(v) => setSource(v as 'ALL' | OfficialDeadlineSource)}
          >
            <SelectTrigger className="h-9 flex-1 text-xs">
              <SelectValue placeholder="Fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as fontes</SelectItem>
              {(Object.keys(SOURCE_LABEL) as OfficialDeadlineSource[]).map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {SOURCE_LABEL[s]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>

          <Select
            value={category}
            onValueChange={(v) =>
              setCategory(v as 'ALL' | OfficialDeadlineCategory)
            }
          >
            <SelectTrigger className="h-9 flex-1 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as categorias</SelectItem>
              {(Object.keys(CATEGORY_LABEL) as OfficialDeadlineCategory[]).map(
                (c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus-ring"
            />
            Mostrar arquivados
          </label>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAll}
              disabled={markAllAsRead.isPending}
            >
              Marcar todos como lidos
            </Button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2 px-4">
        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nenhum aviso por aqui"
            description={
              filter === 'unread'
                ? 'Você já leu todos os avisos ativos.'
                : 'Quando novos avisos forem publicados, eles aparecem aqui.'
            }
          />
        ) : (
          filtered.map((d) => (
            <DeadlineCard
              key={d.id}
              d={d}
              onMark={onMark}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  tone = 'slate',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: 'slate' | 'brand' | 'rose';
}) {
  const toneClass = active
    ? tone === 'rose'
      ? 'bg-rose-600 text-white'
      : tone === 'brand'
        ? 'bg-brand-700 text-white'
        : 'bg-slate-900 text-white'
    : 'bg-white text-slate-700 border border-slate-200';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
        toneClass,
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px]',
          active ? 'bg-white/20' : 'bg-slate-100 text-slate-600',
        )}
      >
        {count}
      </span>
    </button>
  );
}

const SEV_BADGE: Record<
  OfficialDeadlineSeverity,
  { dot: string; bg: string; text: string }
> = {
  INFO: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-700' },
  ATENCAO: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  URGENTE: { dot: 'bg-rose-600', bg: 'bg-rose-50', text: 'text-rose-700' },
};

function DeadlineCard({
  d,
  onMark,
  onArchive,
  onUnarchive,
}: {
  d: import('@/hooks/useOfficialDeadlines').OfficialDeadline;
  onMark: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
}) {
  const sev = SEV_BADGE[d.severity];
  return (
    <Card className={cn(!d.is_read && !d.is_archived && 'border-brand-200')}>
      <CardContent className="space-y-1.5 p-3">
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', sev.dot)}
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-sm leading-snug',
                d.is_read || d.is_archived
                  ? 'text-slate-600'
                  : 'font-semibold text-slate-900',
              )}
            >
              {d.title}
            </p>
            {d.description && (
              <p className="mt-1 text-xs text-slate-600">{d.description}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
              <span className={cn('rounded-full px-2 py-0.5', sev.bg, sev.text)}>
                {SEVERITY_LABEL[d.severity]}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                {CATEGORY_LABEL[d.category]}
              </span>
              <span>
                {SOURCE_LABEL[d.source]} · publicado em {formatDate(d.published_at)}
              </span>
              {d.due_date && (
                <span className={sev.text}>
                  · prazo {formatDate(d.due_date)}
                </span>
              )}
              {d.is_archived && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                  arquivado
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-3">
              {d.source_url && (
                <a
                  href={d.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir fonte
                </a>
              )}
              {!d.is_read && !d.is_archived && (
                <button
                  type="button"
                  onClick={() => onMark(d.id)}
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                >
                  <Check className="h-3 w-3" />
                  Marcar como lido
                </button>
              )}
              {d.is_archived ? (
                <button
                  type="button"
                  onClick={() => onUnarchive(d.id)}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <ArchiveRestore className="h-3 w-3" />
                  Reativar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onArchive(d.id)}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  <Archive className="h-3 w-3" />
                  Arquivar
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}