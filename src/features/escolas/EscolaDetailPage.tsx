import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useDeleteSchoolNote,
  useCreateSchoolNote,
  useEscola,
  useSchoolNotes,
  useUpdateEscola,
} from '@/hooks/useEscolas';
import { formatRelative } from '@/lib/utils';

export function EscolaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: escola, isLoading } = useEscola(id);

  if (isLoading) return <LoadingSpinner />;
  if (!escola) return null;

  return (
    <div className="space-y-4 px-4 pb-6 pt-4">
      <div className="-mt-4 -mx-4">
        <PageHeader
          title={escola.name}
          description={`INEP ${escola.inep}`}
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
                onClick={() => navigate(`/escolas/${id}/editar`)}
              >
                <Pencil className="h-5 w-5" />
              </Button>
            </div>
          }
        />
      </div>

      <ToggleActive escolaId={id!} active={escola.active} />

      <SchoolNotes escolaId={id!} />
    </div>
  );
}

function ToggleActive({ escolaId, active }: { escolaId: string; active: boolean }) {
  const update = useUpdateEscola(escolaId);
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Escola {active ? 'ativa' : 'inativa'}
          </p>
          <p className="text-xs text-slate-500">
            Use para esconder escolas inativas das listas.
          </p>
        </div>
        <Button
          variant={active ? 'outline' : 'success'}
          size="sm"
          disabled={update.isPending}
          onClick={async () => {
            try {
              await update.mutateAsync({ active: !active });
              toast.success(active ? 'Escola inativada' : 'Escola reativada');
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Erro');
            }
          }}
        >
          {active ? 'Inativar' : 'Reativar'}
        </Button>
      </div>
    </Card>
  );
}

function SchoolNotes({ escolaId }: { escolaId: string }) {
  const { data: notes, isLoading } = useSchoolNotes(escolaId);
  const create = useCreateSchoolNote(escolaId);
  const del = useDeleteSchoolNote(escolaId);
  const [body, setBody] = useState('');

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Diário</h2>
      </div>
      <Card className="p-3">
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const trimmed = body.trim();
            if (!trimmed) return;
            try {
              await create.mutateAsync(trimmed);
              setBody('');
              toast.success('Anotação salva');
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Erro');
            }
          }}
        >
          <Textarea
            placeholder="Ex.: Liguei hoje, aguardando retorno da direção."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!body.trim() || create.isPending}
            >
              <Plus className="h-4 w-4" />
              Anotar
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-3 space-y-2">
        {isLoading && <LoadingSpinner />}
        {!isLoading && notes && notes.length === 0 && (
          <EmptyState
            title="Sem anotações"
            description="Use o diário para registrar interações com a escola."
          />
        )}
        {notes?.map((note) => (
          <Card key={note.id} className="p-3">
            <CardContent className="pt-0 space-y-2">
              <p className="whitespace-pre-wrap text-sm text-slate-800">
                {note.body}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{formatRelative(note.created_at)}</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-status-danger hover:underline"
                  onClick={async () => {
                    try {
                      await del.mutateAsync(note.id);
                      toast.success('Anotação removida');
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : 'Erro',
                      );
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  Excluir
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
