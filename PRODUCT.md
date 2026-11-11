# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Femmes actives en ville** (Douala, Yaoundé, Garoua, Abidjan) : découvrent, achètent et réservent depuis leur téléphone, souvent sur réseau mobile.
- **Coiffeuses et professionnelles** : achètent la gamme pro (Lace Glue, Wax Stick…) pour leurs propres clientes ; reviennent commander.
- **Diaspora et cadeaux** : personnes à l'étranger qui commandent pour une proche au pays.
- **Équipe Glorious Destiny** (rôles owner, admin, ventes, stock, logistique) : confirme les commandes WhatsApp, gère stock, livraisons, rendez-vous et chiffres.

## Product Purpose

Plateforme officielle de Glorious Destiny : vitrine premium, catalogue, commande transmise sur WhatsApp sans recopie, prise de rendez-vous au salon, et outil d'administration (stock, livraisons, clientes, statistiques, prévisions). Le succès : une cliente commande ou réserve en quelques gestes sur mobile, et l'équipe ne perd aucune commande ni aucune unité de stock.

## Positioning

Une marque qui réunit à la fois sa propre gamme professionnelle, la vente de perruques haut de gamme, le savoir-faire de pose (perruques et cils) au salon, et le suivi après achat (conseil, livraison, entretien).

## Operating Context

- Paiement uniquement à la livraison (espèces ou Mobile Money) ; aucun paiement en ligne.
- Livraison par agences dans huit pays : Cameroun, Côte d'Ivoire, Gabon, Congo, Sénégal, Guinée, Canada et Royaume-Uni. Le site n'affiche aucun frais de livraison : la cliente les règle directement auprès de l'agence.
- La commande est finalisée sur WhatsApp ; elle est enregistrée en base avant l'ouverture de WhatsApp.
- Un seul salon pour les rendez-vous (ville à confirmer).
- Devise affichée : FCFA partout. Une commande hors zone CFA est libellée en XAF ; la conversion locale se convient sur WhatsApp.
- Site d'abord, puis PWA, puis application mobile.

## Capabilities and Constraints

- Catalogue : dix-neuf produits, saisis par l'administration (aucun produit codé en dur). On y trouve la gamme professionnelle d'origine (Lace Glue, Lace Melting Spray, Lace Glue Remover Spray, Glue Residue Remover Shampoo, Wax Stick, Hair Curl Mousse, Braid Gel), les produits de pose et de coiffage Glue Liquid Gel, Hair Styling Gel et Silkening Mist (publié depuis la confirmation de la cliente, le 11/11/2026), la Colle pour extension de cils, sept accessoires cils (faux cils en bande, grappes, kit d'extensions) et le coffret « La gamme Glorious Destiny ». Ne jamais en inventer.
- Plusieurs produits existent en plusieurs formats, chacun avec son prix et son stock : Lace Glue (38, 60 et 150 ml), Lace Melting Spray (130 et 180 ml), Lace Glue Remover Spray (30 et 50 ml), Wax Stick (petit et grand format). Les prix détaillés vivent dans la base, pas dans ce document.
- Prix et formats communiqués par la cliente le 11/11/2026 ; stock initial de 40 par nouveau format.
- Perruques : aucune en stock actuellement. La page affiche l'état « Rupture de stock » et propose d'être prévenue sur WhatsApp au retour des modèles.
- Promotions : pourcentage ou prix promotionnel, sur un produit ou un format, avec date de début et date de fin facultative. Le site n'affiche un ancien prix, une économie et un compte à rebours que pendant une promotion réelle ; le serveur calcule le prix effectif et le facture.
- Stock : quantités physique, réservé et disponible. Chaque modification manuelle ouvre une fenêtre de 5 minutes ; ensuite l'article se verrouille et un déverrouillage motivé est exigé. Les ajustements sont gardés (pas de stock négatif, pas de sortie sous les réservations, confirmation des fortes baisses), et l'historique garde les quantités avant et après.
- Langue : français.
- Architecture et règles métier : docs/ARCHITECTURE.md (validé).

## Brand Commitments

- Nom : GLORIOUS DESTINY.
- Univers : luxe, beauté, féminité, élégance, sophistication, confiance, qualité.
- Couleurs imposées : noir profond, doré ; ivoire en secondaire.
- Direction : premium, moderne, éditoriale, minimaliste, élégante.
- Interdit : les clichés visuels des salons de coiffure.
- Référence de style donnée par le client pour l'interface : le tableau de bord Caelo (fond noir chaud, doré miel, police géométrique).

## Evidence on Hand

- 7 visuels produits détourés (fond transparent), fournis par le client.
- Logo : à fournir par le client.
- Photos : le client enverra des photos générées par IA, utilisables sur le site.
- Aucun avis client, chiffre ou témoignage fourni : ne pas en inventer.

## Product Principles

1. Le mobile d'abord : chaque parcours doit fonctionner d'une main, sur un réseau lent.
2. Rien d'affiché qui ne soit relié au système : pas de fausse donnée, pas de fausse fonctionnalité.
3. La marque se lit dans la précision : sobriété, matières, détails, jamais la surcharge.
4. Deux publics, un langage : la cliente et la professionnelle doivent toutes deux s'y retrouver.
5. L'équipe d'abord efficace : l'administration privilégie la lisibilité et la vitesse.

## Accessibility & Inclusion

Contrastes lisibles en plein soleil sur téléphone ; cibles tactiles d'au moins 44 px ; navigation clavier et lecteurs d'écran dans l'administration.
