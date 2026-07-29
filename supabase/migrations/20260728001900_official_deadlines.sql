-- Avisos oficiais de fontes externas (FNDE, MEC, DOU, Querido Diário, etc.).
-- Cadastro é responsabilidade de uma rotina externa (cron / seed); o app só
-- lê, marca como lido por usuário e arquiva.

create table public.official_deadlines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  source text not null check (source in (
    'DOU',               -- Diário Oficial da União
    'FNDE',              -- comunicados / editais do FNDE
    'MEC',               -- portarias / editais do MEC
    'PREFEITURA',        -- Diário Oficial do município
    'QUERIDO_DIARIO',    -- scraped via Querido Diário
    'OUTRO'
  )),
  source_url text,
  -- Quando o cron popular via API externa, este id evita inserir duplicado.
  source_external_id text,
  category text not null check (category in (
    'CONVENIO',
    'SIMEC',
    'BIENIO',
    'MANDATO',
    'GERAL'
  )),
  severity text not null default 'INFO' check (severity in (
    'INFO',
    'ATENCAO',
    'URGENTE'
  )),
  due_date date,
  published_at date not null default current_date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  -- Permite ter o mesmo external_id repetido entre fontes diferentes.
  unique (source, source_external_id)
);

create index official_deadlines_published_idx
  on public.official_deadlines (published_at desc);
create index official_deadlines_active_idx
  on public.official_deadlines (is_archived, published_at desc);

-- Leituras por usuário (cada pessoa marca o que já viu).
create table public.official_deadline_reads (
  deadline_id uuid not null references public.official_deadlines (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (deadline_id, user_id)
);

create index official_deadline_reads_user_idx
  on public.official_deadline_reads (user_id, read_at desc);