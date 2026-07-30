-- =====================================================================
-- PAINEL DE CONVÊNIOS — SETUP COMPLETO DO SUPABASE
-- =====================================================================
-- Gerado a partir dos 21 arquivos em supabase/migrations/.
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique Run.
--
-- Ordem importa: extensions → enums → profiles → lookups → escolas
--   → convenios → simec → bienios → mandatos → status_history
--   → attachments → school_notes → process_links → message_templates
--   → config → triggers → rls → seed → mandato_escola_nullable
--   → official_deadlines → official_deadlines_rls → official_deadlines_seed
--
-- Idempotente? Não — rode uma vez só em projeto novo.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 20260728000000_extensions.sql
-- ---------------------------------------------------------------------

-- Extensões necessárias no schema public.
-- pgcrypto: gen_random_uuid() para IDs.
-- pg_trgm: índice de trigrama pra busca por nome de escola (case insensitive, typo-tolerant).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;


-- ---------------------------------------------------------------------
-- 20260728000100_enums.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 20260728000200_profiles.sql
-- ---------------------------------------------------------------------

-- Tabela de perfis (1:1 com auth.users).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil do usuário; espelha auth.users para ter nome amigável.';

-- Função e trigger: sempre que um usuário novo aparece em auth.users, cria um profile.
-- SECURITY DEFINER é necessário porque o usuário logado em geral não tem permissão de inserir aqui.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 20260728000300_lookups.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 20260728000400_escolas.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 20260728000500_convenios.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 20260728000600_simec.sql
-- ---------------------------------------------------------------------

-- Adesões a programas do SIMEC por escola.

create table public.simec_adhesions (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas (id),
  program text not null,
  year int not null,
  due_date date,
  status_id uuid not null references public.status_catalog (id),
  priority boolean not null default false,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint simec_year_check check (year between 2000 and 2100)
);

create index simec_escola_idx on public.simec_adhesions (escola_id);
create index simec_status_idx on public.simec_adhesions (status_id);
create index simec_due_idx
  on public.simec_adhesions (due_date)
  where deleted_at is null;


-- ---------------------------------------------------------------------
-- 20260728000700_bienios.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 20260728000800_mandatos.sql
-- ---------------------------------------------------------------------

-- Mandato tampão — mandato interino de uma escola (ou da secretaria).

create table public.mandatos_tampao (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid references public.escolas (id),
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


-- ---------------------------------------------------------------------
-- 20260728000900_status_history.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 20260728001000_attachments.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 20260728001100_school_notes.sql
-- ---------------------------------------------------------------------

-- Diário por escola — anotações livres.

create table public.school_notes (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas (id) on delete cascade,
  body text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index school_notes_escola_idx
  on public.school_notes (escola_id, created_at desc);


-- ---------------------------------------------------------------------
-- 20260728001200_process_links.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 20260728001300_message_templates.sql
-- ---------------------------------------------------------------------

-- Modelos de mensagem (placeholders {{escola_nome}} {{prazo}} etc.).

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 20260728001400_config.sql
-- ---------------------------------------------------------------------

-- Configurações chave/valor lidas pelo app (dias de antecedência, etc.).

create table public.config (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 20260728001500_triggers.sql
-- ---------------------------------------------------------------------

-- Triggers globais.

-- 1) updated_at automático em todas as tabelas que têm a coluna.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'escolas',
      'convenios',
      'simec_adhesions',
      'bienios',
      'mandatos_tampao',
      'config'
    ])
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end$$;

-- 2) Atualiza escolas.last_movement_at quando qualquer registro da escola muda.
--    Usado pelo alerta de "escola sem movimento há N dias".

create or replace function public.touch_escola_last_movement(escola uuid)
returns void
language sql
as $$
  update public.escolas
  set last_movement_at = now()
  where id = escola;
$$;

create or replace function public.set_escola_last_movement()
returns trigger
language plpgsql
as $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.escola_id, old.escola_id);
  if target_id is not null then
    perform public.touch_escola_last_movement(target_id);
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
  tt text;
