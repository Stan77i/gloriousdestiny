-- Glorious Destiny — données de référence réelles (aucun produit, aucune commande).
insert into public.villes (nom, pays, indicatif, devise, fuseau, ordre) values
  ('Douala', 'CM', '+237', 'XAF', 'Africa/Douala', 1),
  ('Yaoundé', 'CM', '+237', 'XAF', 'Africa/Douala', 2),
  ('Garoua', 'CM', '+237', 'XAF', 'Africa/Douala', 3),
  ('Abidjan', 'CI', '+225', 'XOF', 'Africa/Abidjan', 4)
on conflict (nom) do nothing;

insert into public.emplacements (code, nom) values ('principal', 'Stock principal')
on conflict (code) do nothing;

insert into public.parametres (cle, valeur, public) values
  ('whatsapp_lien', to_jsonb('https://wa.me/message/IJXZX7ST64EGG1'::text), true),
  ('whatsapp_numero', 'null'::jsonb, true),
  ('delai_expiration_reservation_heures', to_jsonb(48), false),
  ('delai_min_reservation_rdv_heures', to_jsonb(2), true),
  ('delai_annulation_rdv_heures', to_jsonb(24), true),
  ('fuseau_salon', to_jsonb('Africa/Douala'::text), true)
on conflict (cle) do nothing;
