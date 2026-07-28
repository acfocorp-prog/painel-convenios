-- Diário por escola — anotações livres.

create table public.school_notes (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas (id) on delete cascade,
  body text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index school_notes_escola_idx
  on public.school_notes (escola_id, created_at desc);