begin
  for t in
    select unnest(array[
      'convenios',
      'simec_adhesions',
      'bienios',
      'mandatos_tampao'
    ])
  loop
    tt := t || '_touch_escola';
    execute format(
      'create trigger %I
        after insert or update or delete on public.%I
        for each row execute function public.set_escola_last_movement()',
      tt, t
    );
  end loop;
end$$;

-- 3) Trilha de mudanças de status para qualquer módulo.
--    Grava em status_history quando status_id muda.

create or replace function public.log_status_change()
returns trigger
language plpgsql
as $$
declare
  tipo public.registro_tipo;
begin
  if (tg_op = 'UPDATE'
      and old.status_id is distinct from new.status_id) then
    tipo := case
      when tg_table_name = 'convenios' then 'CONVENIO'::public.registro_tipo
      when tg_table_name = 'simec_adhesions' then 'SIMEC'::public.registro_tipo
      when tg_table_name = 'bienios' then 'BIENIO'::public.registro_tipo
      when tg_table_name = 'mandatos_tampao' then 'MANDATO'::public.registro_tipo
    end;

    insert into public.status_history (
      registro_tipo,
      registro_id,
      old_status_id,
      new_status_id,
      changed_by
    )
    values (
      tipo,
      new.id,
      old.status_id,
      new.status_id,
      coalesce(new.updated_by, auth.uid())
    );
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
  tn text;
begin
  for t in
    select unnest(array[
      'convenios',
      'simec_adhesions',
      'bienios',
      'mandatos_tampao'
    ])
  loop
    tn := t || '_status_audit';
    execute format(
      'create trigger %I
        after update on public.%I
        for each row execute function public.log_status_change()',
      tn, t
    );
  end loop;
end$$;


-- ---------------------------------------------------------------------
-- 20260728001600_rls.sql
-- ---------------------------------------------------------------------

-- Row Level Security.
-- Política padrão: qualquer usuário autenticado lê/escreve tudo.
-- Em produção futura com >2 usuários, dá pra apertar; por enquanto vale a
-- simplicidade.

alter table public.profiles enable row level security;

create policy "profiles_read_self_or_all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_authenticated"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Macros: aplica "todos logados podem tudo" para o resto das tabelas.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'escolas',
      'verba_tipos',
      'status_catalog',
      'convenios',
      'simec_adhesions',
      'bienios',
      'mandatos_tampao',
      'status_history',
      'attachments',
      'school_notes',
      'process_links',
      'message_templates',
      'config'
    ])
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_r', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      t || '_i', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      t || '_u', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (true)',
      t || '_d', t
    );
  end loop;
end$$;


-- ---------------------------------------------------------------------
-- 20260728001700_seed.sql
-- ---------------------------------------------------------------------

-- Seed inicial: tipos de verba, catálogo de status e chaves de config padrão.
-- Idempotente: pode rodar várias vezes sem duplicar.

insert into public.verba_tipos (code, label, requires_bank_info, sort_order) values
  ('FUNDEB', 'Fundeb', true, 10),
  ('PNAE',   'Pnae',   true, 20),
  ('PNAT',   'Pnat',   true, 30),
  ('PDDE',   'PDDE',   false, 40),
  ('PNLD',   'PNLD',   true, 50),
  ('PAR',    'PAR',    true, 60),
  ('QSE',    'QSE',    true, 70)
on conflict (code) do nothing;

insert into public.status_catalog (code, label, color, is_terminal, sort_order) values
  ('EM_ANDAMENTO', 'Em andamento', 'yellow', false, 10),
  ('ATRASADO',     'Atrasado',    'red',    false, 20),
  ('CONCLUIDO',    'Concluído',   'green',  true,  30),
  ('CANCELADO',    'Cancelado',   'gray',   true,  40)
on conflict (code) do nothing;

insert into public.config (key, value) values
  ('lembrete_dias_antecedencia',     '7'::jsonb),
  ('alerta_escola_sem_movimento_dias', '30'::jsonb)
on conflict (key) do nothing;

