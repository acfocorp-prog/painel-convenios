-- Tabelas de domínio (lookups).

create table public.verba_tipos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  -- Quando true, o form de convênio exige campos bancários (agência + conta).
  -- Aplicado a verbas da secretaria (Fundeb, Pnae, Pnat...).
  -- Verbas que vão direto para a escola (PDDE, etc.) ficam com false.
  requires_bank_info boolean not null default true,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.verba_tipos is 'Tipos de verba (Fundeb, Pnae, Pnat, PDDE, ...).';
comment on column public.verba_tipos.requires_bank_info is 'Se true, convênio exige agência+conta da secretaria (verbas da própria secretaria).';

create table public.status_catalog (
  id uuid primary key default gen_random_uuid(),
  code public.status_code not null unique,
  label text not null,
  -- Cor semântica básica: 'green' | 'yellow' | 'red' | 'gray'
  color text not null,
  is_terminal boolean not null default false,
  sort_order int not null default 0
);

comment on table public.status_catalog is 'Catálogo de status reutilizado por todas as tabelas de registro.';
