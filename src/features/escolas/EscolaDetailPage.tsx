import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/records/StatusBadge';
import { DueDateBadge } from '@/components/records/DueDateBadge';
import {
  useDeleteSchoolNote,
  useCreateSchoolNote,
  useEscola,
  useSchoolNotes,
  useUpdateEscola,
} from '@/hooks/useEscolas';
import { useEscolaRecords } from '@/hooks/useEscolaRecords';
import type { ConvenioRow } from '@/hooks/useConvenios';
import type { SimecRow } from '@/hooks/useSimec';
import type { BienioRow } from '@/hooks/useBienios';
import type { MandatoRow } from '@/hooks/useMandatos';
import { cn, formatCNPJ, formatDate, formatPhone, formatRelative } from '@/lib/utils';

const PREVIEW_LIMIT = 5;

export function EscolaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: escola, isLoading } = useEscola(id);
  const records = useEscolaRecords(id);

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

      <DadosAdicionais escola={escola} />

      <SectionConvenios items={records.convenios} />
      <SectionSimec items={records.simec} />
      <SectionBienios items={records.bienios} />
      <SectionMandatos items={records.mandatos} />

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

/** Card com os campos opcionais do modelo FNDE (só renderiza se algum estiver preenchido). */
function DadosAdicionais({ escola }: { escola: NonNullable<ReturnType<typeof useEscola>['data']> }) {
  const fields: Array<{ label: string; value: string }> = [];
  if (escola.phone) fields.push({ label: 'Telefone', value: formatPhone(escola.phone) });
  if (escola.email) fields.push({ label: 'Email', value: escola.email });
  if (escola.cnpj_eex) fields.push({ label: 'CNPJ EEX', value: formatCNPJ(escola.cnpj_eex) });
  if (escola.cnpj_uex) fields.push({ label: 'CNPJ UEX', value: formatCNPJ(escola.cnpj_uex) });
  if (escola.rede_atendimento)
    fields.push({ label: 'Rede', value: escola.rede_atendimento });
  if (escola.localizacao) fields.push({ label: 'Localização', value: escola.localizacao });
  if (escola.mandato_dirigente)
    fields.push({ label: 'Mandato', value: escola.mandato_dirigente });
  if (escola.data_fim_mandato)
    fields.push({ label: 'Fim do mandato', value: formatDate(escola.data_fim_mandato) });

  if (fields.length === 0) return null;

  return (
    <Card className="p-3">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">
        Dados adicionais
      </h2>
      <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              {f.label}
            </dt>
            <dd className="truncate text-sm text-slate-800" title={f.value}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

// ── Seções por módulo ──────────────────────────────────────────────

function SectionConvenios({ items }: { items: ConvenioRow[] }) {
  const preview = items.slice(0, PREVIEW_LIMIT);
  return (
    <Section
      titulo="Convênios desta escola"
      total={items.length}
      emptyHint="Nenhum convênio vinculado a esta escola."
      ctaAdd={
        <Link to="/convenios/novo">
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </Link>
      }
    >
      {preview.map((c) => (
        <Link
          key={c.id}
          to={`/convenios/${c.id}`}
          className="block active:scale-[0.99]"
        >
          <Card className="p-3 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {c.ref || c.description || 'Convênio'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.verba_tipos?.label ?? '—'} · {c.year}
                  {c.due_date && ` · prazo ${formatDate(c.due_date)}`}
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
      ))}
    </Section>
  );
}

function SectionSimec({ items }: { items: SimecRow[] }) {
  const preview = items.slice(0, PREVIEW_LIMIT);
  return (
    <Section
      titulo="SIMEC desta escola"
      total={items.length}
      emptyHint="Nenhuma adesão SIMEC cadastrada."
      ctaAdd={
        <Link to="/simec/novo">
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </Link>
      }
    >
      {preview.map((s) => (
        <Link
          key={s.id}
          to={`/simec/${s.id}`}
          className="block active:scale-[0.99]"
        >
          <Card className="p-3 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {s.program}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {s.year}
                  {s.due_date && ` · prazo ${formatDate(s.due_date)}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge code={s.status_catalog?.code} />
                <DueDateBadge
                  dueDate={s.due_date}
                  statusCode={s.status_catalog?.code}
                />
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </Section>
  );
}

function SectionBienios({ items }: { items: BienioRow[] }) {
  const preview = items.slice(0, PREVIEW_LIMIT);
  return (
    <Section
      titulo="Biênios desta escola"
      total={items.length}
      emptyHint="Nenhum biênio cadastrado."
      ctaAdd={
        <Link to="/bienios/novo">
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </Link>
      }
    >
      {preview.map((b) => (
        <Link
          key={b.id}
          to={`/bienios/${b.id}`}
          className="block active:scale-[0.99]"
        >
          <Card className="p-3 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  Biênio {b.start_year}/{b.end_year}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  {b.notary_validated && (
                    <Badge variant="ok">✓ cartório</Badge>
                  )}
                  {b.due_date && <span>· prazo {formatDate(b.due_date)}</span>}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge code={b.status_catalog?.code} />
                <DueDateBadge
                  dueDate={b.due_date}
                  statusCode={b.status_catalog?.code}
                />
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </Section>
  );
}

function SectionMandatos({ items }: { items: MandatoRow[] }) {
  if (items.length === 0) return null;
  const preview = items.slice(0, PREVIEW_LIMIT);
  return (
    <Section
      titulo="Mandatos desta escola"
      total={items.length}
      emptyHint=""
    >
      {preview.map((m) => (
        <Link
          key={m.id}
          to={`/mandatos/${m.id}`}
          className="block active:scale-[0.99]"
        >
          <Card className="p-3 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  Mandato tampão
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDate(m.start_date)} → {formatDate(m.end_date)}
                  {m.due_date && ` · prazo ${formatDate(m.due_date)}`}
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
      ))}
    </Section>
  );
}

function Section({
  titulo,
  total,
  emptyHint,
  ctaAdd,
  children,
}: {
  titulo: string;
  total: number;
  emptyHint: string;
  ctaAdd?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          {titulo}{' '}
          <Badge variant="neutral" className="ml-1">
            {total}
          </Badge>
        </h2>
        {ctaAdd}
      </div>
      {total === 0 ? (
        <Card className="p-3">
          <p className="text-center text-xs text-slate-500">{emptyHint}</p>
        </Card>
      ) : (
        <ul className={cn('space-y-2')}>{children}</ul>
      )}
    </section>
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