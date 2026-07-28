import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Erro bem visível durante o dev — variáveis faltando.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Faltando VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env.local',
  );
}

export const supabase = createClient<Database>(
  url ?? 'http://localhost',
  anonKey ?? 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'painel-convenios-auth',
    },
  },
);

/** Helper para tipar selects mais estritos (ainda não geramos os tipos completos). */
export function assertSupabaseConfigured() {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local',
    );
  }
}
