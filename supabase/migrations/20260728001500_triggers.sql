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
