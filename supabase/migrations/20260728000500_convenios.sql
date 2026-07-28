-- Convênios — tabela flagship.
-- Regra de negócio: alguns convênios têm escola vinculada (vão direto pra conta da escola —
-- ex.: PDDE), outros ficam só com a verba (são da secretaria e ela presta contas).
-- Quando requires_bank_info da verba é true, lançamentos exigem bank_branch + bank_account.

create table public.convenios (
  id uuid primary key default gen_random_uuid(),
  ref text,
  year int not null,
  verba_tipo_id uuid not null references public.verba_tipos (id),
  description text,
  amount numeric(14, 2),
  due_date date,
  launched boolean not null default false,
  launched_at date,
  status_id uuid not null references public.status_catalog (id),
  priority boolean not null default false,
  notes text,
  -- Quando a verba vai direto pra escola (ex.: PDDE), vinculamos a escola aqui.
  -- Quando é da secretaria (ex.: Fundeb), fica null.
  escola_id uuid references public.escolas (id),
  bank_branch text,
  bank_account text,
  process_link text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint convenios_year_check check (year between 2000 and 2100)
);

create index convenios_year_idx on public.convenios (year);
create index convenios_status_idx on public.convenios (status_id);
create index convenios_verba_tipo_idx on public.convenios (verba_tipo_id);
create index convenios_escola_idx on public.convenios (escola_id);

-- Otimiza a Visão Geral: prazos abertos (não terminais).
create index convenios_due_open_idx
  on public.convenios (due_date)
  where deleted_at is null;
