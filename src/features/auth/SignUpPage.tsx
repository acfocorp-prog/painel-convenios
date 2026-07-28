import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function SignUpPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha precisa ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (error) {
      toast.error('Não foi possível criar a conta', {
        description: error.message,
      });
      return;
    }

    toast.success('Conta criada', {
      description: 'Você já pode entrar.',
    });
    navigate('/signin', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-card">
            <span className="text-xl font-bold">PC</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Criar conta
          </h1>
          <p className="text-sm text-slate-500">
            Para uso da Secretaria de Educação
          </p>
        </div>

        <Card>
          <CardContent className="pt-4">
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@municipio.gov.br"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha (mín. 6 caracteres)</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Criando…' : 'Criar conta'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-600">
          Já tem conta?{' '}
          <Link
            to="/signin"
            className="font-medium text-brand-700 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
