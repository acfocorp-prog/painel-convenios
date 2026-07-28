-- Biênio — controle bienal da escola (ata → cartório).

create table public.bienios (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas (id),
  start_year int not null,
  end_year int not null,
  due_date date,
  ata_signed_at date,
  notary_validated boolean not null default false,
  notary_validation_date date,
  status_id uuid not null references public.status_catalog (id),
  priority boolean not null default false,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint bienio_years_check check (end_year = start_year + 1),
  constraint bienio_years_range check (start_year between 2000 and 2100)
);

-- Um único biênio por escola/intervalo.
create unique index bienios_unique_period_uidx
  on public.bienios (escola_id, start_year, end_year)
  where deleted_at is null;

create index bienios_escola_idx on public.bienios (escola_id);
create index bienios_due_idx
  on public.bienios (due_date)
  where deleted_at is null;