insert into public.message_templates (title, body) values
  (
    'Lembrete de prestação de contas',
    'Olá, {{escola_nome}}! Passando para lembrar que a prestação de contas referente a {{verba}} vence em {{prazo}}. Qualquer dúvida, estou à disposição.'
  ),
  (
    'Lembrete de biênio',
    'Olá, {{escola_nome}}! O biênio {{inicio}}-{{fim}} precisa da ata registrada em cartório até {{prazo}}. Pode confirmar o andamento?'
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Migration 20260728001800_mandato_escola_nullable
-- Mandato tampão pode ser da secretaria (escola_id NULL) ou de uma escola.
-- ---------------------------------------------------------------------------
ALTER TABLE public.mandatos_tampao
  ALTER COLUMN escola_id DROP NOT NULL;


-- ---------------------------------------------------------------------
-- 20260728001900_official_deadlines.sql
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 20260728002000_official_deadlines_rls.sql
-- ---------------------------------------------------------------------

-- RLS das tabelas official_deadlines + official_deadline_reads.
-- Mesma política das outras tabelas de negócio: todos autenticados podem tudo.
-- Leituras são per-user (outros usuários não veem o que eu marquei).

alter table public.official_deadlines enable row level security;

create policy "official_deadlines_r"
  on public.official_deadlines for select
  to authenticated
  using (true);

create policy "official_deadlines_i"
  on public.official_deadlines for insert
  to authenticated
  with check (true);

create policy "official_deadlines_u"
  on public.official_deadlines for update
  to authenticated
  using (true)
  with check (true);

create policy "official_deadlines_d"
  on public.official_deadlines for delete
  to authenticated
  using (true);

alter table public.official_deadline_reads enable row level security;

create policy "official_deadline_reads_r"
  on public.official_deadline_reads for select
  to authenticated
  using (true);

create policy "official_deadline_reads_i"
  on public.official_deadline_reads for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "official_deadline_reads_d"
  on public.official_deadline_reads for delete
  to authenticated
  using (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- 20260728002100_official_deadlines_seed.sql
-- ---------------------------------------------------------------------

-- Seed de avisos oficiais de exemplo.
-- Estes são avisos plausíveis baseados em publicações reais típicas de
-- programas federais / municipais de educação. Servem pra UI ter conteúdo
-- desde o primeiro deploy, antes do cron popular via API.
-- Quando o cron popular via (source, source_external_id), upsert mantém estes
-- e só atualiza o que mudou.

insert into public.official_deadlines
  (title, description, source, source_url, source_external_id, category, severity, due_date, published_at)
values
  -- CONVÊNIO
  (
    'FNDE — Prestação de contas do PDDE 2025',
    'Entes federados devem enviar a prestação de contas do PDDE referente ao exercício de 2025 pelo SIMEC até a data indicada.',
    'FNDE',
    'https://www.gov.br/fnde/pt-br/assuntos/programas/pdde',
    'fnde-pdde-2025-prestacao',
    'CONVENIO',
    'URGENTE',
    current_date + interval '14 day',
    current_date - interval '5 day'
  ),
  (
    'DOU — Portaria sobre repasses do PNAE 2026',
    'Portaria do FNDE que define o calendário e valores per-capita do PNAE para o exercício de 2026.',
    'DOU',
    'https://www.in.gov.br/consulta/-/buscar/dou?q=PNAE+2026',
    'dou-pnae-2026-portaria',
    'CONVENIO',
    'ATENCAO',
    current_date + interval '30 day',
    current_date - interval '2 day'
  ),
  (
    'FNDE — Edital PNATE 2026',
    'Edital de adesão ao PNATE para o exercício de 2026 — transporte escolar rural.',
    'FNDE',
    'https://www.gov.br/fnde/pt-br/assuntos/programas/pnate',
    'fnde-pnate-2026-edital',
    'CONVENIO',
    'INFO',
    current_date + interval '45 day',
    current_date - interval '1 day'
  ),

  -- SIMEC
  (
    'MEC — Prazo de validação de adesões SIMEC 2026',
    'Confirmação das adesões dos programas PDE Escola / PDDE Interativo no SIMEC pelas secretarias municipais.',
    'MEC',
    'https://www.gov.br/mec/pt-br',
    'mec-simec-2026-validacao',
    'SIMEC',
    'ATENCAO',
    current_date + interval '20 day',
    current_date - interval '3 day'
  ),

  -- BIÊNIO
  (
    'Prefeitura — Cronograma bienal de diretores 2026/2027',
    'Decreto municipal definindo o cronograma do processo bienal de escolha de diretores para o ciclo 2026/2027.',
    'PREFEITURA',
    'https://queridodiario.ok.org.br/',
    'pref-bienio-2026-2027-cronograma',
    'BIENIO',
    'URGENTE',
    current_date + interval '60 day',
    current_date - interval '7 day'
  ),

  -- MANDATO
  (
    'Prefeitura — Regulamentação de mandato tampão',
    'Instrução normativa sobre designação de diretores em caráter temporário durante vacância.',
    'PREFEITURA',
    'https://queridodiario.ok.org.br/',
    'pref-mandato-tampao-in',
    'MANDATO',
    'INFO',
    null,
    current_date - interval '10 day'
  ),

  -- GERAL
  (
    'Querido Diário — Atualização de monitor de prazos',
    'Projeto Querido Diário ampliou cobertura de municípios e passou a indexar diários a partir de 2018.',
    'QUERIDO_DIARIO',
    'https://queridodiario.ok.org.br/',
    'qd-novidades-2026-07',
    'GERAL',
    'INFO',
    null,
    current_date - interval '4 day'
  ),
  (
    'FNDE — Comunicado sobre censo escolar 2026',
    'Orientações da DIRAE/FNDE sobre o preenchimento do censo escolar da educação básica 2026.',
    'FNDE',
    'https://www.gov.br/fnde/pt-br/assuntos/programas/pdde',
    'fnde-censo-2026-comunicado',
    'GERAL',
    'ATENCAO',
    current_date + interval '90 day',
    current_date - interval '8 day'
  );

-- ============================================================================
-- 20260729000000_official_deadlines_pg_cron.sql
-- Cron interno (Supabase pg_cron + pg_net) chamando a Edge Function
-- `fetch-deadlines` diariamente às 8h BRT. A Edge Function é deployada com
-- `--no-verify-jwt`, então a chamada do pg_net.http_post não precisa de
-- Authorization — SUPABASE_URL/SERVICE_ROLE_KEY são auto-injetados no
-- runtime da function.
-- ============================================================================

select cron.schedule(
  'fetch-official-deadlines-daily',
  '0 11 * * *',
  $$
  select net.http_post(
    url     := 'https://itvjxesfoginvxltutws.supabase.co/functions/v1/fetch-deadlines',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

create or replace function public.invoke_fetch_deadlines()
returns bigint
language plpgsql
security definer
as $$
declare
  request_id bigint;
begin
  select net.http_post(
    url     := 'https://itvjxesfoginvxltutws.supabase.co/functions/v1/fetch-deadlines',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) into request_id;
  return request_id;
end;
$$;

comment on function public.invoke_fetch_deadlines()
  is 'Dispara a Edge Function fetch-deadlines manualmente. Retorna o request_id do pg_net.';

-- Estende `public.escolas` com campos opcionais vindos do modelo
-- "Situação Cadastral das Entidades" do FNDE (HTML salvo como .xls).
-- Todas as colunas são NULLABLE pra não quebrar escolas já cadastradas.
-- Os campos não são indexados porque a consulta principal continua
-- sendo por `inep` (índice único existente `escolas_inep_active_uidx`).

alter table public.escolas
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists cnpj_eex text,
  add column if not exists cnpj_uex text,
  add column if not exists rede_atendimento text,
  add column if not exists localizacao text,
  add column if not exists mandato_dirigente text,
  add column if not exists data_fim_mandato date;

comment on column public.escolas.phone is 'Telefone concatenado (DDD + número)';
comment on column public.escolas.email is 'E-mail da escola';
comment on column public.escolas.cnpj_eex is 'CNPJ da Entidade Executora (mantido com pontuação original)';
comment on column public.escolas.cnpj_uex is 'CNPJ da Unidade Executora (mantido com pontuação original)';
comment on column public.escolas.rede_atendimento is 'Rede: PARTICULAR / ESTADUAL / MUNICIPAL / FEDERAL';
comment on column public.escolas.localizacao is 'Localização: Urbana / Rural';
comment on column public.escolas.mandato_dirigente is 'Status do mandato: VENCIDO / VIGENTE / etc';
comment on column public.escolas.data_fim_mandato is 'Data de término do mandato do dirigente';
