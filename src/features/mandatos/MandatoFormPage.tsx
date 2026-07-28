import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  useMandatoById,
  useCreateMandato,
  useUpdateMandato,
} from '@/hooks/useMandatos';
import { useStatusCatalog } from '@/hooks/useLookups';
import { useEscolas } from '@/hooks/useEscolas';

const NONE = '__none__';

const schema = z
  .object({
    /**
     * Escola é OPCIONAL no mandato tampão: null = mandato da secretaria.
     * O form usa sentinel '__none__' pra Select funcionar; convertemos
     * pra null no submit.
     */
    escola_id: z
      .union([z.string().uuid('Escolha uma escola válida'), z.literal(NONE)])
      .optional(),
    start_date: z.string().min(1, 'Informe a data de início'),
    end_date: z.string().min(1, 'Informe a data de fim'),
    due_date: z.string().optional().or(z.literal('')),
    status_id: z.string().uuid(),
    priority: z.boolean().default(false),
    notes: z.string().trim().max(2000).optional().or(z.literal('')),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: 'Fim deve ser depois ou igual ao início',
    path: ['end_date'],
  });

type FormData = z.infer<typeof schema>;

const EMPTY: FormData = {
  escola_id: NONE,
  start_date: '',
  end_date: '',
  due_date: '',
  status_id: '' as unknown as string,
  priority: false,
  notes: '',
};

export function MandatoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: existing, isLoading } = useMandatoById(id);
  const { data: statusCatalog } = useStatusCatalog();
  const { data: escolas } = useEscolas();
  const create = useCreateMandato();
  const update = useUpdateMandato(id ?? '');

  const initialStatusId =
    statusCatalog?.find((s) => s.code === 'EM_ANDAMENTO')?.id ?? '';

  const defaults: FormData = useMemo(
    () => ({ ...EMPTY, status_id: initialStatusId }),
    [initialStatusId],
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (existing) {
      reset({
        escola_id: existing.escola_id ?? NONE,
        start_date: existing.start_date,
        end_date: existing.end_date,
        due_date: existing.due_date ?? '',
        status_id: existing.status_id,
        priority: existing.priority,
        notes: existing.notes ?? '',
      });
    } else if (initialStatusId) {
      reset({ ...defaults, status_id: initialStatusId });
    }
  }, [existing, initialStatusId, reset, defaults]);

  async function onSubmit(data: FormData) {
    // Converte sentinel pra null quando for mandato da secretaria
    const escolaId =
      !data.escola_id || data.escola_id === NONE ? null : data.escola_id;

    const basePayload = {
      escola_id: escolaId,
      start_date: data.start_date,
      end_date: data.end_date,
      due_date: data.due_date || null,
      status_id: data.status_id,
      priority: data.priority,
      notes: data.notes || null,
    };

    try {
      if (isEditing) {
        await update.mutateAsync(basePayload);
        toast.success('Mandato atualizado');
        navigate(`/mandatos/${id}`);
      } else {
        const created = await create.mutateAsync(basePayload);
        toast.success('Mandato cadastrado');
        navigate(`/mandatos/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  if (isEditing && isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <PageHeader
        title={isEditing ? 'Editar mandato' : 'Novo mandato'}
        action={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voltar"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 px-4 pb-6"
      >
        {/* Identificação */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="escola_id">Escola (opcional)</Label>
              <Controller
                control={control}
                name="escola_id"
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="escola_id">
                      <SelectValue placeholder="Escolha a escola" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>
                        (Nenhuma — mandato da secretaria)
                      </SelectItem>
                      {escolas?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} · INEP {e.inep}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-slate-500">
                Deixe em branco para registrar um mandato que cobre a
                secretaria inteira.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_date">Início *</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                  aria-invalid={!!errors.start_date}
                />
                {errors.start_date && (
                  <p className="text-xs text-status-danger">
                    {errors.start_date.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_date">Fim *</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                  aria-invalid={!!errors.end_date}
                />
                {errors.end_date && (
                  <p className="text-xs text-status-danger">
                    {errors.end_date.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prazo e status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Prazo e status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Prazo</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status_id">Status</Label>
              <Controller
                control={control}
                name="status_id"
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="status_id">
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
                )}
              />
            </div>

            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                  />
                  Marcar como urgente / prioridade
                </label>
              )}
            />
          </CardContent>
        </Card>

        {/* Anotações */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Anotações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              rows={4}
              placeholder="Detalhes relevantes, contatos, histórico…"
              {...register('notes')}
            />
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || create.isPending || update.isPending}
        >
          <Save className="h-4 w-4" />
          {isEditing ? 'Salvar alterações' : 'Cadastrar mandato'}
        </Button>
      </form>
    </div>
  );
}
