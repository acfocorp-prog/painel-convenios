import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setState({ session, user: session?.user ?? null, isLoading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, user: session?.user ?? null, isLoading: false });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signInWithPassword(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
  ) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  }

  async function signOut() {
    return supabase.auth.signOut();
  }

  return {
    session: state.session,
    user: state.user,
    isLoading: state.isLoading,
    signInWithPassword,
    signUp,
    signOut,
  };
}
