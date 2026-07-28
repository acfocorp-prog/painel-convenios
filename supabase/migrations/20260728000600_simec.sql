-- Adesões a programas do SIMEC por escola.

create table public.simec_adhesions (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas (id),
  program text not null,
  year int not null,
  due_date date,
  status_id uuid not null references public.status_catalog (id),
  priority boolean not null default false,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint simec_year_check check (year between 2000 and 2100)
);

create index simec_escola_idx on public.simec_adhesions (escola_id);
create index simec_status_idx on public.simec_adhesions (status_id);
create index simec_due_idx
  on public.simec_adhesions (due_date)
  where deleted_at is null;
