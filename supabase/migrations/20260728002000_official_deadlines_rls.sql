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