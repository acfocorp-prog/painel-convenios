-- Cadastro mestre de escolas.
-- INEP é o identificador federal único no Brasil (8 dígitos para escola).
-- last_movement_at é atualizado via trigger quando qualquer convênio/SIMEC/biênio/mandato mudar.

create table public.escolas (
  id uuid primary key default gen_random_uuid(),
  inep text not null,
  name text not null,
  active boolean not null default true,
  last_movement_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- INEP único apenas entre escolas ativas (não-deleted).
create unique index escolas_inep_active_uidx
  on public.escolas (inep)
  where deleted_at is null;

create index escolas_name_trgm_idx
  on public.escolas using gin (name gin_trgm_ops)
  where deleted_at is null;

create index escolas_last_movement_idx
  on public.escolas (last_movement_at)
  where deleted_at is null and active = true;
