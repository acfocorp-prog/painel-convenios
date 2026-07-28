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

const schema = z.object({
  inep: z
    .string()
    .trim()
    .min(8, 'INEP deve ter pelo menos 8 dígitos')
    .max(20, 'INEP muito longo')
    .regex(/^[\d.\-/]+$/, 'Use apenas números e separadores'),
  name: z.string().trim().min(2, 'Nome muito curto').max(200),
});

type FormData = z.infer<typeof schema>;

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
    defaultValues: { inep: '', name: '' },
  });

  useEffect(() => {
    if (escola) {
      reset({ inep: escola.inep, name: escola.name });
    }
  }, [escola, reset]);

  async function onSubmit(data: FormData) {
    try {
      if (isEditing) {
        await update.mutateAsync(data);
        toast.success('Escola atualizada');
        navigate(`/escolas/${id}`);
      } else {
        const created = await create.mutateAsync(data);
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

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 px-4"
      >
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
