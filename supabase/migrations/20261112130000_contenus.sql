-- Glorious Destiny — contenus : vidéos, témoignages, captures, photos, transformations, contenus
-- produits. Cycle : création (brouillon) → stockage (Supabase Storage, bucket « contenus ») →
-- publication (contrôlée par la base) → affichage public → dépublication ou suppression.
-- Un témoignage, une transformation ou une photo de cliente ne se publie qu'avec son accord.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contenus', 'contenus', true, 52428800, array[
  'image/webp', 'image/png', 'image/jpeg', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'
])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy contenus_fichiers_ajout_admin on storage.objects for insert to authenticated
  with check (bucket_id = 'contenus' and (select private.a_role(array[]::text[])));
create policy contenus_fichiers_lecture_admin on storage.objects for select to authenticated
  using (bucket_id = 'contenus' and (select private.a_role(array[]::text[])));
create policy contenus_fichiers_modif_admin on storage.objects for update to authenticated
  using (bucket_id = 'contenus' and (select private.a_role(array[]::text[])))
  with check (bucket_id = 'contenus' and (select private.a_role(array[]::text[])));
create policy contenus_fichiers_suppression_admin on storage.objects for delete to authenticated
  using (bucket_id = 'contenus' and (select private.a_role(array[]::text[])));

create table public.contenus (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('video', 'temoignage', 'capture', 'photo', 'transformation', 'produit')),
  titre text not null check (length(trim(titre)) between 2 and 120),
  texte text check (texte is null or length(texte) <= 1500),
  auteur text check (auteur is null or length(trim(auteur)) between 2 and 80),
  produit_id uuid references public.produits (id),
  service_id uuid references public.services (id),
  -- Chemins dans le bucket « contenus » (UUID aléatoire, jamais devinable).
  fichier text check (fichier is null or fichier ~ '^[a-z0-9/_.-]{3,200}$'),
  fichier_avant text check (fichier_avant is null or fichier_avant ~ '^[a-z0-9/_.-]{3,200}$'),
  type_fichier text check (type_fichier is null or type_fichier in ('image', 'video')),
  video_url text check (video_url is null or video_url ~ '^https://(www\.)?(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|instagram\.com)/'),
  texte_alternatif text check (texte_alternatif is null or length(texte_alternatif) <= 200),
  consentement_cliente boolean not null default false,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'publie', 'depublie')),
  publie_at timestamptz,
  ordre integer not null default 0,
  mis_en_avant boolean not null default false,
  cree_par uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contenus_publies_idx on public.contenus (type, ordre, publie_at desc) where statut = 'publie';
create index contenus_produit_idx on public.contenus (produit_id);
create index contenus_service_idx on public.contenus (service_id);
create index contenus_cree_par_idx on public.contenus (cree_par);

-- La base décide si un contenu peut être publié (contenu complet, accord de la cliente).
create or replace function private.controler_contenu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.statut = 'publie' then
    if new.type in ('photo', 'capture') and (new.fichier is null or new.type_fichier is distinct from 'image') then
      raise exception 'CONTENU_INCOMPLET: une image est nécessaire' using errcode = '22023';
    end if;
    if new.type = 'video' and new.fichier is null and new.video_url is null then
      raise exception 'CONTENU_INCOMPLET: une vidéo (fichier ou lien) est nécessaire' using errcode = '22023';
    end if;
    if new.type = 'video' and new.fichier is not null and new.type_fichier is distinct from 'video' then
      raise exception 'CONTENU_INCOMPLET: le fichier doit être une vidéo' using errcode = '22023';
    end if;
    if new.type = 'transformation' and (new.fichier is null or new.fichier_avant is null) then
      raise exception 'CONTENU_INCOMPLET: photos avant et après nécessaires' using errcode = '22023';
    end if;
    if new.type = 'temoignage' and (length(trim(coalesce(new.texte, ''))) < 10 or new.auteur is null) then
      raise exception 'CONTENU_INCOMPLET: texte et prénom de la cliente nécessaires' using errcode = '22023';
    end if;
    if new.type = 'produit' and new.produit_id is null then
      raise exception 'CONTENU_INCOMPLET: produit à associer' using errcode = '22023';
    end if;
    if new.type in ('temoignage', 'transformation', 'photo') and not new.consentement_cliente then
      raise exception 'CONSENTEMENT_REQUIS' using errcode = '22023';
    end if;
    if new.fichier is not null and new.type_fichier = 'image' and length(trim(coalesce(new.texte_alternatif, ''))) = 0 then
      raise exception 'CONTENU_INCOMPLET: description de l''image (accessibilité) nécessaire' using errcode = '22023';
    end if;
    if tg_op = 'INSERT' or old.statut is distinct from 'publie' then
      new.publie_at := now();
    end if;
  end if;
  return new;
end;
$$;
create trigger contenus_controle
  before insert or update on public.contenus
  for each row execute function private.controler_contenu();

alter table public.contenus enable row level security;
revoke all on public.contenus from anon, authenticated;
grant select on public.contenus to anon, authenticated;
grant insert, update, delete on public.contenus to authenticated;
create policy contenus_lecture on public.contenus for select to anon, authenticated
  using (statut = 'publie' or (select private.a_role(array[]::text[])));
create policy contenus_ajout_admin on public.contenus for insert to authenticated
  with check ((select private.a_role(array[]::text[])));
create policy contenus_modif_admin on public.contenus for update to authenticated
  using ((select private.a_role(array[]::text[])))
  with check ((select private.a_role(array[]::text[])));
create policy contenus_suppression_admin on public.contenus for delete to authenticated
  using ((select private.a_role(array[]::text[])));

-- Journal d'audit des contenus (comme le catalogue).
create trigger contenus_audit after insert or update or delete on public.contenus
  for each row execute function private.journaliser();

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to anon, authenticated;
