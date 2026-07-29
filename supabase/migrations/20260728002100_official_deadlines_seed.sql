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
    'https://www.gov.br/fnde/pt-br',
    'fnde-censo-2026-comunicado',
    'GERAL',
    'ATENCAO',
    current_date + interval '90 day',
    current_date - interval '8 day'
  );