-- Histórico polimórfico de status.
-- Aplicado a convênios, SIMEC, biênios e mandatos.

create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  registro_tipo public.registro_tipo not null,
  registro_id uuid not null,
  old_status_id uuid references public.status_catalog (id),
  new_status_id uuid not null references public.status_catalog (id),
  comment text,
  changed_by uuid not null references auth.users (id),
  changed_at timestamptz not null default now()
);

create index status_history_lookup_idx
  on public.status_history (registro_tipo, registro_id, changed_at desc);
