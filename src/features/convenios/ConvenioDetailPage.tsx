import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  ExternalLink,
  Pencil,
  School,
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
  useConvenio,
  useDeleteConvenio,
  useUpdateConvenio,
} from '@/hooks/useConvenios';
import { useStatusHistory } from '@/hooks/useStatusHistory';
import { useStatusCatalog } from '@/hooks/useLookups';
import { useProfileById } from '@/hooks/useProfileById';
import { StatusBadge } from '@/components/records/StatusBadge';
import { DueDateBadge } from '@/components/records/DueDateBadge';
import { AttachmentList } from '@/components/records/AttachmentList';
import { formatBRL, formatDate, formatRelative } from '@/lib/utils';

export function ConvenioDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: c, isLoading } = useConvenio(id);
  const { data: statusCatalog } = useStatusCatalog();
  const update = useUpdateConvenio(id ?? '');
  const del = useDeleteConvenio();
  const { data: history } = useStatusHistory('CONVENIO', id);

  if (isLoading) return <LoadingSpinner />;
  if (!c) return null;

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
      await update.mutateAsync({ priority: !c!.priority });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  async function onDelete() {
    if (!confirm('Excluir este convênio? (pode ser restaurado depois)')) return;
    try {
      await del.mutateAsync(c!.id);
      toast.success('Convênio excluído');
      navigate('/convenios');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="-mx-4">
        <PageHeader
          title={c.verba_tipos?.label ?? 'Convênio'}
          description={`${c.year}${c.ref ? ` · ${c.ref}` : ''}`}
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
                onClick={() => navigate(`/convenios/${id}/editar`)}
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
              <StatusBadge code={c.status_catalog?.code} />
              <DueDateBadge
                dueDate={c.due_date}
                statusCode={c.status_catalog?.code}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {c.amount !== null && (
                <Info icon={Banknote} label="Valor">
                  {formatBRL(c.amount)}
                </Info>
              )}
              {c.due_date && (
                <Info icon={CalendarClock} label="Prazo">
                  {formatDate(c.due_date)}
                </Info>
              )}
              <Info icon={Tag} label="Verba">
                {c.verba_tipos?.label}
                {c.verba_tipos?.requires_bank_info ? ' (banco)' : ''}
              </Info>
              {c.launched && (
                <Info icon={Tag} label="Situação">
                  Lançado
                  {c.launched_at && ` · ${formatDate(c.launched_at)}`}
                </Info>
              )}
            </div>

            {c.bank_branch || c.bank_account ? (
              <div className="rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
                Banco: <strong>{c.bank_branch}</strong> · Conta:{' '}
                <strong>{c.bank_account}</strong>
              </div>
            ) : null}

            {c.escolas && (
              <button
                type="button"
                onClick={() => navigate(`/escolas/${c.escolas!.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <School className="h-4 w-4 text-brand-700" />
                  <span className="font-medium text-slate-900">
                    {c.escolas.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    INEP {c.escolas.inep}
                  </span>
                </span>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </button>
            )}

            {c.process_link && (
              <a
                href={c.process_link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 break-all rounded-xl bg-brand-50 p-2 text-sm text-brand-800 hover:bg-brand-100"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                {c.process_link}
              </a>
            )}

            {c.description && (
              <p className="text-sm text-slate-700">{c.description}</p>
            )}
            {c.notes && (
              <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-2 text-sm text-slate-700">
                {c.notes}
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
              value={c.status_id}
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
          <Button
            variant={c.priority ? 'success' : 'outline'}
            size="sm"
            onClick={togglePriority}
            disabled={update.isPending}
          >
            {c.priority ? '✓ É prioridade' : 'Marcar como prioritário'}
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
                <HistoryItem key={h.id} oldId={h.old_status_id} newId={h.new_status_id} at={h.changed_at} by={h.changed_by} />
              ))}
            </ul>
          </CardContent>
        </Card>

        <CreatedBy created_by={c.created_by} created_at={c.created_at} updated_by={c.updated_by} updated_at={c.updated_at} />

        <AttachmentList registroTipo="CONVENIO" registroId={c.id} />
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
