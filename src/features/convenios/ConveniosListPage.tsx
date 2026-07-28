import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Filter,
  Plus,
  Search,
  FileText,
  Banknote,
  School,
  ListChecks,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useConvenios,
  type ConvenioFilters,
} from '@/hooks/useConvenios';
import { useConvenioExport } from '@/hooks/useExcelExport';
import { useVerbaTipos } from '@/hooks/useLookups';
import { StatusBadge } from '@/components/records/StatusBadge';
import { DueDateBadge } from '@/components/records/DueDateBadge';
import { ExportButton } from '@/components/records/ExportButton';
import { cn, formatBRL } from '@/lib/utils';

const ALL = '__all__';

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

const currentYear = new Date().getFullYear();
const yearOptions = [
  currentYear + 1,
  currentYear,
  currentYear - 1,
  currentYear - 2,
];

export function ConveniosListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState<string>(ALL);
  const [verba, setVerba] = useState<string>(ALL);
  const [statusCode, setStatusCode] = useState<string>('EM_ANDAMENTO');

  const filters: ConvenioFilters = {
    search,
    year: year === ALL ? undefined : Number(year),
    verbaTipoId: verba === ALL ? undefined : verba,
    statusCode,
  };

  const { data, isLoading } = useConvenios(filters);
  const { data: verbaTipos } = useVerbaTipos();
  const exportConvenios = useConvenioExport(data ?? []);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Convênios"
        description={data ? `${data.length} registro${data.length === 1 ? '' : 's'}` : ''}
        action={
          <div className="flex items-center gap-2">
            <ExportButton
              onExport={exportConvenios}
              disabled={!data || data.length === 0}
            />
            <Button onClick={() => navigate('/convenios/novo')}>
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
            placeholder="Buscar por referência ou descrição"
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

        <div className="flex gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="flex-1">
              <span className="text-slate-500 mr-1">
                <Filter className="h-4 w-4 inline" />
              </span>
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os anos</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={verba} onValueChange={setVerba}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Verba" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as verbas</SelectItem>
              {verbaTipos?.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <LoadingSpinner />}

        {!isLoading && data && data.length === 0 && (
          <EmptyState
            icon={FileText}
            title="Nada por aqui"
            description="Você pode cadastrar um novo convênio ou ajustar os filtros."
            action={
              <Button onClick={() => navigate('/convenios/novo')}>
                <Plus className="h-4 w-4" />
                Novo convênio
              </Button>
            }
          />
        )}

        {!isLoading && data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((c) => (
              <li key={c.id}>
                <Link to={`/convenios/${c.id}`} className="block active:scale-[0.99]">
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {c.verba_tipos?.label ?? 'Convênio'}
                            {c.ref ? ` · ${c.ref}` : ''}
                          </p>
                          {c.priority && (
                            <Badge variant="warn" className="shrink-0">
                              Urgente
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.year}
                          {c.escolas?.name && (
                            <>
                              {' · '}
                              <School className="inline h-3 w-3" /> {c.escolas.name}
                            </>
                          )}
                          {c.amount !== null && (
                            <>
                              {' · '}
                              <Banknote className="inline h-3 w-3" /> {formatBRL(c.amount)}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge code={c.status_catalog?.code} />
                        <DueDateBadge
                          dueDate={c.due_date}
                          statusCode={c.status_catalog?.code}
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
