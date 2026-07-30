import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  useCreateEscola,
  useEscola,
  useUpdateEscola,
} from '@/hooks/useEscolas';

// Aceita ISO date (yyyy-mm-dd) OU formato BR (dd/mm/yyyy). Vazio → null.
const dateFlex = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((v) => {
    if (!v) return null;
    // dd/mm/yyyy
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    // yyyy-mm-dd (ou ISO completo)
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    // tentativa genérica
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  });

const schema = z.object({
  inep: z
    .string()
    .trim()
    .min(8, 'INEP deve ter pelo menos 8 dígitos')
    .max(20, 'INEP muito longo')
    .regex(/^[\d.\-/]+$/, 'Use apenas números e separadores'),
  name: z.string().trim().min(2, 'Nome muito curto').max(200),
  // Campos opcionais (modelo FNDE) — todos string vazia quando não preenchidos.
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .max(120)
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  cnpj_eex: z.string().trim().max(20).optional().or(z.literal('')),
  cnpj_uex: z.string().trim().max(20).optional().or(z.literal('')),
  rede_atendimento: z.string().trim().max(40).optional().or(z.literal('')),
  localizacao: z.string().trim().max(40).optional().or(z.literal('')),
  mandato_dirigente: z.string().trim().max(40).optional().or(z.literal('')),
  data_fim_mandato: dateFlex,
});

type FormData = z.infer<typeof schema>;

const EMPTY_DEFAULTS: FormData = {
  inep: '',
  name: '',
  phone: '',
  email: '',
  cnpj_eex: '',
  cnpj_uex: '',
  rede_atendimento: '',
  localizacao: '',
  mandato_dirigente: '',
  data_fim_mandato: '',
};

export function EscolaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: escola, isLoading } = useEscola(id);
  const create = useCreateEscola();
  const update = useUpdateEscola(id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (escola) {
      reset({
        inep: escola.inep,
        name: escola.name,
        phone: escola.phone ?? '',
        email: escola.email ?? '',
        cnpj_eex: escola.cnpj_eex ?? '',
        cnpj_uex: escola.cnpj_uex ?? '',
        rede_atendimento: escola.rede_atendimento ?? '',
        localizacao: escola.localizacao ?? '',
        mandato_dirigente: escola.mandato_dirigente ?? '',
        data_fim_mandato: escola.data_fim_mandato ?? '',
      });
    }
  }, [escola, reset]);

  /** Converte string vazia do form em null antes de mandar pro Supabase. */
  function emptyToNull(s: string | null | undefined): string | null {
    if (s === null || s === undefined) return null;
    const t = s.trim();
    return t === '' ? null : t;
  }

  async function onSubmit(data: FormData) {
    try {
      const payload = {
        inep: data.inep,
        name: data.name,
        phone: emptyToNull(data.phone),
        email: emptyToNull(data.email),
        cnpj_eex: emptyToNull(data.cnpj_eex),
        cnpj_uex: emptyToNull(data.cnpj_uex),
        rede_atendimento: emptyToNull(data.rede_atendimento),
        localizacao: emptyToNull(data.localizacao),
        mandato_dirigente: emptyToNull(data.mandato_dirigente),
        data_fim_mandato: data.data_fim_mandato ?? null,
      };

      if (isEditing) {
        await update.mutateAsync(payload);
        toast.success('Escola atualizada');
        navigate(`/escolas/${id}`);
      } else {
        const created = await create.mutateAsync(payload);
        toast.success('Escola cadastrada');
        navigate(`/escolas/${created.id}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      if (msg.toLowerCase().includes('duplicate') || msg.includes('escolas_inep_active_uidx')) {
        toast.error('Já existe uma escola com esse INEP');
      } else {
        toast.error(msg);
      }
    }
  }

  return (
    <div className="space-y-2">
      <PageHeader
        title={isEditing ? 'Editar escola' : 'Nova escola'}
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

      {isEditing && isLoading && <LoadingSpinner />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4">
        <div className="space-y-1.5">
          <Label htmlFor="inep">Código INEP</Label>
          <Input
            id="inep"
            inputMode="numeric"
            placeholder="12345678"
            aria-invalid={!!errors.inep}
            {...register('inep')}
          />
          {errors.inep && (
            <p className="text-xs text-status-danger">{errors.inep.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Nome da escola</Label>
          <Input
            id="name"
            placeholder="Ex.: EMEF Tarsila do Amaral"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-status-danger">{errors.name.message}</p>
          )}
        </div>

        <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <summary className="cursor-pointer select-none font-medium text-slate-800">
            Dados adicionais (opcional — modelo FNDE)
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-slate-500">
              Preencha apenas se vier do relatório "Situação Cadastral das
              Entidades" do FNDE. Todos os campos são opcionais.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  placeholder="(21) 9706-3687"
                  {...register('phone')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  placeholder="escola@prefeitura.gov.br"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-status-danger">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cnpj_eex">CNPJ EEX</Label>
                <Input id="cnpj_eex" placeholder="00.000.000/0000-00" {...register('cnpj_eex')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cnpj_uex">CNPJ UEX</Label>
                <Input id="cnpj_uex" placeholder="00.000.000/0000-00" {...register('cnpj_uex')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rede_atendimento">Rede de Atendimento</Label>
                <Input
                  id="rede_atendimento"
                  placeholder="Ex.: MUNICIPAL"
                  {...register('rede_atendimento')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  placeholder="Urbana / Rural"
                  {...register('localizacao')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mandato_dirigente">Mandato Dirigente</Label>
                <Input
                  id="mandato_dirigente"
                  placeholder="Ex.: VIGENTE"
                  {...register('mandato_dirigente')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="data_fim_mandato">Data Fim do Mandato</Label>
                <Input
                  id="data_fim_mandato"
                  type="date"
                  {...register('data_fim_mandato')}
                />
              </div>
            </div>
          </div>
        </details>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || create.isPending || update.isPending}
        >
          <Save className="h-4 w-4" />
          {isEditing ? 'Salvar alterações' : 'Cadastrar escola'}
        </Button>
      </form>
    </div>
  );
}
