import { useState } from 'react';
import { toast } from 'sonner';
import {
  Database,
  Download,
  FileSpreadsheet,
  Mail,
  Plus,
  Settings as SettingsIcon,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { downloadJsonBackup } from '@/lib/backup';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import {
  useMessageTemplates,
  useCreateMessageTemplate,
  useDeleteMessageTemplate,
  renderTemplate,
} from '@/hooks/useMessageTemplates';
import { formatRelative } from '@/lib/utils';

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Configurações"
        description="Backup, modelos de mensagem e preferências."
      />

      <div className="space-y-3 px-4">
        <BackupCard />
        <MessageTemplatesCard />
        <ImportEscolasHint />
        <ProfileCard />
      </div>
    </div>
  );
}

function BackupCard() {
  const [running, setRunning] = useState(false);
  const [lastBackup, setLastBackup] = useState<{
    filename: string;
    bytes: number;
  } | null>(null);

  async function onBackup() {
    setRunning(true);
    try {
      const r = await downloadJsonBackup();
      setLastBackup(r);
      toast.success(`Backup baixado: ${r.filename}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar backup');
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-4 w-4 text-brand-700" />
          Backup completo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-slate-600">
          Baixa um arquivo JSON com todas as tabelas (escolas, convênios,
          SIMEC, biênios, mandatos, histórico de status, perfis). Útil para
          guardar uma cópia offline ou restaurar em outra instalação.
        </p>
        <p className="text-xs text-slate-500">
          Anexos (PDFs, fotos) não são incluídos — só metadados ficam.
        </p>
        <Button onClick={onBackup} disabled={running} className="w-full">
          <Download className="h-4 w-4" />
          {running ? 'Gerando…' : 'Baixar backup agora'}
        </Button>
        {lastBackup && (
          <p className="text-xs text-slate-500">
            Último backup: <strong>{lastBackup.filename}</strong> (
            {(lastBackup.bytes / 1024).toFixed(1)} KB)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MessageTemplatesCard() {
  const { data: templates, isLoading } = useMessageTemplates();
  const create = useCreateMessageTemplate();
  const del = useDeleteMessageTemplate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Preview usa uma escola fictícia pra mostrar placeholders funcionando
  const preview = renderTemplate(body, {
    escola_nome: 'Escola Municipal Modelo',
    escola_inep: '12345678',
    prazo: '31/12/2026',
    data_hoje: new Date().toLocaleDateString('pt-BR'),
    secretaria: 'Secretaria Municipal de Educação',
  });

  async function onCreate() {
    if (!title.trim() || !body.trim()) {
      toast.error('Preencha título e corpo do modelo');
      return;
    }
    try {
      await create.mutateAsync({ title, body });
      setTitle('');
      setBody('');
      toast.success('Modelo salvo');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-brand-700" />
          Modelos de mensagem
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">
          Placeholders: <code>{'{{escola_nome}}'}</code>,{' '}
          <code>{'{{escola_inep}}'}</code>, <code>{'{{prazo}}'}</code>,{' '}
          <code>{'{{data_hoje}}'}</code>, <code>{'{{secretaria}}'}</code>
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="tmpl_title">Título</Label>
          <Input
            id="tmpl_title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Lembrete de prestação de contas"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tmpl_body">Corpo</Label>
          <Textarea
            id="tmpl_body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Olá {{escola_nome}}, lembramos que o prazo para…"
            rows={4}
          />
        </div>

        {body.trim() && (
          <div className="rounded-xl bg-slate-50 p-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              Preview
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700">
              {preview}
            </p>
          </div>
        )}

        <Button onClick={onCreate} disabled={create.isPending} className="w-full">
          <Plus className="h-4 w-4" />
          Salvar modelo
        </Button>

        {isLoading && <LoadingSpinner />}

        {templates && templates.length > 0 && (
          <ul className="mt-2 space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{t.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {t.body}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {formatRelative(t.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-status-danger hover:underline"
                  onClick={async () => {
                    if (!confirm(`Excluir o modelo "${t.title}"?`)) return;
                    try {
                      await del.mutateAsync(t.id);
                      toast.success('Modelo excluído');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Erro');
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ImportEscolasHint() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-brand-700" />
          Importar escolas em massa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">
          Vá até a lista de escolas e clique em <strong>Importar planilha</strong>.
          Aceita arquivos .xlsx com colunas <em>INEP</em>, <em>Nome</em> e
          opcional <em>Ativo</em>. Linhas com INEP já existente são puladas.
        </p>
      </CardContent>
    </Card>
  );
}

function ProfileCard() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  if (!user) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-brand-700" />
          Minha conta
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingSpinner />}
        {profile && (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Nome</dt>
              <dd className="font-medium text-slate-900">{profile.full_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{profile.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Função</dt>
              <dd className="font-medium text-slate-900">
                {profile.role === 'admin' ? 'Administrador' : 'Usuário'}
              </dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}