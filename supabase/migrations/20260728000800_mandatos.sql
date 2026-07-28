-- Mandato tampão — mandato interino de uma escola.

create table public.mandatos_tampao (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas (id),
  start_date date not null,
  end_date date not null,
  due_date date,
  status_id uuid not null references public.status_catalog (id),
  priority boolean not null default false,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint mandato_range_check check (end_date >= start_date)
);

create index mandatos_escola_idx on public.mandatos_tampao (escola_id);
create index mandatos_due_idx
  on public.mandatos_tampao (due_date)
  where deleted_at is null;
