import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Save, AlertTriangle, ExternalLink } from 'lucide-react';
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
import { BankInfoFields } from './components/BankInfoFields';
import {
  useConvenio,
  useCreateConvenio,
  useUpdateConvenio,
} from '@/hooks/useConvenios';
import {
  useVerbaTipos,
  useStatusCatalog,
  type VerbaTipo,
} from '@/hooks/useLookups';
import { useEscolas } from '@/hooks/useEscolas';

const ALL = '__all__';

const schema = z.object({
  ref: z.string().trim().max(80).optional().or(z.literal('')),
  year: z
    .number({ invalid_type_error: 'Informe o ano' })
    .int()
    .min(2000)
    .max(2100),
  verba_tipo_id: z.string().uuid('Escolha uma verba'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  amount: z
    .union([z.number().nonnegative(), z.nan(), z.null()])
    .optional()
    .transform((v) => (Number.isNaN(v) || v === undefined ? null : v)),
  due_date: z.string().optional().or(z.literal('')),
  launched: z.boolean().default(false),
  escola_id: z.string().optional(),
  bank_branch: z.string().optional().or(z.literal('')),
  bank_account: z.string().optional().or(z.literal('')),
  process_link: z
    .string()
    .trim()
    .url('URL inválida')
    .optional()
    .or(z.literal('')),
  status_id: z.string().uuid(),
  priority: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

const EMPTY: FormData = {
  ref: '',
  year: new Date().getFullYear(),
  verba_tipo_id: '' as unknown as string,
  description: '',
  amount: null,
  due_date: '',
  launched: false,
  escola_id: ALL,
  bank_branch: '',
  bank_account: '',
  process_link: '',
  status_id: '' as unknown as string,
  priority: false,
  notes: '',
};

export function ConvenioFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: existing, isLoading } = useConvenio(id);
  const { data: verbaTipos } = useVerbaTipos();
  const { data: statusCatalog } = useStatusCatalog();
  const { data: escolas } = useEscolas();
  const create = useCreateConvenio();
  const update = useUpdateConvenio(id ?? '');

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
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (existing) {
      reset({
        ref: existing.ref ?? '',
        year: existing.year,
        verba_tipo_id: existing.verba_tipo_id,
        description: existing.description ?? '',
        amount: existing.amount,
        due_date: existing.due_date ?? '',
        launched: existing.launched,
        escola_id: existing.escola_id ?? ALL,
        bank_branch: existing.bank_branch ?? '',
        bank_account: existing.bank_account ?? '',
        process_link: existing.process_link ?? '',
        status_id: existing.status_id,
        priority: existing.priority,
        notes: existing.notes ?? '',
      });
    } else if (initialStatusId) {
      reset({ ...defaults, status_id: initialStatusId });
    }
  }, [existing, initialStatusId, reset, defaults]);

  const verbaSelecionada: VerbaTipo | undefined = verbaTipos?.find(
    (v) => v.id === watch('verba_tipo_id'),
  );
  const launched = watch('launched');
  const bankBranch = watch('bank_branch') ?? '';
  const bankAccount = watch('bank_account') ?? '';

  const [showBankWarning, setShowBankWarning] = useState(false);

  async function onSubmit(data: FormData) {
    setShowBankWarning(false);

    const basePayload = {
      ref: data.ref || null,
      year: data.year,
      verba_tipo_id: data.verba_tipo_id,
      description: data.description || null,
      amount: data.amount ?? null,
      due_date: data.due_date || null,
      launched: data.launched,
      launched_at: data.launched
        ? data.due_date || new Date().toISOString().slice(0, 10)
        : null,
      escola_id: data.escola_id && data.escola_id !== ALL ? data.escola_id : null,
      bank_branch: data.bank_branch || null,
      bank_account: data.bank_account || null,
      process_link: data.process_link || null,
      status_id: data.status_id,
      priority: data.priority,
      notes: data.notes || null,
    };

    try {
      if (isEditing) {
        await update.mutateAsync(basePayload);
        toast.success('Convênio atualizado');
        navigate(`/convenios/${id}`);
      } else {
        const created = await create.mutateAsync(basePayload);
        toast.success('Convênio cadastrado');
        navigate(`/convenios/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  function onSubmitWithWarnCheck(data: FormData) {
    if (
      data.launched &&
      verbaSelecionada?.requires_bank_info &&
      (!data.bank_branch?.trim() || !data.bank_account?.trim())
    ) {
      setShowBankWarning(true);
    }
    return handleSubmit(onSubmit)(data);
  }

  if (isEditing && isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <PageHeader
        title={isEditing ? 'Editar convênio' : 'Novo convênio'}
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
        {showBankWarning && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Você marcou como lançado sem agência/conta. Pode continuar,
              mas lembre-se de regularizar antes do envio do relatório.
            </span>
          </div>
        )}

        {/* Identificação */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="verba_tipo_id">Tipo de verba *</Label>
              <Controller
                control={control}
                name="verba_tipo_id"
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="verba_tipo_id">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {verbaTipos?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.verba_tipo_id && (
                <p className="text-xs text-status-danger">
                  {errors.verba_tipo_id.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="year">Ano *</Label>
                <Input
                  id="year"
                  type="number"
                  {...register('year', { valueAsNumber: true })}
                  aria-invalid={!!errors.year}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref">Referência</Label>
                <Input
                  id="ref"
                  placeholder="ex.: 001/2026"
                  {...register('ref')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Resumo do convênio"
                {...register('description')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Escola vinculada */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Escola (opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="escola_id">
                Vincular a uma escola
              </Label>
              <Controller
                control={control}
                name="escola_id"
                render={({ field }) => (
                  <Select
                    value={field.value || ALL}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="escola_id">
                      <SelectValue placeholder="Escolha (ou deixe em branco)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>
                        (Nenhuma — verba da secretaria)
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
                Use para verbas que vão direto para a conta da escola (ex.:
                PDDE).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Valores e prazo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Valores e prazo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
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
            </div>

            <Controller
              control={control}
              name="launched"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                  />
                  Lançado (já foi enviado para prestação de contas)
                </label>
              )}
            />

            {verbaSelecionada?.requires_bank_info && (
              <Controller
                control={control}
                name="bank_branch"
                render={({ field }) => (
                  <Controller
                    control={control}
                    name="bank_account"
                    render={({ field: fieldAccount }) => (
                      <BankInfoFields
                        bankBranch={field.value ?? ''}
                        bankAccount={fieldAccount.value ?? ''}
                        onBankBranchChange={field.onChange}
                        onBankAccountChange={fieldAccount.onChange}
                        launched={launched}
                      />
                    )}
                  />
                )}
              />
            )}
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

        {/* Anotações e processo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Anotações e processo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="process_link" className="flex items-center gap-1.5">
                Link do processo
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </Label>
              <Input
                id="process_link"
                type="url"
                placeholder="https://..."
                {...register('process_link')}
              />
              {errors.process_link && (
                <p className="text-xs text-status-danger">
                  {errors.process_link.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Anotações</Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Detalhes relevantes, contatos, histórico…"
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full"
          onClick={onSubmitWithWarnCheck}
          disabled={isSubmitting || create.isPending || update.isPending}
        >
          <Save className="h-4 w-4" />
          {isEditing ? 'Salvar alterações' : 'Cadastrar convênio'}
        </Button>
      </form>
    </div>
  );
}
