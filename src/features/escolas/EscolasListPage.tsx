import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, School } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useEscolas, type Escola } from '@/hooks/useEscolas';
import { useEscolaExport } from '@/hooks/useExcelExport';
import { ExportButton } from '@/components/records/ExportButton';
import { EscolaImportDialog } from './EscolaImportDialog';
import { formatRelative } from '@/lib/utils';

export function EscolasListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: escolas, isLoading } = useEscolas(search);
  const exportEscolas = useEscolaExport(escolas ?? []);

  const total = escolas?.length ?? 0;
  const updatedAgo = useMemo(() => {
    if (!escolas?.length) return null;
    const last = escolas
      .map((e) => e.last_movement_at ?? e.updated_at)
      .sort()
      .at(-1);
    return last ?? null;
  }, [escolas]);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Escolas"
        description={`${total} ${total === 1 ? 'cadastrada' : 'cadastradas'}${
          updatedAgo ? ` · última atividade ${formatRelative(updatedAgo)}` : ''
        }`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <EscolaImportDialog />
            <ExportButton
              onExport={exportEscolas}
              disabled={!escolas || escolas.length === 0}
            />
            <Button
              size="md"
              onClick={() => navigate('/escolas/nova')}
            >
              <Plus className="h-4 w-4" />
              Nova
            </Button>
          </div>
        }
      />

      <div className="px-4">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou INEP"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading && <LoadingSpinner />}

        {!isLoading && escolas && escolas.length === 0 && (
          <EmptyState
            icon={School}
            title={search ? 'Nada encontrado' : 'Nenhuma escola cadastrada'}
            description={
              search
                ? 'Tente outro nome ou INEP.'
                : 'Cadastre a primeira escola para poder vinculá-la a convênios e programas.'
            }
            action={
              !search && (
                <Button onClick={() => navigate('/escolas/nova')}>
                  <Plus className="h-4 w-4" />
                  Cadastrar escola
                </Button>
              )
            }
          />
        )}

        {!isLoading && escolas && escolas.length > 0 && (
          <ul className="space-y-2">
            {escolas.map((escola) => (
              <li key={escola.id}>
                <EscolaRow escola={escola} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EscolaRow({ escola }: { escola: Escola }) {
  const inativo =
    escola.last_movement_at
      ? Date.now() - new Date(escola.last_movement_at).getTime() >
        30 * 24 * 60 * 60 * 1000
      : true;

  return (
    <Link
      to={`/escolas/${escola.id}`}
      className="block transition active:scale-[0.99]"
    >
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <School className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {escola.name}
            </p>
            <p className="text-xs text-slate-500">INEP {escola.inep}</p>
          </div>
          {escola.last_movement_at && (
            <Badge variant={inativo ? 'neutral' : 'brand'}>
              {formatRelative(escola.last_movement_at)}
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}
