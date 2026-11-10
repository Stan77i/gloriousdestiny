-- Glorious Destiny — Phase 6 : message WhatsApp de commande (architecture, section H).
-- Le texte est construit par le serveur à partir de la commande ENREGISTRÉE :
-- ce que la cliente envoie est exactement ce qui est en base, sans recopie.

-- Montant lisible : 19000 -> « 19 000 FCFA ».
create or replace function private.fcfa(p_montant integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(to_char(p_montant, 'FM999,999,999,990'), ',', ' ') || ' FCFA';
$$;

create or replace function private.message_whatsapp(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select concat_ws(
    E'\n',
    'Bonjour Glorious Destiny,',
    'je confirme ma commande ' || o.reference || ' :',
    '',
    (
      select string_agg(
        '• ' || cl.nom_snapshot || ' × ' || cl.quantite || ' : ' || private.fcfa(cl.total_ligne_fcfa),
        E'\n' order by cl.nom_snapshot
      )
      from public.commande_lignes cl where cl.commande_id = o.id
    ),
    '',
    'Total : ' || private.fcfa(o.total_fcfa) || ' (paiement à la livraison)',
    '',
    'Nom : ' || c.nom,
    'Téléphone : ' || c.telephone,
    'Livraison : ' || concat_ws(', ', l.adresse, l.quartier, v.nom),
    'Repère : ' || l.point_de_repere,
    '',
    'Merci de me confirmer la livraison.'
  )
  from public.commandes o
  join public.clientes c on c.id = o.cliente_id
  left join lateral (
    select * from public.livraisons x where x.commande_id = o.id order by x.created_at desc limit 1
  ) l on true
  left join public.villes v on v.id = l.ville_id
  where o.id = p_id;
$$;

-- Le message est généré au moment de la création (il ne dépend que de la commande figée).
alter table public.commandes alter column message_whatsapp_genere_at set default now();

-- Le résumé public renvoie désormais le message prêt à envoyer.
create or replace function private.resume_commande(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'reference', o.reference,
    'statut', o.statut,
    'statut_paiement', o.statut_paiement,
    'devise', o.devise,
    'sous_total_fcfa', o.sous_total_fcfa,
    'frais_livraison_fcfa', o.frais_livraison_fcfa,
    'total_fcfa', o.total_fcfa,
    'created_at', o.created_at,
    'reservation_expire_at', o.reservation_expire_at,
    'message_whatsapp', private.message_whatsapp(o.id),
    'message_whatsapp_ouvert_at', o.message_whatsapp_ouvert_at,
    'cliente', jsonb_build_object('nom', c.nom, 'telephone', c.telephone),
    'livraison', (
      select jsonb_build_object(
        'ville', v.nom, 'quartier', l.quartier, 'adresse', l.adresse,
        'point_de_repere', l.point_de_repere, 'telephone', l.telephone, 'statut', l.statut,
        'expediee_at', l.expediee_at, 'livree_at', l.livree_at
      )
      from public.livraisons l join public.villes v on v.id = l.ville_id
      where l.commande_id = o.id
      order by l.created_at desc
      limit 1
    ),
    'lignes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'variante_id', cl.variante_id, 'nom', cl.nom_snapshot, 'quantite', cl.quantite,
        'prix_unitaire_fcfa', cl.prix_unitaire_snapshot_fcfa, 'total_fcfa', cl.total_ligne_fcfa
      ) order by cl.nom_snapshot)
      from public.commande_lignes cl where cl.commande_id = o.id
    ), '[]'::jsonb)
  )
  from public.commandes o join public.clientes c on c.id = o.cliente_id
  where o.id = p_id;
$$;

-- La cliente a ouvert WhatsApp (clic). On ne peut pas savoir si le message est parti
-- (lien wa.me sans API) : on trace l'ouverture, une seule fois.
create or replace function public.signaler_ouverture_whatsapp(p_reference text, p_telephone text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with cible as (
    select o.id from public.commandes o join public.clientes c on c.id = o.cliente_id
    where o.reference = upper(trim(p_reference)) and c.telephone = trim(p_telephone)
  ), maj as (
    update public.commandes set message_whatsapp_ouvert_at = now()
    where id in (select id from cible) and message_whatsapp_ouvert_at is null
    returning id
  )
  select exists (select 1 from cible);
$$;
revoke all on function public.signaler_ouverture_whatsapp(text, text) from public;
grant execute on function public.signaler_ouverture_whatsapp(text, text) to anon, authenticated;

-- L'équipe relit le message exact reçu (ou à recevoir) de la cliente.
create or replace function public.message_whatsapp_commande(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['ventes', 'logistique']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  return private.message_whatsapp(p_id);
end;
$$;
revoke all on function public.message_whatsapp_commande(uuid) from public, anon;
grant execute on function public.message_whatsapp_commande(uuid) to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel() to authenticated, anon;
