import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function SignInPage() {
  const navigate = useNavigate();
  const { signInWithPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithPassword(email.trim(), password);
    setLoading(false);

    if (error) {
      toast.error('Não foi possível entrar', {
        description: error.message,
      });
      return;
    }
    toast.success('Bem-vinda!');
    navigate('/overview', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-card">
            <span className="text-xl font-bold">PC</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Painel de Convênios
          </h1>
          <p className="text-sm text-slate-500">Secretaria de Educação</p>
        </div>

        <Card>
          <CardContent className="pt-4">
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@municipio.gov.br"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-600">
          Ainda não tem conta?{' '}
          <Link
            to="/signup"
            className="font-medium text-brand-700 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
