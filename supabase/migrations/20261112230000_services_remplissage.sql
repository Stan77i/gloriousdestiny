-- Glorious Destiny — les quatre prestations (pose frontale, traitement, coloration, montage)
-- sont les seuls services proposés. Les trois services de départ (pose de perruque, pose de
-- cils, entretien de perruque) servaient de remplissage : ils sont retirés du site.
-- Rien n'est supprimé : ils sont archivés et masqués, l'historique reste intact.
update public.services
set publie = false, archive_at = coalesce(archive_at, now())
where slug in ('pose-de-perruque', 'pose-de-cils', 'entretien-de-perruque');
