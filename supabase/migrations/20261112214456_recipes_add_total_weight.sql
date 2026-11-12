-- The app saves the weight of the whole finished dish (total_weight, since #31),
-- but the column was missing on the live project, so every save failed with
-- HTTP 400 from about 20:59 UTC on 2026-11-12.
-- Applied to the live project on 2026-11-12 (version 20261112214456).

alter table public.recipes add column if not exists total_weight numeric;
comment on column public.recipes.total_weight is 'Weight of the whole finished dish in grams.';
