-- Cron interno do Supabase para `official_deadlines`.
-- Como o PAT do GitHub em uso não tem scope `workflow`, não dá para
-- agendar via `.github/workflows/`. Solução: rodar o job via pg_cron +
-- pg_net → chama a Edge Function `fetch-deadlines` (Deno/TypeScript,
-- código em `supabase/functions/fetch-deadlines/index.ts`).
--
-- Edge Function foi deployada com `--no-verify-jwt`, então a chamada do
-- pg_net.http_post não precisa de Authorization header — o env var
-- `SUPABASE_SERVICE_ROLE_KEY` da própria function é auto-injetado pelo
-- Supabase no momento do deploy (ver docs: Edge Functions Secrets).
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
--   4. (Opcional) Configurar secrets customizados da Edge Function
--      (Dashboard → Edge Functions → fetch-deadlines → Secrets):
--        - QD_TERRITORY_IDS        CSV opcional de IBGE codes
--        - LOOKBACK_DAYS           opcional, default 14
--      (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY são auto-injetados pelo
--      Supabase — não precisam ser setados manualmente.)
--   5. Para gatilho manual via Dashboard: ver função
--      public.invoke_fetch_deadlines() abaixo.

-- pg_cron schedule: 0 11 * * * UTC = 8h BRT (BRT é UTC-3, sem horário de verão).
-- timeout_milliseconds := 60s (pg_net default é 5s; a function leva ~4s
-- sem cold start, então 60s dá margem pra cold start + retries).
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

-- Função helper pra invocar manualmente (do SQL Editor):
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
