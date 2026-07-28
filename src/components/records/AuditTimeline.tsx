import { ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useStatusHistory } from '@/hooks/useStatusHistory';
import { useStatusCatalog } from '@/hooks/useLookups';
import { useProfileById } from '@/hooks/useProfileById';
import { formatDate, formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { RegistroTipo } from '@/lib/status';

/**
 * Timeline visual do histórico de status.
 * Cada item: badge (status antigo) → arrow → badge (status novo) + autor + data.
 */
export function AuditTimeline({
  registroTipo,
  registroId,
}: {
  registroTipo: RegistroTipo;
  registroId: string;
}) {
  const { data: history, isLoading } = useStatusHistory(registroTipo, registroId);
  const { data: catalog } = useStatusCatalog();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          Histórico de status
          {history && history.length > 0 && (
            <Badge variant="neutral" className="ml-1">
              {history.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingSpinner />}
        {!isLoading && (!history || history.length === 0) && (
          <p className="py-2 text-center text-xs text-slate-500">
            Nenhuma mudança de status registrada ainda.
          </p>
        )}
        {history && history.length > 0 && (
          <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4">
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span
                  className={cn(
                    'absolute -left-[1.32rem] top-1 h-3 w-3 rounded-full ring-2 ring-white',
                    codeColor(h.new_status_id, catalog),
                  )}
                  aria-hidden
                />
                <TimelineRow
                  oldId={h.old_status_id}
                  newId={h.new_status_id}
                  at={h.changed_at}
                  by={h.changed_by}
                  catalog={catalog ?? []}
                />
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function codeColor(
  id: string,
  catalog: Array<{ id: string; code?: string }> | undefined,
) {
  if (!catalog) return 'bg-status-warn';
  const found = catalog.find((s) => s.id === id);
  const code = found?.code;
  if (code === 'CONCLUIDO') return 'bg-status-ok';
  if (code === 'ATRASADO') return 'bg-status-danger';
  if (code === 'CANCELADO') return 'bg-slate-400';
  return 'bg-status-warn';
}

function TimelineRow({
  oldId,
  newId,
  at,
  by,
  catalog,
}: {
  oldId: string | null;
  newId: string;
  at: string;
  by: string | null;
  catalog: Array<{ id: string; label: string }>;
}) {
  const oldLabel = oldId ? catalog.find((s) => s.id === oldId)?.label ?? '—' : 'criado';
  const newLabel = catalog.find((s) => s.id === newId)?.label ?? '—';
  const { data: byProfile } = useProfileById(by);

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5 text-xs">
        <span className="font-medium text-slate-900">{oldLabel}</span>
        <ArrowRight className="h-3 w-3 text-slate-400" />
        <span className="font-medium text-slate-900">{newLabel}</span>
      </div>
      <p className="mt-0.5 text-[10px] text-slate-500">
        por {byProfile?.full_name ?? 'usuário'} · {formatRelative(at)} (
        {formatDate(at)})
      </p>
    </div>
  );
}