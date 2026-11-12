-- Glorious Destiny — cinquième prestation (donnée par la cliente le 12/11/2026) :
-- ventilation de frontale ou de perruque « prête à porter », 3 000 FCFA, sur demande.
insert into public.services (slug, nom, description, type, duree_minutes, prix_fcfa, publie, mode_reservation, ordre)
values (
  'ventilation-frontale-perruque',
  'Ventilation de frontale / perruque',
  'La ventilation est une façon d’arranger votre frontale ou votre perruque « prête à porter ». Elle redonne vie à une frontale ou à une perruque un peu usée, pour la porter de nouveau avec plaisir.',
  'perruque', null, 3000, true, 'demande', 5
)
on conflict (slug) do nothing;
