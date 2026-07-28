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
  useBienioById,
  useCreateBienio,
  useUpdateBienio,
} from '@/hooks/useBienios';
import { useStatusCatalog } from '@/hooks/useLookups';
import { useEscolas } from '@/hooks/useEscolas';

const schema = z
  .object({
    escola_id: z.string().uuid('Escolha uma escola'),
    start_year: z
      .number({ invalid_type_error: 'Informe o ano inicial' })
      .int()
      .min(2000)
      .max(2100),
    end_year: z
      .number({ invalid_type_error: 'Informe o ano final' })
      .int()
      .min(2000)
      .max(2100),
    due_date: z.string().optional().or(z.literal('')),
    ata_signed_at: z.string().optional().or(z.literal('')),
    notary_validated: z.boolean().default(false),
    status_id: z.string().uuid(),
    priority: z.boolean().default(false),
    notes: z.string().trim().max(2000).optional().or(z.literal('')),
  })
  .refine((d) => d.end_year === d.start_year + 1, {
    message: 'Biênio sempre cobre 2 anos consecutivos (ex.: 2026–2027)',
    path: ['end_year'],
  });

type FormData = z.infer<typeof schema>;

const EMPTY: FormData = {
  escola_id: '' as unknown as string,
  start_year: new Date().getFullYear(),
  end_year: new Date().getFullYear() + 1,
  due_date: '',
  ata_signed_at: '',
  notary_validated: false,
  status_id: '' as unknown as string,
  priority: false,
  notes: '',
};

export function BienioFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: existing, isLoading } = useBienioById(id);
  const { data: statusCatalog } = useStatusCatalog();
  const { data: escolas } = useEscolas();
  const create = useCreateBienio();
  const update = useUpdateBienio(id ?? '');

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
        escola_id: existing.escola_id,
        start_year: existing.start_year,
        end_year: existing.end_year,
        due_date: existing.due_date ?? '',
        ata_signed_at: existing.ata_signed_at ?? '',
        notary_validated: existing.notary_validated,
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
      escola_id: data.escola_id,
      start_year: data.start_year,
      end_year: data.end_year,
      due_date: data.due_date || null,
      ata_signed_at: data.ata_signed_at || null,
      notary_validated: data.notary_validated,
      notary_validation_date: data.notary_validated
        ? new Date().toISOString().slice(0, 10)
        : null,
      status_id: data.status_id,
      priority: data.priority,
      notes: data.notes || null,
    };

    try {
      if (isEditing) {
        await update.mutateAsync(basePayload);
        toast.success('Biênio atualizado');
        navigate(`/bienios/${id}`);
      } else {
        const created = await create.mutateAsync(basePayload);
        toast.success('Biênio cadastrado');
        navigate(`/bienios/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  if (isEditing && isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <PageHeader
        title={isEditing ? 'Editar biênio' : 'Novo biênio'}
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
              <Label htmlFor="escola_id">Escola *</Label>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_year">Início *</Label>
                <Input
                  id="start_year"
                  type="number"
                  {...register('start_year', { valueAsNumber: true })}
                  aria-invalid={!!errors.start_year}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_year">Fim *</Label>
                <Input
                  id="end_year"
                  type="number"
                  {...register('end_year', { valueAsNumber: true })}
                  aria-invalid={!!errors.end_year}
                />
                {errors.end_year && (
                  <p className="text-xs text-status-danger">
                    {errors.end_year.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Datas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ata_signed_at">Data da ata</Label>
              <Input
                id="ata_signed_at"
                type="date"
                {...register('ata_signed_at')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Prazo</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Validação cartório */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Validação cartório</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="notary_validated"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                  />
                  Validado no cartório
                </label>
              )}
            />
            <p className="mt-2 text-xs text-slate-500">
              Ao marcar, o biênio é concluído automaticamente (use o botão
              "Validar no cartório" no detalhe pra registrar a data de hoje).
            </p>
          </CardContent>
        </Card>

        {/* Status e prioridade */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Status e prioridade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          {isEditing ? 'Salvar alterações' : 'Cadastrar biênio'}
        </Button>
      </form>
    </div>
  );
}
