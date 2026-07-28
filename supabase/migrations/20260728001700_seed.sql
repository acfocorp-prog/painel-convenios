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
