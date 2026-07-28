import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Wrapper auth-gated. Redireciona pra /signin se não tiver sessão.
 * Renderiza TopBar + conteúdo + BottomNav fixa.
 */
export function AppShell() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { data: profile, isLoading: loadingProfile, error } = useProfile();
  // Realtime: 1 channel global, invalida queries automaticamente quando
  // outra pessoa cadastra/alterar/exclui algo. Sem polling, sem refetch manual.
  useRealtimeInvalidation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/signin', { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading || (user && loadingProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Se logado mas sem profile, deixa carregar perfil para evitar piscar.
  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <TopBar />
      <main className="flex-1 pb-20">
        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Não foi possível carregar seu perfil. Recarregue a página.
          </div>
        )}
        {profile && <Outlet context={{ profile }} />}
      </main>
      <BottomNav />
    </div>
  );
}

export type AppOutletContext = {
  profile: NonNullable<ReturnType<typeof useProfile>['data']>;
};
