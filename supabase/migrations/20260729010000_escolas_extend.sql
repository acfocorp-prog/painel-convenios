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
