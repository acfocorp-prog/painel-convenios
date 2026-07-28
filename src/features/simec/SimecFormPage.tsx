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
import { SimecProgramSelect } from './components/SimecProgramSelect';
import {
  useSimecById,
  useCreateSimec,
  useUpdateSimec,
} from '@/hooks/useSimec';
import { useStatusCatalog } from '@/hooks/useLookups';
import { useEscolas } from '@/hooks/useEscolas';

const schema = z.object({
  program: z.string().trim().min(1, 'Informe o programa').max(80),
  year: z
    .number({ invalid_type_error: 'Informe o ano' })
    .int()
    .min(2000)
    .max(2100),
  escola_id: z.string().uuid('Escolha uma escola'),
  due_date: z.string().optional().or(z.literal('')),
  status_id: z.string().uuid(),
  priority: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

const EMPTY: FormData = {
  program: '',
  year: new Date().getFullYear(),
  escola_id: '' as unknown as string,
  due_date: '',
  status_id: '' as unknown as string,
  priority: false,
  notes: '',
};

export function SimecFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: existing, isLoading } = useSimecById(id);
  const { data: statusCatalog } = useStatusCatalog();
  const { data: escolas } = useEscolas();
  const create = useCreateSimec();
  const update = useUpdateSimec(id ?? '');

  const initialStatusId =
    statusCatalog?.find((s) => s.code === 'EM_ANDAMENTO')?.id ?? '';

  const defaults: FormData = useMemo(
    () => ({
      ...EMPTY,
      year: new Date().getFullYear(),
      status_id: initialStatusId,
    }),
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
        program: existing.program,
        year: existing.year,
        escola_id: existing.escola_id,
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
    const basePayload = {
      program: data.program.trim(),
      year: data.year,
      escola_id: data.escola_id,
      due_date: data.due_date || null,
      status_id: data.status_id,
      priority: data.priority,
      notes: data.notes || null,
    };

    try {
      if (isEditing) {
        await update.mutateAsync(basePayload);
        toast.success('Adesão atualizada');
        navigate(`/simec/${id}`);
      } else {
        const created = await create.mutateAsync(basePayload);
        toast.success('Adesão cadastrada');
        navigate(`/simec/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  if (isEditing && isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <PageHeader
        title={isEditing ? 'Editar adesão' : 'Nova adesão'}
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
            <Controller
              control={control}
              name="program"
              render={({ field }) => (
                <SimecProgramSelect
                  id="program"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.program && (
              <p className="text-xs text-status-danger">
                {errors.program.message}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="year">Ano *</Label>
              <Input
                id="year"
                type="number"
                {...register('year', { valueAsNumber: true })}
                aria-invalid={!!errors.year}
              />
              {errors.year && (
                <p className="text-xs text-status-danger">
                  {errors.year.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Escola vinculada */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Escola *</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="escola_id"
              render={({ field }) => (
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="escola_id">
                    <SelectValue placeholder="Escolha a escola" />
                  </SelectTrigger>
                  <SelectContent>
                    {escolas?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} · INEP {e.inep}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.escola_id && (
              <p className="text-xs text-status-danger">
                {errors.escola_id.message}
              </p>
            )}
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
          {isEditing ? 'Salvar alterações' : 'Cadastrar adesão'}
        </Button>
      </form>
    </div>
  );
}
