-- Cron interno do Supabase para `official_deadlines`.
-- Como o PAT do GitHub em uso não tem scope `workflow`, não dá para
-- agendar via `.github/workflows/`. Solução: rodar o job via pg_cron +
-- pg_net → chama a Edge Function `fetch-deadlines` (Deno/TypeScript,
-- código em `supabase/functions/fetch-deadlines/index.ts`).
--
-- Edge Function roda o mesmo `scripts/fetch-official-deadlines.mjs`
-- (transcrito para Deno), com SUPABASE_SERVICE_ROLE_KEY + URL vindos
-- dos secrets da própria function.
--
-- PRÉ-REQUISITOS PARA A EQUIPE (1 vez):
--   1. Habilitar extensions no Supabase Dashboard → Database → Extensions:
--        - pg_cron
--        - pg_net
--      (Em projetos novos do Supabase elas já vêm habilitadas; em antigos
--      pode ser preciso ativar no SQL Editor com `create extension ...`.)
--   2. Aplicar esta migration no SQL Editor.
--   3. Fazer deploy da Edge Function (a partir da raiz do repo):
--        npx supabase functions deploy fetch-deadlines --no-verify-jwt
--   4. Definir os secrets da Edge Function (no Dashboard → Edge Functions
--      → fetch-deadlines → Secrets):
--        - SUPABASE_URL            ex.: https://abc.supabase.co
--        - SUPABASE_SERVICE_ROLE_KEY
--        - QD_TERRITORY_IDS        CSV opcional de IBGE codes
--        - LOOKBACK_DAYS           opcional, default 14
--   5. (Opcional) Para gatilho manual via Dashboard: ver função
--      public.invoke_fetch_deadlines() abaixo.

-- pg_cron schedule: 0 11 * * * UTC = 8h BRT (BRT é UTC-3, sem horário de verão).
-- Usamos 'America/Sao_Paulo' pra evitar confusão com horário de verão.
select cron.schedule(
  'fetch-official-deadlines-daily',
  '0 11 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.functions_url', true)
              || '/functions/v1/fetch-deadlines',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Função helper pra invocar manualmente (do SQL Editor ou de um botão no app):
create or replace function public.invoke_fetch_deadlines()
returns bigint
language plpgsql
security definer
as $$
declare
  request_id bigint;
begin
  select net.http_post(
    url     := current_setting('app.functions_url', true)
              || '/functions/v1/fetch-deadlines',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{}'::jsonb
  ) into request_id;
  return request_id;
end;
$$;

comment on function public.invoke_fetch_deadlines()
  is 'Dispara a Edge Function fetch-deadlines manualmente. Retorna o request_id do pg_net.';

-- Guarda a URL base do projeto e a service_role key em "settings" do database
-- pra os jobs do pg_cron conseguirem ler. A função abaixo é chamada por um
-- trigger na primeira execução; ou a equipe pode rodar manualmente:
--   alter database current set app.functions_url = 'https://abc.supabase.co';
--   alter database current set app.service_role_key = '<service_role_key>';
-- Os secrets acima JAMAIS devem ser commitados no repo — só no SQL Editor.
