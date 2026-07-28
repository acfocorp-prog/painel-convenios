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
