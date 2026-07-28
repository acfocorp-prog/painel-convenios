import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
};

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;
      // Trigger handle_new_user cria o profile em background. Caso ainda
      // não exista (raro), cria com base no auth.users.
      if (!data) {
        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .upsert({
            id: user!.id,
            full_name:
              (user!.user_metadata?.full_name as string | undefined) ??
              user!.email ??
              'Usuário',
            email: user!.email ?? '',
          })
          .select()
          .single();
        if (createErr) throw createErr;
        return created as Profile;
      }

      return data as Profile;
    },
    staleTime: 5 * 60_000,
  });
}
