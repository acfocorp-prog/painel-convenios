-- Links de processo por registro (URL externa — SEI, gov.br, etc.).

create table public.process_links (
  id uuid primary key default gen_random_uuid(),
  registro_tipo public.registro_tipo not null,
  registro_id uuid not null,
  url text not null,
  label text,
  added_by uuid references auth.users (id),
  added_at timestamptz not null default now()
);

create index process_links_lookup_idx
  on public.process_links (registro_tipo, registro_id);
