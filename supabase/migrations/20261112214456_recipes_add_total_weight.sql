-- Weight of the whole finished dish, used for per-portion values.
-- Applied directly in Supabase on 2026-11-12; this file mirrors that migration.

alter table public.recipes add column if not exists total_weight numeric;
comment on column public.recipes.total_weight is 'Weight of the whole finished dish in grams.';
