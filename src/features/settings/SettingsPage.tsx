import { useState } from 'react';
import { toast } from 'sonner';
import {
  Database,
  Download,
  FileSpreadsheet,
  Mail,
  Settings as SettingsIcon,
  ShieldAlert,
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

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Configurações"
        description="Backup, modelos de mensagem e preferências."
      />

      <div className="space-y-3 px-4">
        <BackupCard />
        <ImportEscolasHint />
        <MessageTemplatesPlaceholder />
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

function MessageTemplatesPlaceholder() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-brand-700" />
          Modelos de mensagem
          <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
            Em breve
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Placeholders como <code>{'{{escola_nome}}'}</code> e{' '}
          <code>{'{{prazo}}'}</code> substituem valores reais ao enviar mensagem
          para a escola.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="tmpl_title">Título do modelo</Label>
          <Input
            id="tmpl_title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Lembrete de prestação de contas"
            disabled
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
            disabled
          />
        </div>
        <Button disabled className="w-full">
          Salvar modelo
        </Button>
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
              <dd className="font-medium text-slate-900">
                {profile.full_name}
              </dd>
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

export const SettingsShieldIcon = ShieldAlert;