-- Anexos — placeholder para fase futura (upload no Storage).
-- Mantém a estrutura criada pra não invalidar joins já escritos.

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  registro_tipo public.registro_tipo not null,
  registro_id uuid not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users (id),
  uploaded_at timestamptz not null default now()
);

create index attachments_lookup_idx
  on public.attachments (registro_tipo, registro_id);
