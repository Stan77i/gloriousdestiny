-- Glorious Destiny — données de référence réelles (aucun produit, aucune commande).
-- Frais et délais : valeurs d'EXEMPLE (tarif_exemple = true), à remplacer dans l'admin.
insert into public.villes (nom, pays, indicatif, devise, fuseau, ordre,
  frais_livraison_fcfa, delai_min_jours, delai_max_jours, mode_livraison, precision_livraison) values
  ('Douala', 'CM', '+237', 'XAF', 'Africa/Douala', 1, 1500, 0, 1, 'livreur', 'Livraison à domicile par notre livreur.'),
  ('Yaoundé', 'CM', '+237', 'XAF', 'Africa/Douala', 2, 2500, 1, 2, 'agence', 'Envoi par agence de transport.'),
  ('Garoua', 'CM', '+237', 'XAF', 'Africa/Douala', 3, 4000, 2, 4, 'agence', 'Envoi par agence de transport.'),
  ('Abidjan', 'CI', '+225', 'XOF', 'Africa/Abidjan', 4, 10000, 5, 10, 'international', 'Envoi international : délai confirmé sur WhatsApp.')
on conflict (nom) do nothing;

insert into public.emplacements (code, nom) values ('principal', 'Stock principal')
on conflict (code) do nothing;

insert into public.parametres (cle, valeur, public) values
  ('whatsapp_lien', to_jsonb('https://wa.me/message/IJXZX7ST64EGG1'::text), true),
  ('whatsapp_numero', to_jsonb('+237674350735'::text), true),
  ('delai_expiration_reservation_heures', to_jsonb(48), false),
  ('delai_min_reservation_rdv_heures', to_jsonb(2), true),
  ('delai_annulation_rdv_heures', to_jsonb(24), true),
  ('fuseau_salon', to_jsonb('Africa/Douala'::text), true)
on conflict (cle) do nothing;
