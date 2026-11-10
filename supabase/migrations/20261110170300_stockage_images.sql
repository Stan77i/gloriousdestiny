-- Glorious Destiny — stockage des images produits (Supabase Storage).
-- Bucket public en lecture ; écriture réservée à admin/owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produits', 'produits', true, 5242880, array['image/webp', 'image/png', 'image/jpeg', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy produits_images_ajout_admin on storage.objects for insert to authenticated
  with check (bucket_id = 'produits' and (select private.a_role(array[]::text[])));
create policy produits_images_lecture_admin on storage.objects for select to authenticated
  using (bucket_id = 'produits' and (select private.a_role(array[]::text[])));
create policy produits_images_modif_admin on storage.objects for update to authenticated
  using (bucket_id = 'produits' and (select private.a_role(array[]::text[])))
  with check (bucket_id = 'produits' and (select private.a_role(array[]::text[])));
create policy produits_images_suppression_admin on storage.objects for delete to authenticated
  using (bucket_id = 'produits' and (select private.a_role(array[]::text[])));
