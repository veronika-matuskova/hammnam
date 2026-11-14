-- =============================================================================
-- hamMňam: a main dish can point to its side dish
-- =============================================================================
--
-- Applied to the live project on 2026-11-14 (version 20261114123150).
--
-- recipes.side_recipe_id is the recipe served as the side dish with this one
-- (e.g. "Kura na kyslej kapuste" -> "Gratinované zemiaky"). The side dish's
-- detail lists the main dishes that point to it. Deleting the side dish clears
-- the link. Existing RLS policies cover the new column.
-- =============================================================================

alter table public.recipes
  add column if not exists side_recipe_id bigint
    references public.recipes(id) on delete set null,
  add constraint recipes_side_recipe_not_self check (side_recipe_id is null or side_recipe_id <> id);

comment on column public.recipes.side_recipe_id is 'Side dish served with this main dish (another recipe), or NULL.';

create index if not exists recipes_side_recipe_id_idx on public.recipes (side_recipe_id);
