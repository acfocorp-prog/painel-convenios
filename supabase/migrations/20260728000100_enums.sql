-- Enums compartilhadas.

create type public.registro_tipo as enum (
  'CONVENIO',
  'SIMEC',
  'BIENIO',
  'MANDATO'
);

create type public.status_code as enum (
  'EM_ANDAMENTO',
  'ATRASADO',
  'CONCLUIDO',
  'CANCELADO'
);
