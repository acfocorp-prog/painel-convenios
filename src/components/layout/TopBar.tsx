import { LogOut, Settings as SettingsIcon, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { initialsOf } from '@/lib/utils';
import { OfficialDeadlinesBell } from './OfficialDeadlinesBell';

export function TopBar() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();

  const name = profile?.full_name ?? 'Carregando…';

  async function handleSignOut() {
    await signOut();
    navigate('/signin', { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-sm font-semibold text-white">
          {initialsOf(name)}
        </div>
        <div className="leading-tight">
          <p className="text-xs text-slate-500">Olá,</p>
          <p className="text-sm font-semibold text-slate-900 truncate max-w-[160px]">
            {name.split(' ')[0] ?? 'usuária'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <OfficialDeadlinesBell />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Meu perfil"
          onClick={() => navigate('/escolas')}
        >
          <UserIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Configurações"
          onClick={() => navigate('/settings')}
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sair"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
