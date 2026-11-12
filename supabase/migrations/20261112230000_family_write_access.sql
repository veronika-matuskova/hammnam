-- =============================================================================
-- hamMňam: only family members may create, edit or delete recipes (#5)
-- =============================================================================
--
-- After this migration:
--   * everyone (anon and signed-in) can read recipes;
--   * INSERT / UPDATE / DELETE need a signed-in Supabase Auth user whose
--     e-mail is in public.allowed_users;
--   * an anonymous request with the publishable key cannot write at all.
--
-- Add family members (SQL editor or `supabase db execute`), e-mails in lower case:
--
--   insert into public.allowed_users (email) values ('mama@example.com');
--
-- The users also need an account in Authentication -> Users (the app sends
-- magic links with create_user = false, so it never creates accounts itself).
-- =============================================================================

-- Family allow-list. RLS is enabled with no policies, so neither anon nor
-- signed-in users can read or change it through the API; only the dashboard,
-- the SQL editor and the service role can.
create table if not exists public.allowed_users (
  email text primary key check (email = lower(email)),
  note text,
  created_at timestamptz not null default now()
);

alter table public.allowed_users enable row level security;
revoke all on public.allowed_users from anon, authenticated;

-- True when the caller's verified e-mail (from the JWT) is on the allow-list.
-- SECURITY DEFINER so it can read allowed_users, which callers cannot.
-- The app calls it as POST /rest/v1/rpc/is_family_member to hide edit controls.
create or replace function public.is_family_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.allowed_users a
      where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

revoke all on function public.is_family_member() from public;
grant execute on function public.is_family_member() to anon, authenticated;

-- Replace every existing policy on recipes (their names in the live project
-- are unknown, see the baseline migration) with the family-only set.
do $$
declare
  existing record;
begin
  for existing in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'recipes'
  loop
    execute format('drop policy %I on public.recipes', existing.policyname);
  end loop;
end
$$;

alter table public.recipes enable row level security;

create policy "Anyone can read recipes"
  on public.recipes for select
  to anon, authenticated
  using (true);

create policy "Family members can insert recipes"
  on public.recipes for insert
  to authenticated
  with check ((select public.is_family_member()));

create policy "Family members can update recipes"
  on public.recipes for update
  to authenticated
  using ((select public.is_family_member()))
  with check ((select public.is_family_member()));

create policy "Family members can delete recipes"
  on public.recipes for delete
  to authenticated
  using ((select public.is_family_member()));

-- Defence in depth: anon has no write privileges even if a policy is added by mistake.
revoke insert, update, delete, truncate on public.recipes from anon;
grant select on public.recipes to anon, authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
