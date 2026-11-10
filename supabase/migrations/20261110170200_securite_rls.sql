-- Glorious Destiny — sécurité (section K).
-- Les tables ne sont pas exposées automatiquement : chaque droit est accordé ici.
-- RLS activée partout ; politique par défaut = refus.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'villes', 'emplacements', 'parametres', 'clientes', 'adresses_clientes',
    'categories', 'produits', 'variantes', 'images_produits', 'stocks', 'mouvements_stock',
    'fournisseurs', 'receptions', 'reception_lignes', 'services', 'disponibilites_services',
    'exceptions_disponibilite', 'rendez_vous', 'commandes', 'commande_lignes', 'livraisons', 'audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

revoke all on sequence public.commandes_reference_seq from anon, authenticated;
-- Fonctions internes : aucune exécution par défaut, sauf les trois tests de rôle utilisés par les politiques.
revoke execute on all functions in schema private from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;
grant usage on schema private to authenticated, anon;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Catalogue et référentiels publics : lecture du contenu publié.
-- ---------------------------------------------------------------------------
grant select on public.villes, public.categories, public.produits, public.variantes,
  public.images_produits, public.services, public.disponibilites_services,
  public.exceptions_disponibilite, public.parametres
  to anon, authenticated;

create policy villes_lecture on public.villes for select to anon, authenticated
  using (actif or (select private.est_staff()));
create policy categories_lecture on public.categories for select to anon, authenticated
  using (publiee or (select private.est_staff()));
create policy produits_lecture on public.produits for select to anon, authenticated
  using ((publie and archive_at is null) or (select private.est_staff()));
create policy variantes_lecture on public.variantes for select to anon, authenticated
  using (
    (select private.est_staff())
    or (actif and exists (
      select 1 from public.produits p where p.id = produit_id and p.publie and p.archive_at is null
    ))
  );
create policy images_lecture on public.images_produits for select to anon, authenticated
  using (
    (select private.est_staff())
    or exists (select 1 from public.produits p where p.id = produit_id and p.publie and p.archive_at is null)
  );
create policy services_lecture on public.services for select to anon, authenticated
  using ((publie and archive_at is null) or (select private.est_staff()));
create policy disponibilites_lecture on public.disponibilites_services for select to anon, authenticated
  using (actif or (select private.est_staff()));
create policy exceptions_lecture on public.exceptions_disponibilite for select to anon, authenticated
  using (true);
create policy parametres_lecture on public.parametres for select to anon, authenticated
  using (public or (select private.est_staff()));

-- Écriture du catalogue : admin et owner (a_role sans rôle supplémentaire).
grant insert, update on public.categories, public.produits, public.variantes, public.services,
  public.disponibilites_services, public.exceptions_disponibilite, public.villes
  to authenticated;
grant insert, update, delete on public.images_produits to authenticated;
grant insert, update on public.parametres to authenticated;

do $$
declare t text;
begin
  foreach t in array array['categories', 'produits', 'variantes', 'services', 'disponibilites_services', 'exceptions_disponibilite', 'villes', 'images_produits', 'parametres']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.a_role(array[]::text[])))', t || '_ajout_admin', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.a_role(array[]::text[]))) with check ((select private.a_role(array[]::text[])))', t || '_modif_admin', t);
  end loop;
end;
$$;
create policy images_suppression_admin on public.images_produits for delete to authenticated
  using ((select private.a_role(array[]::text[])));
grant delete on public.exceptions_disponibilite to authenticated;
create policy exceptions_suppression_admin on public.exceptions_disponibilite for delete to authenticated
  using ((select private.a_role(array[]::text[])));

-- ---------------------------------------------------------------------------
-- Personnel
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;
create policy profiles_lecture on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.a_role(array[]::text[])));
-- Seul l'owner gère les comptes et les rôles.
create policy profiles_ajout_owner on public.profiles for insert to authenticated
  with check ((select private.role_actuel()) = 'owner');
create policy profiles_modif_owner on public.profiles for update to authenticated
  using ((select private.role_actuel()) = 'owner')
  with check ((select private.role_actuel()) = 'owner');

-- ---------------------------------------------------------------------------
-- Stock (lecture staff ; écriture uniquement via fonctions)
-- ---------------------------------------------------------------------------
grant select on public.stocks, public.mouvements_stock, public.emplacements to authenticated;
create policy stocks_lecture_staff on public.stocks for select to authenticated
  using ((select private.est_staff()));
create policy mouvements_lecture_staff on public.mouvements_stock for select to authenticated
  using ((select private.est_staff()));
create policy emplacements_lecture_staff on public.emplacements for select to authenticated
  using ((select private.est_staff()));

grant select, insert, update on public.fournisseurs to authenticated;
grant select on public.receptions, public.reception_lignes to authenticated;
create policy fournisseurs_lecture on public.fournisseurs for select to authenticated
  using ((select private.a_role(array['stock'])));
create policy fournisseurs_ajout on public.fournisseurs for insert to authenticated
  with check ((select private.a_role(array['stock'])));
create policy fournisseurs_modif on public.fournisseurs for update to authenticated
  using ((select private.a_role(array['stock']))) with check ((select private.a_role(array['stock'])));
create policy receptions_lecture on public.receptions for select to authenticated
  using ((select private.a_role(array['stock'])));
create policy reception_lignes_lecture on public.reception_lignes for select to authenticated
  using ((select private.a_role(array['stock'])));

-- ---------------------------------------------------------------------------
-- Clientes, commandes, livraisons, rendez-vous
-- Création réservée aux fonctions RPC (Phases 5, 6, 9). Lecture : la cliente
-- voit ses propres données ; le staff selon son rôle.
-- ---------------------------------------------------------------------------
grant select on public.clientes, public.adresses_clientes, public.commandes,
  public.commande_lignes, public.livraisons, public.rendez_vous to authenticated;

create policy clientes_lecture on public.clientes for select to authenticated
  using (auth_user_id = (select auth.uid()) or (select private.est_staff()));
create policy adresses_lecture on public.adresses_clientes for select to authenticated
  using (
    (select private.est_staff())
    or exists (select 1 from public.clientes c where c.id = cliente_id and c.auth_user_id = (select auth.uid()))
  );
create policy commandes_lecture on public.commandes for select to authenticated
  using (
    (select private.a_role(array['ventes', 'logistique']))
    or exists (select 1 from public.clientes c where c.id = cliente_id and c.auth_user_id = (select auth.uid()))
  );
create policy commande_lignes_lecture on public.commande_lignes for select to authenticated
  using (
    (select private.a_role(array['ventes', 'logistique', 'stock']))
    or exists (
      select 1 from public.commandes o join public.clientes c on c.id = o.cliente_id
      where o.id = commande_id and c.auth_user_id = (select auth.uid())
    )
  );
create policy livraisons_lecture on public.livraisons for select to authenticated
  using (
    (select private.a_role(array['ventes', 'logistique']))
    or exists (
      select 1 from public.commandes o join public.clientes c on c.id = o.cliente_id
      where o.id = commande_id and c.auth_user_id = (select auth.uid())
    )
  );
create policy rendez_vous_lecture on public.rendez_vous for select to authenticated
  using (
    (select private.a_role(array['ventes']))
    or exists (select 1 from public.clientes c where c.id = cliente_id and c.auth_user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Audit : lecture admin/owner uniquement.
-- ---------------------------------------------------------------------------
grant select on public.audit_logs to authenticated;
create policy audit_lecture_admin on public.audit_logs for select to authenticated
  using ((select private.a_role(array[]::text[])));
