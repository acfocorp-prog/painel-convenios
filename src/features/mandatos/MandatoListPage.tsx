import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Plus,
  Search,
  FileText,
  School,
  ListChecks,
  CheckCircle2,
  CircleDashed,
  Building2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useMandatos, type MandatoFilters } from '@/hooks/useMandatos';
import { useMandatoExport } from '@/hooks/useExcelExport';
import { StatusBadge } from '@/components/records/StatusBadge';
import { DueDateBadge } from '@/components/records/DueDateBadge';
import { ExportButton } from '@/components/records/ExportButton';
import { cn, formatDate } from '@/lib/utils';

const statusChip: Array<{
  code: 'EM_ANDAMENTO' | 'ATRASADO' | 'CONCLUIDO' | 'CANCELADO';
  label: string;
  icon: typeof CircleDashed;
  isLate: boolean;
}> = [
  { code: 'EM_ANDAMENTO', label: 'Em andamento', icon: CircleDashed, isLate: false },
  { code: 'ATRASADO', label: 'Atrasados', icon: AlertTriangle, isLate: true },
  { code: 'CONCLUIDO', label: 'Concluídos', icon: CheckCircle2, isLate: false },
  { code: 'CANCELADO', label: 'Cancelados', icon: ListChecks, isLate: false },
];

export function MandatoListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusCode, setStatusCode] = useState<string>('EM_ANDAMENTO');

  const filters: MandatoFilters = {
    search,
    statusCode,
  };

  const { data, isLoading } = useMandatos(filters);
  const exportMandatos = useMandatoExport(data ?? []);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Mandato Tampão"
        description={data ? `${data.length} registro${data.length === 1 ? '' : 's'}` : ''}
        action={
          <div className="flex items-center gap-2">
            <ExportButton
              onExport={exportMandatos}
              disabled={!data || data.length === 0}
            />
            <Button onClick={() => navigate('/mandatos/novo')}>
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </div>
        }
      />

      <div className="space-y-3 px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por anotação"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {statusChip.map((chip) => {
            const active = statusCode === chip.code;
            const Icon = chip.icon;
            return (
              <button
                key={chip.code}
                type="button"
                onClick={() => setStatusCode(chip.code)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-brand-700 bg-brand-50 text-brand-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5',
                    chip.isLate && active && 'text-status-danger',
                  )}
                />
                {chip.label}
              </button>
            );
          })}
        </div>

        {isLoading && <LoadingSpinner />}

        {!isLoading && data && data.length === 0 && (
          <EmptyState
            icon={FileText}
            title="Nada por aqui"
            description="Você pode cadastrar um novo mandato ou ajustar os filtros."
            action={
              <Button onClick={() => navigate('/mandatos/novo')}>
                <Plus className="h-4 w-4" />
                Novo mandato
              </Button>
            }
          />
        )}

        {!isLoading && data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((m) => (
              <li key={m.id}>
                <Link to={`/mandatos/${m.id}`} className="block active:scale-[0.99]">
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {m.escolas?.name ?? 'Mandato tampão — Secretaria'}
                          </p>
                          {m.priority && (
                            <Badge variant="warn" className="shrink-0">
                              Urgente
                            </Badge>
                          )}
                          {!m.escola_id && (
                            <Badge variant="brand" className="shrink-0">
                              <Building2 className="mr-1 inline h-3 w-3" />
                              Secretaria
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(m.start_date)} → {formatDate(m.end_date)}
                          {m.escolas && (
                            <>
                              {' · '}
                              <School className="inline h-3 w-3" /> INEP {m.escolas.inep}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge code={m.status_catalog?.code} />
                        <DueDateBadge
                          dueDate={m.due_date}
                          statusCode={m.status_catalog?.code}
                        />
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
