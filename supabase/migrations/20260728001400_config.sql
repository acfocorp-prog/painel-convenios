-- Configurações chave/valor lidas pelo app (dias de antecedência, etc.).

create table public.config (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
