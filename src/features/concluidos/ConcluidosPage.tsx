import { Link } from 'react-router-dom';
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  FileText,
  type LucideIcon,
  RefreshCw,
  School,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/records/StatusBadge';
import {
  useConcluidos,
  type ConcluidoEntry,
} from '@/hooks/useConcluidos';
import { formatDate, formatRelative, cn } from '@/lib/utils';
import type { RegistroTipo } from '@/lib/status';

const SECTION_ICONS: Record<RegistroTipo, LucideIcon> = {
  CONVENIO: FileText,
  SIMEC: RefreshCw,
  BIENIO: CheckCircle2,
  MANDATO: Archive,
};

const SECTION_ROUTE: Record<RegistroTipo, string> = {
  CONVENIO: '/convenios',
  SIMEC: '/simec',
  BIENIO: '/bienios',
  MANDATO: '/mandatos',
};

const SECTION_LABEL: Record<RegistroTipo, string> = {
  CONVENIO: 'Convênios',
  SIMEC: 'SIMEC',
  BIENIO: 'Biênios',
  MANDATO: 'Mandatos',
};

const PREVIEW_LIMIT = 8;

export function ConcluidosPage() {
  const data = useConcluidos();

  if (data.isLoading) {
    return (
      <div className="space-y-3">
        <PageHeader title="Concluídos" />
        <div className="px-4">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <div className="space-y-3">
        <PageHeader
          title="Concluídos"
          description="Tudo o que já foi finalizado, em todas as categorias."
        />
        <div className="px-4">
          <Card className="p-1">
            <EmptyState
              icon={CheckCircle2}
              title="Nada concluído ainda"
              description="Quando você marcar algum registro como concluído, ele aparece aqui."
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Concluídos"
        description={`${data.total} registro${data.total === 1 ? '' : 's'} finalizado${data.total === 1 ? '' : 's'}`}
      />

      <div className="space-y-4 px-4">
        <Section
          tipo="CONVENIO"
          items={data.convenios}
          renderItem={renderConvenio}
        />
        <Section
          tipo="SIMEC"
          items={data.simec}
          renderItem={renderSimec}
        />
        <Section
          tipo="BIENIO"
          items={data.bienios}
          renderItem={renderBienio}
        />
        <Section
          tipo="MANDATO"
          items={data.mandatos}
          renderItem={renderMandato}
        />
      </div>
    </div>
  );
}

function Section<T extends ConcluidoEntry['tipo']>({
  tipo,
  items,
  renderItem,
}: {
  tipo: T;
  items: Array<Extract<ConcluidoEntry, { tipo: T }>>;
  renderItem: (entry: Extract<ConcluidoEntry, { tipo: T }>) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  const Icon: LucideIcon = SECTION_ICONS[tipo];
  const preview = items.slice(0, PREVIEW_LIMIT);
  const hasMore = items.length > PREVIEW_LIMIT;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            {SECTION_LABEL[tipo]}
          </h2>
          <Badge variant="neutral">{items.length}</Badge>
        </div>
        {hasMore && (
          <Link
            to={SECTION_ROUTE[tipo]}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
          >
            ver todos
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <ul className="space-y-2">
        {preview.map((entry) => (
          <li key={`${tipo}-${entry.id}`}>{renderItem(entry)}</li>
        ))}
      </ul>
    </section>
  );
}

// ── Renderers por módulo ──────────────────────────────────────────────

function renderConvenio(entry: Extract<ConcluidoEntry, { tipo: 'CONVENIO' }>) {
  const c = entry.data;
  const label = c.ref || c.description || 'Convênio';
  const verbaLabel = c.verba_tipos?.label ?? '—';
  return (
    <Link
      to={`/convenios/${c.id}`}
      className="block active:scale-[0.99]"
    >
      <Card className={cn('p-3 opacity-90 hover:opacity-100')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {label}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <School className="inline h-3 w-3" />
              {c.escolas?.name ?? 'Sem escola'} · {verbaLabel} · {c.year}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {formatDate(c.due_date) && `Prazo: ${formatDate(c.due_date)} · `}
              {formatRelative(c.updated_at)}
            </p>
          </div>
          <StatusBadge code={c.status_catalog?.code} />
        </div>
      </Card>
    </Link>
  );
}

function renderSimec(entry: Extract<ConcluidoEntry, { tipo: 'SIMEC' }>) {
  const s = entry.data;
  return (
    <Link to={`/simec/${s.id}`} className="block active:scale-[0.99]">
      <Card className="p-3 opacity-90 hover:opacity-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {s.program}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <School className="inline h-3 w-3" />
              {s.escolas?.name ?? 'Escola removida'} · {s.year}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {s.due_date && `Prazo: ${formatDate(s.due_date)} · `}
              {formatRelative(s.updated_at)}
            </p>
          </div>
          <StatusBadge code={s.status_catalog?.code} />
        </div>
      </Card>
    </Link>
  );
}

function renderBienio(entry: Extract<ConcluidoEntry, { tipo: 'BIENIO' }>) {
  const b = entry.data;
  return (
    <Link to={`/bienios/${b.id}`} className="block active:scale-[0.99]">
      <Card className="p-3 opacity-90 hover:opacity-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              Biênio {b.start_year}/{b.end_year}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <School className="inline h-3 w-3" />
              {b.escolas?.name ?? 'Escola removida'}
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              {b.notary_validated && (
                <span className="inline-flex items-center gap-0.5 text-status-ok">
                  <CheckCircle2 className="h-3 w-3" />
                  cartório
                </span>
              )}
              <span>{formatRelative(b.updated_at)}</span>
            </p>
          </div>
          <StatusBadge code={b.status_catalog?.code} />
        </div>
      </Card>
    </Link>
  );
}

function renderMandato(entry: Extract<ConcluidoEntry, { tipo: 'MANDATO' }>) {
  const m = entry.data;
  const isSecretaria = !m.escola_id;
  return (
    <Link to={`/mandatos/${m.id}`} className="block active:scale-[0.99]">
      <Card className="p-3 opacity-90 hover:opacity-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {isSecretaria
                ? 'Mandato tampão — Secretaria'
                : (m.escolas?.name ?? 'Mandato tampão')}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatDate(m.start_date)} → {formatDate(m.end_date)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {formatRelative(m.updated_at)}
            </p>
          </div>
          <StatusBadge code={m.status_catalog?.code} />
        </div>
      </Card>
    </Link>
  );
}

// Re-exported so other modules can show a mini-link in their list pages.
export { SECTION_LABEL as CONCLUIDOS_SECTION_LABEL };