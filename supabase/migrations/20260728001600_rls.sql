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
