-- Tests contenus : brouillon, publication contrôlée par la base (complétude, accord de la cliente),
-- lecture publique des seuls contenus publiés, droits d'écriture, dépublication, suppression.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e7', 'admin-contenus@test.local'),
  ('00000000-0000-0000-0000-0000000000e8', 'ventes-contenus@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000e7', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000e8', 'Ventes', 'ventes');

create function pg_temp.attendre_erreur(sql text, attendu text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'ECHEC: aucune erreur pour [%]', sql;
exception when others then
  if sqlerrm like 'ECHEC:%' then raise; end if;
  if position(attendu in sqlerrm) = 0 then
    raise exception 'ECHEC: erreur inattendue pour [%] : % (attendu %)', sql, sqlerrm, attendu;
  end if;
end $$;
grant execute on function pg_temp.attendre_erreur(text, text) to anon, authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e8';
select pg_temp.attendre_erreur($q$insert into public.contenus (type, titre) values ('photo', 'Essai')$q$, 'row-level security');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e7';
insert into public.contenus (id, type, titre, texte, auteur) values
  ('c0000000-0000-0000-0000-0000000000a1', 'temoignage', 'Une pose qui tient', 'Ma lace a tenu toute la semaine, même sous la chaleur.', 'Awa, Douala');
insert into public.contenus (id, type, titre, fichier, type_fichier, texte_alternatif) values
  ('c0000000-0000-0000-0000-0000000000a2', 'transformation', 'Avant / après', 'transformations/x/apres.webp', 'image', 'Perruque posée, lisière invisible');
-- Brouillons : invisibles pour le public.
set local role anon;
set local request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from public.contenus) = 0, 'brouillons invisibles';
end $$;
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e7';
select pg_temp.attendre_erreur($q$update public.contenus set statut = 'publie' where id = 'c0000000-0000-0000-0000-0000000000a1'$q$, 'CONSENTEMENT_REQUIS');
select pg_temp.attendre_erreur($q$update public.contenus set statut = 'publie', consentement_cliente = true where id = 'c0000000-0000-0000-0000-0000000000a2'$q$, 'CONTENU_INCOMPLET');
update public.contenus set statut = 'publie', consentement_cliente = true where id = 'c0000000-0000-0000-0000-0000000000a1';
select pg_temp.attendre_erreur($q$insert into public.contenus (type, titre, statut) values ('video', 'Sans vidéo', 'publie')$q$, 'CONTENU_INCOMPLET');
select pg_temp.attendre_erreur($q$insert into public.contenus (type, titre, video_url) values ('video', 'Lien douteux', 'https://exemple.com/x')$q$, 'contenus_video_url_check');
insert into public.contenus (type, titre, video_url, statut) values ('video', 'La pose en 60 secondes', 'https://www.youtube.com/watch?v=abc', 'publie');
do $$ begin
  assert (select publie_at is not null from public.contenus where id = 'c0000000-0000-0000-0000-0000000000a1'), 'date de publication';
end $$;
reset role;

set local role anon;
set local request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from public.contenus) = 2, 'deux contenus publiés visibles';
end $$;
select pg_temp.attendre_erreur($q$delete from public.contenus$q$, 'permission denied');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e7';
update public.contenus set statut = 'depublie' where id = 'c0000000-0000-0000-0000-0000000000a1';
delete from public.contenus where type = 'video';
reset role;
set local role anon;
set local request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from public.contenus) = 0, 'dépublié et supprimé : plus rien de public';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.audit_logs where entite = 'contenus') >= 5, 'modifications tracées';
end $$;

select 'TESTS CONTENUS PASSÉS' as resultat;
rollback;
