-- Modelos de mensagem (placeholders {{escola_nome}} {{prazo}} etc.).

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
