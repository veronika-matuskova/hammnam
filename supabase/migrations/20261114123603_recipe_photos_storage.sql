-- =============================================================================
-- hamMňam: recipe photos in Supabase Storage
-- =============================================================================
--
-- Applied to the live project on 2026-11-14 (version 20261114123603).
--
-- Public bucket "recipe-photos": anyone can view a photo by its public URL;
-- only family members (public.is_family_member()) can upload, replace or
-- delete. JPEG/PNG/WebP up to 5 MB. The app scales photos to 1600 px first and
-- stores the public URL in recipes.photo.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Family members can upload recipe photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recipe-photos' and (select public.is_family_member()));

create policy "Family members can replace recipe photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'recipe-photos' and (select public.is_family_member()))
  with check (bucket_id = 'recipe-photos' and (select public.is_family_member()));

create policy "Family members can delete recipe photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recipe-photos' and (select public.is_family_member()));
