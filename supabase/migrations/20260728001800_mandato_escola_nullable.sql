-- Mandato tampão pode ser da secretaria (escola_id NULL) ou de uma escola.
-- Confirmado com a usuária: existe a possibilidade de registrar um mandato
-- tampão que cobre a secretaria inteira, sem vinculação a uma escola
-- específica. Esta migration flexibiliza o NOT NULL original.
ALTER TABLE public.mandatos_tampao
  ALTER COLUMN escola_id DROP NOT NULL;
