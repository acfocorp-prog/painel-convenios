import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Pencil,
  School,
  Stamp,
  Tag,
  Trash2,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBienioById,
  useDeleteBienio,
  useUpdateBienio,
  useValidateBienio,
} from '@/hooks/useBienios';
import { useStatusHistory } from '@/hooks/useStatusHistory';
import { useStatusCatalog } from '@/hooks/useLookups';
import { useProfileById } from '@/hooks/useProfileById';
import { StatusBadge } from '@/components/records/StatusBadge';
import { DueDateBadge } from '@/components/records/DueDateBadge';
import { formatDate, formatRelative } from '@/lib/utils';

export function BienioDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: b, isLoading } = useBienioById(id);
  const { data: statusCatalog } = useStatusCatalog();
  const update = useUpdateBienio(id ?? '');
  const del = useDeleteBienio();
  const validate = useValidateBienio(id ?? '');
  const { data: history } = useStatusHistory('BIENIO', id);

  if (isLoading) return <LoadingSpinner />;
  if (!b) return null;

  async function changeStatus(newStatusId: string) {
    try {
      await update.mutateAsync({ status_id: newStatusId });
      toast.success('Status atualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  async function togglePriority() {
    try {
      await update.mutateAsync({ priority: !b!.priority });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  async function onValidateNotary() {
    if (
      !confirm(
        'Confirmar validação no cartório? O biênio será marcado como concluído.',
      )
    )
      return;
    try {
      await validate.mutateAsync();
      toast.success('Biênio validado no cartório');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  async function onDelete() {
    if (!confirm('Excluir este biênio? (pode ser restaurado depois)')) return;
    try {
      await del.mutateAsync(b!.id);
      toast.success('Biênio excluído');
      navigate('/bienios');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="-mx-4">
        <PageHeader
          title={`Biênio ${b.start_year}–${b.end_year}`}
          description="Ata → cartório"
          action={
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Voltar"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Editar"
                onClick={() => navigate(`/bienios/${id}/editar`)}
              >
                <Pencil className="h-5 w-5" />
              </Button>
            </div>
          }
        />
      </div>

      <div className="space-y-3 px-4">
        <Card>
          <CardContent className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <StatusBadge code={b.status_catalog?.code} />
              <DueDateBadge
                dueDate={b.due_date}
                statusCode={b.status_catalog?.code}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <Info icon={Tag} label="Período">
                {b.start_year}–{b.end_year}
              </Info>
              {b.due_date && (
                <Info icon={CalendarClock} label="Prazo">
                  {formatDate(b.due_date)}
                </Info>
              )}
              {b.ata_signed_at && (
                <Info icon={Tag} label="Ata">
                  {formatDate(b.ata_signed_at)}
                </Info>
              )}
              <Info icon={Stamp} label="Cartório">
                {b.notary_validated
                  ? `Validado em ${b.notary_validation_date ? formatDate(b.notary_validation_date) : 'data desconhecida'}`
                  : 'Pendente'}
              </Info>
            </div>

            {b.escolas && (
              <button
                type="button"
                onClick={() => navigate(`/escolas/${b.escolas!.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <School className="h-4 w-4 text-brand-700" />
                  <span className="font-medium text-slate-900">
                    {b.escolas.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    INEP {b.escolas.inep}
                  </span>
                </span>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </button>
            )}

            {b.notes && (
              <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-2 text-sm text-slate-700">
                {b.notes}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Status change */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Mudar status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={b.status_id}
              onValueChange={changeStatus}
              disabled={update.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {statusCatalog?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          {!b.notary_validated && (
            <Button
              variant="success"
              size="sm"
              onClick={onValidateNotary}
              disabled={validate.isPending}
            >
              <Stamp className="h-4 w-4" />
              Validar no cartório
            </Button>
          )}
          <Button
            variant={b.priority ? 'success' : 'outline'}
            size="sm"
            onClick={togglePriority}
            disabled={update.isPending}
          >
            {b.priority ? '✓ É prioridade' : 'Marcar como prioritário'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>

        {/* Histórico */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              Histórico de status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history && history.length === 0 && (
              <p className="text-sm text-slate-500">
                Sem mudanças de status registradas.
              </p>
            )}
            <ul className="space-y-2">
              {history?.map((h) => (
                <HistoryItem
                  key={h.id}
                  oldId={h.old_status_id}
                  newId={h.new_status_id}
                  at={h.changed_at}
                  by={h.changed_by}
                />
              ))}
            </ul>
          </CardContent>
        </Card>

        <CreatedBy
          created_by={b.created_by}
          created_at={b.created_at}
          updated_by={b.updated_by}
          updated_at={b.updated_at}
        />
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="truncate text-sm text-slate-900">{children}</p>
      </div>
    </div>
  );
}

function HistoryItem({
  oldId,
  newId,
  at,
  by,
}: {
  oldId: string | null;
  newId: string;
  at: string;
  by: string | null;
}) {
  const { data: catalog } = useStatusCatalog();
  const { data: byProfile } = useProfileById(by);
  const oldLabel = catalog?.find((s) => s.id === oldId)?.label ?? '—';
  const newLabel = catalog?.find((s) => s.id === newId)?.label ?? '—';

  return (
    <li className="rounded-xl bg-slate-50 p-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-900">
          {oldLabel} → {newLabel}
        </span>
        <span className="text-xs text-slate-500">{formatRelative(at)}</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        por {byProfile?.full_name ?? 'usuário'}
      </p>
    </li>
  );
}

function CreatedBy({
  created_by,
  created_at,
  updated_by,
  updated_at,
}: {
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}) {
  const a = useProfileById(created_by);
  const b = useProfileById(updated_by);
  return (
    <p className="px-1 text-xs text-slate-500">
      Criado por <strong>{a.data?.full_name ?? 'usuário'}</strong>{' '}
      {formatRelative(created_at)}
      {updated_at !== created_at && (
        <>
          {' · última edição por '}
          <strong>{b.data?.full_name ?? 'usuário'}</strong>{' '}
          {formatRelative(updated_at)}
        </>
      )}
    </p>
  );
}
