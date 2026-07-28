-- Extensões necessárias no schema public.
-- pgcrypto: gen_random_uuid() para IDs.
-- pg_trgm: índice de trigrama pra busca por nome de escola (case insensitive, typo-tolerant).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
