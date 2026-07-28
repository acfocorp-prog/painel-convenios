/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Tipos que o Supabase JS devolve quando uma coluna referenciada não existe
// no Database type (acontece em queries com joins de tabelas sem tipagem gerada).
declare namespace ts {
  interface SelectQueryError<M extends string> {
    error: true;
    message: M;
  }
}

export {};
