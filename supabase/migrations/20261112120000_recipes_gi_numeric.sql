-- Issue #15: store the glycemic index (GI) as a number from 0 to 100.
--
-- !!! NEEDS REVIEW BEFORE APPLYING !!!
-- * Check the current values first:
--     select gi, count(*) from public.recipes group by gi order by 2 desc;
-- * Text values are converted by taking the FIRST number they contain
--   ("55" -> 55, "GI 55" -> 55, "45,5" -> 45.5, "35-40" -> 35). Values without a
--   number (e.g. "nízky") or outside 0-100 become NULL.
-- * The original text values are kept in public.recipes_gi_backup so nothing is
--   lost; drop that table once the result has been checked.
-- * The app (from this PR on) sends GI as a number or NULL, which works both before
--   and after this migration.

begin;

create table if not exists public.recipes_gi_backup as
  select id, gi as gi_text, now() as backed_up_at
  from public.recipes
  where gi is not null and btrim(gi::text) <> '';

-- Not exposed through the REST API: only the owner/service role should read it.
alter table public.recipes_gi_backup enable row level security;

alter table public.recipes alter column gi drop default;

alter table public.recipes
  alter column gi type numeric
  using (
    case
      when substring(gi::text from '[0-9]+(?:[.,][0-9]+)?') is null then null
      when replace(substring(gi::text from '[0-9]+(?:[.,][0-9]+)?'), ',', '.')::numeric between 0 and 100
        then replace(substring(gi::text from '[0-9]+(?:[.,][0-9]+)?'), ',', '.')::numeric
      else null
    end
  );

alter table public.recipes
  add constraint recipes_gi_range check (gi is null or (gi >= 0 and gi <= 100));

comment on column public.recipes.gi is 'Glycemic index, 0-100 (low <= 55, medium 56-69, high >= 70). Not a per-100 g value.';

commit;
