# GLORIOUS DESTINY — Document d'architecture (Phase 1)

Statut : **validé par le client le 10/11/2026 (décisions 1 à 7 de la section O), soumis à son audit**. Version 1.1 : intègre les réponses du client (devise, villes, paiement, WhatsApp, catégories, livraison).

Sommaire : A. Architecture générale · B. Pages publiques · C. Espace cliente · D. Espace administrateur · E. Modules métier · F. Base de données · G. Logique du stock · H. Logique WhatsApp · I. Logique rendez-vous · J. Prévisions · K. Sécurité · L. Structure des fichiers · M. Risques · N. Roadmap · O. Décisions à valider

---

## A. Architecture générale

```
┌──────────────────────────────┐        ┌────────────────────────────────────────┐
│ Application web (React+TS)   │        │ Supabase                               │
│                              │  HTTPS │  - Auth (staff + clientes optionnelles)│
│ • Site public (SEO, rapide)  │◄──────►│  - PostgreSQL (source de vérité)       │
│ • Panier (localStorage)      │        │    · tables + contraintes + RLS        │
│ • Espace cliente             │        │    · fonctions RPC (transactions)      │
│ • /admin (dashboard, stock…) │        │  - Storage (images produits)           │
│ • Prête pour PWA (phase 12)  │        │  - Edge Functions (jobs, webhooks)     │
└──────────────┬───────────────┘        │  - pg_cron (expirations, prévisions)   │
               │                        └────────────────────────────────────────┘
               │ lien wa.me pré-rempli
               ▼
        WhatsApp (la cliente envoie le message elle-même)
```

Principes :

1. **La base de données est l'arbitre.** Les règles critiques (stock, réservation, prix, disponibilité des créneaux) sont appliquées dans PostgreSQL, dans des fonctions RPC exécutées en transaction. Le navigateur ne fait jamais de calcul qui fait autorité : il affiche, il demande, il ne décide pas.
2. **Une seule application** pour le public et l'administration, séparées par des routes et des rôles. Pas de deuxième projet à maintenir au début.
3. **Historique jamais effacé.** Les commandes, mouvements de stock et rendez-vous ne sont pas supprimés ; ils sont annulés ou archivés.
4. **Données figées à la commande.** Nom, prix et adresse sont copiés dans la commande au moment où elle est créée. Une modification ultérieure du catalogue ou d'une adresse ne réécrit pas le passé.
5. **Pas de fausse donnée.** Les prévisions et statistiques affichent « données insuffisantes » tant que le volume d'historique n'est pas suffisant.

Choix techniques proposés (à valider) :

| Besoin | Choix proposé | Pourquoi |
|---|---|---|
| Interface | React + TypeScript + Vite | Demandé ; base solide pour la PWA ensuite |
| Style | Tailwind CSS + composants maison minimalistes | Demandé ; design system contrôlé |
| Routage | React Router | Standard, supporte routes publiques et protégées |
| Données côté client | TanStack Query | Cache, états loading/error, invalidation après mutation |
| Formulaires | React Hook Form + Zod | Validation identique côté client (UX) et schéma partagé |
| Backend | Supabase (Postgres, Auth, Storage) | Demandé ; Postgres permet les transactions et contraintes |
| Logique critique | Fonctions SQL (RPC) `SECURITY DEFINER` | Atomicité, pas de contournement depuis le navigateur |
| Tâches planifiées | pg_cron + Edge Function si besoin | Expiration des réservations, recalcul des prévisions |
| Tests | Vitest + Testing Library (front), Playwright (parcours), pgTAP (base) | Couvre UI, parcours réels et règles de stock |
| Paiement | **Aucun paiement sur le site** (validé) | Commande finalisée sur WhatsApp ; paiement à la livraison en espèces ou Mobile Money, enregistré dans l'admin |
| WhatsApp | **Lien `wa.me` en V1**, pas d'API WhatsApp Business | Pas de coût ni de vérification ; l'API pourra venir après |

---

## B. Pages publiques

Chaque page indique son objectif, son contenu, ses actions et les données nécessaires.

### B1. Accueil `/`
- **Objectif** : donner l'image premium et orienter vers catalogue, services, rendez-vous.
- **Contenu** : bannière éditoriale, deux portes d'entrée (Perruques / Cils), produits phares, bloc services, bloc confiance (qualité, livraison, contact), appel WhatsApp.
- **Actions** : aller au catalogue, prendre rendez-vous, ouvrir WhatsApp.
- **Données** : produits publiés et mis en avant, services actifs, paramètres boutique (numéro WhatsApp, horaires).

### B2. Catalogue `/catalogue`
- **Objectif** : parcourir tous les produits et services.
- **Contenu** : filtres par catégorie (Perruques, Cils, Produits & soins, Services), tri, recherche par nom.
- **Actions** : filtrer, ouvrir une fiche, ajouter au panier.
- **Données** : produits publiés, catégories, stock disponible (affichage « Disponible » / « Épuisé » seulement, jamais la quantité exacte).

### B3. Perruques `/perruques`
- **Objectif** : présenter la vente de perruques.
- **Contenu** : liste des perruques, filtres (longueur, texture, couleur), explication des options.
- **Actions** : ouvrir une fiche, demander conseil via WhatsApp.
- **Données** : produits de type `perruque` avec variantes et attributs.

### B4. Fiche perruque `/perruques/:slug`
- **Objectif** : vendre une perruque précise.
- **Contenu** : photos, nom, description, attributs, variantes (taille, couleur, longueur), prix, disponibilité, conseils d'entretien.
- **Actions** : choisir une variante, choisir une quantité, ajouter au panier, demander conseil, prendre rendez-vous pour la pose.
- **Données** : produit, variantes, images, disponibilité (`disponible` = stock disponible > 0).

### B5. Produits `/produits` et fiche `/produits/:slug`
- **Objectif** : présenter les 7 produits officiels de la gamme.
- **Contenu** : nom, format (ex. 200 ml), usage, mode d'emploi, photo, prix, disponibilité.
- **Actions** : ajouter au panier, voir les produits liés.
- **Données** : produits de type `produit`, variantes éventuelles (format).

### B6. Cils `/cils`
- **Objectif** : présenter la pose de cils.
- **Contenu** : explication de la prestation, durée, tarif, déroulé, entretien. Accessoires cils affichés seulement quand il y en aura au catalogue (aucun parmi les 7 produits actuels).
- **Actions** : réserver une pose, poser une question sur WhatsApp.
- **Données** : services de type `cils`, produits de type `accessoire_cils` (vide pour l'instant).

### B7. Services `/services` et `/services/:slug`
- **Objectif** : présenter les prestations (pose de perruque, entretien, pose de cils).
- **Contenu** : description, durée, prix, ce qui est inclus, photos avant/après (si autorisées), FAQ du service.
- **Actions** : réserver un créneau, poser une question.
- **Données** : `services`, images, durée, prix.

### B8. Prise de rendez-vous `/rendez-vous`
- **Objectif** : réserver une prestation.
- **Contenu** : choix du service, puis date, puis créneau, puis coordonnées.
- **Actions** : choisir service, date, créneau ; saisir nom, téléphone, notes ; confirmer.
- **Données** : services, disponibilités calculées (voir I), clientes.

### B9. Panier `/panier`
- **Objectif** : réviser sa sélection avant commande.
- **Contenu** : lignes (produit, variante, quantité, prix), sous-total, mention « frais de livraison convenus sur WhatsApp si applicables », avertissement si un article n'est plus disponible.
- **Actions** : modifier la quantité, retirer une ligne, passer à la commande.
- **Données** : panier local (identifiant de variante + quantité), prix et disponibilité **revérifiés côté serveur**.

### B10. Commande `/commande`
- **Objectif** : enregistrer la commande et ouvrir WhatsApp.
- **Contenu** : formulaire (nom, téléphone, ville, quartier, adresse, point de repère, notes), récapitulatif.
- **Actions** : valider la commande, ouvrir WhatsApp.
- **Données** : clientes, adresses, commande (voir H).

### B11. Confirmation de commande `/commande/:reference`
- **Objectif** : confirmer que la commande est enregistrée et permettre de la renvoyer sur WhatsApp.
- **Contenu** : référence (ex. `GD-2611-0042`), récapitulatif, statut, bouton « Renvoyer sur WhatsApp ».
- **Actions** : renvoyer le message WhatsApp, copier la référence.
- **Données** : commande (lecture limitée par référence + téléphone pour éviter l'accès par simple devinette de référence).

### B12. Contact `/contact`
- **Objectif** : poser une question ou laisser une demande.
- **Contenu** : formulaire, coordonnées, lien WhatsApp, horaires, adresse du salon si applicable.
- **Actions** : envoyer un message, ouvrir WhatsApp.
- **Données** : `messages_contact` (à créer si l'on garde les demandes en base ; sinon envoi via WhatsApp uniquement).

### B13. Pages d'information
- `/a-propos` : histoire et valeurs de la marque.
- `/faq` : questions fréquentes (entretien, pose, livraison, délais).
- `/livraison` : villes desservies, délais, frais, conditions de retour.
- `/mentions-legales` et `/politique-confidentialite` : obligations légales et traitement des données personnelles.
- **Données** : contenu éditorial, géré depuis l'administration (table `pages_contenu`) ou figé au départ.

### B14. Connexion `/connexion`
- **Objectif** : accès à l'espace cliente et à l'administration.
- **Actions** : connexion par téléphone ou e-mail (code à usage unique), mot de passe pour le staff.

---

## C. Espace cliente `/compte`

Compte **optionnel**. La cliente peut commander sans compte (commande invitée). Le compte sert au suivi.

Ce que la cliente peut faire :
- voir l'historique de ses commandes et leur statut ;
- voir ses livraisons (statut, date d'expédition, date de livraison) ;
- voir et modifier ses adresses ;
- voir et annuler ses rendez-vous à venir (dans le délai autorisé) ;
- voir son historique de rendez-vous ;
- renvoyer une commande sur WhatsApp ;
- se déconnecter.

Ce qu'elle ne peut pas faire : voir le stock, les marges, les autres clientes, les notes internes.

Lien commande invitée → compte : si une cliente crée un compte avec le même téléphone, ses commandes passées sont rattachées automatiquement après vérification par code SMS ou WhatsApp.

---

## D. Espace administrateur `/admin`

Accès réservé aux rôles staff (voir K). Chaque écran a un état loading, empty et error.

### D1. Tableau de bord (centre de contrôle)
- Chiffre d'affaires (jour, semaine, mois, période choisie).
- Nombre de commandes et leur répartition par statut.
- Ventes et tendance par rapport à la période précédente.
- Stock : produits épuisés, bientôt épuisés (seuil d'alerte), valeur de stock disponible si les coûts sont saisis.
- Rendez-vous du jour et de la semaine ; rendez-vous non confirmés.
- Livraisons en cours et en retard.
- Clientes : nouvelles, récurrentes.
- Ventes par ville ; produits les plus vendus et les moins vendus ; panier moyen.
- Alertes : commandes non confirmées depuis plus de X heures, réservations proches d'expiration.

### D2. Commandes
- Liste filtrable (statut, canal web/WhatsApp, ville, date, recherche par référence ou téléphone).
- Détail : lignes, client, adresse, historique des statuts, mouvements de stock liés, notes internes.
- Actions : confirmer, marquer expédiée, marquer livrée, annuler (avec motif), créer un retour, ajouter une note, renvoyer le message WhatsApp.
- Vue spéciale « À confirmer » pour les commandes WhatsApp non confirmées.

### D3. Clientes
- Liste, recherche (nom, téléphone, ville).
- Fiche : coordonnées, adresses, commandes, rendez-vous, total dépensé, notes internes.
- Fusion de doublons (même personne, deux téléphones) — action tracée.

### D4. Catalogue et produits
- Créer, modifier, publier / dépublier, archiver un produit (jamais supprimer s'il a des commandes).
- Gérer les variantes (taille, couleur, longueur, format).
- Gérer les images (ordre, texte alternatif).
- Définir prix, seuil d'alerte, délai d'approvisionnement, stock de sécurité.

### D5. Services et rendez-vous
- Gérer les services (durée, prix, temps tampon, visibilité).
- Définir les horaires hebdomadaires et les exceptions (fermetures, jours fériés).
- Vue calendrier (jour / semaine), liste, créer / modifier / confirmer / annuler / marquer terminé ou absent.

### D6. Stock
- Vue par produit et variante : physique, réservé, disponible.
- Entrée de stock (réception fournisseur).
- Perte / casse (avec motif obligatoire).
- Correction après inventaire (avec double validation si l'écart est important).
- Journal des mouvements (filtrable, exportable, jamais modifiable).

### D7. Livraisons
- Liste des livraisons par statut (à préparer, expédiée, livrée, échec, retour).
- Filtres par ville, quartier, date d'expédition, date de livraison.
- Actions : marquer expédiée, livrée, échec (avec motif), retour.

### D8. Fournisseurs
- Liste, fiche (contact, ville, notes), historique des réceptions de stock.

### D9. Statistiques et prévisions
- Ventes quotidiennes, hebdomadaires, mensuelles.
- Tableau des produits : vitesse de vente, stock disponible, jours avant rupture, date estimée de rupture, quantité recommandée.
- Classification : populaire, en croissance, en baisse, dormant, à risque de rupture.
- Villes : volume et chiffre d'affaires (rentabilité seulement si les coûts sont saisis).
- Clientes récurrentes.
- Exports CSV.

### D10. Paramètres (rôle admin ou owner)
- Informations boutique, numéro WhatsApp, horaires.
- Délai d'expiration des réservations (en heures).
- Villes desservies (Douala, Yaoundé, Garoua, Abidjan) : activer, désactiver, en ajouter.
- Utilisateurs et rôles.
- Modèles de messages WhatsApp.

### D11. Journal d'audit
- Qui a fait quoi, quand (connexions staff, changements de prix, de rôles, de stock, annulations).
- Lecture seule.

---

## E. Modules métier

Pour chaque module : responsabilité, entités, règles principales.

**E1. Catalogue** — Regroupe produits, variantes, images, catégories. Un produit est publié (visible) ou non, actif ou archivé. Un produit archivé reste visible dans l'historique des commandes. Les 7 produits officiels sont saisis par l'administration, pas codés en dur.

**E2. Produits** — Type `produit`. Deux catégories pour la gamme actuelle : **Pose de perruque** (Lace Glue, Lace Melting Spray, Lace Glue Remover Spray, Glue Residue Remover Shampoo) et **Coiffage** (Hair Curl Mousse, Wax Stick, Braid Gel). Les produits « Lace » sont des produits de perruque (validé). Un produit a un SKU unique, un prix, des variantes optionnelles (format : 200 ml, 250 g…).

**E3. Perruques** — Type `perruque`. Attributs : longueur, texture, couleur, densité, type de dentelle (lace), taille du bonnet. Chaque combinaison vendable est une variante avec son propre SKU et son propre stock. Attributs stockés en colonnes ou en `jsonb` validé ; à trancher (voir O).

**E4. Services** — Pose de perruque, entretien de perruque, pose de cils, etc. Un service a une durée, un prix, un temps tampon avant/après, une liste de disponibilités. Un service n'a pas de stock.

**E5. Cils** — Pour l'instant, uniquement la *prestation* (service, rendez-vous). Le type `accessoire_cils` existe pour de futurs produits ajoutés depuis l'admin.

**E6. Panier** — Local au navigateur (pas de stock, pas de réservation). Contient uniquement `variant_id` et `quantité`. Au moment de la commande, le serveur recalcule tout.

**E7. Commandes** — Entité centrale. Une commande a une référence lisible, un client (ou invité), une adresse figée, des lignes figées, un canal (web / WhatsApp), un statut, des dates clés, un total calculé par le serveur. Voir G et H pour les règles.

**E8. WhatsApp** — Génère le message à partir de la commande enregistrée ; ouvre le lien `wa.me`. Enregistre le moment d'ouverture. Ne peut pas savoir si le message a été envoyé (limite de WhatsApp sans API). Voir H.

**E9. Clientes** — Identifiées par téléphone normalisé (format international, +237 par défaut). Un téléphone = une cliente active. Doublons traités par fusion.

**E10. Adresses** — Rattachées à une cliente. Une commande copie l'adresse choisie ; la modification d'une adresse ne change pas les commandes passées.

**E11. Livraisons** — Une livraison par commande expédiable. Contient l'adresse figée, le statut logistique et les dates. Une commande peut avoir une livraison annulée puis une nouvelle (ex. nouvelle tentative).

**E12. Rendez-vous** — Voir I.

**E13. Stock** — Voir G. Solde (physique, réservé, disponible) et journal de mouvements.

**E14. Mouvements de stock** — Journal append-only. Chaque ligne : variante, type, variation du physique, variation du réservé, référence (commande, réception, inventaire), motif, auteur, date, clé d'idempotence.

**E15. Fournisseurs** — Coordonnées et historique des réceptions. Une réception génère des mouvements `entrée`.

**E16. Statistiques** — Lecture seule, calculée à partir des commandes et mouvements. Aucune saisie.

**E17. Prévisions** — Voir J.

**E18. Notifications** — V1 : alertes affichées dans le tableau de bord (calculées à la volée). Pas de table dédiée tant que ce n'est pas nécessaire. Plus tard : WhatsApp ou e-mail à l'équipe.

**E19. Logs** — Journal d'audit des actions staff et des changements sensibles (prix, rôles, stock, annulations). Table `audit_logs`, lecture seule.

**E20. Paramètres** — Table `parametres` (clé / valeur typée) : numéro WhatsApp, horaires, délai de réservation, seuils par défaut.

---

## F. Base de données

Conventions : identifiants `uuid` (sauf référence commande lisible) ; dates `timestamptz` en UTC ; montants en **entiers de FCFA** (pas de décimales pour le XAF) ; statuts en `text` avec contrainte `CHECK` (plus simple à faire évoluer qu'un `enum` Postgres) ; `created_at` et `updated_at` partout ; pas de `DELETE` sur les tables commerciales (droits retirés, voir K).

Extensions : `btree_gist` (contrainte d'exclusion sur les créneaux), `pgcrypto` ou `gen_random_uuid()`.

### F1. `profiles` — personnel interne
- Rôle : lier un compte Auth au rôle staff.
- Colonnes : `id` (= `auth.users.id`), `nom`, `role`, `actif`, `created_at`.
- Relations : 1 à 1 avec `auth.users`.
- Contraintes : `role IN ('owner','admin','ventes','stock','logistique')` ; `actif` pour désactiver sans supprimer.

### F2. `clientes`
- Rôle : identité d'une cliente.
- Colonnes : `id`, `auth_user_id` (nullable), `nom`, `telephone` (E.164), `email` (nullable), `notes_internes`, `fusionnee_dans` (nullable, pour les doublons), `created_at`.
- Contraintes : `UNIQUE (telephone)` où `fusionnee_dans IS NULL` (index partiel).

### F3. `adresses_clientes`
- Rôle : adresses réutilisables.
- Colonnes : `id`, `cliente_id`, `ville`, `quartier`, `adresse`, `point_de_repere`, `telephone_alternatif`, `created_at`.
- Relations : n à 1 avec `clientes`.
- Index : `(cliente_id)`.

### F4. `categories`
- Colonnes : `id`, `slug` (unique), `nom`, `type` (`perruque` | `cils` | `produit` | `service`), `ordre`, `publiee`.

### F5. `produits`
- Colonnes : `id`, `sku` (unique), `slug` (unique), `nom`, `description`, `categorie_id`, `type` (`perruque` | `produit` | `accessoire_cils`), `prix_fcfa` (entier ≥ 0), `publie`, `archive_at`, `seuil_alerte` (int), `delai_appro_jours` (int, nullable), `stock_securite_jours` (int, nullable), `created_at`, `updated_at`.
- Relations : n à 1 avec `categories`.
- Contraintes : `prix_fcfa >= 0` ; `seuil_alerte >= 0`.

### F6. `variantes`
- Rôle : chaque combinaison vendable (SKU, stock, prix).
- Colonnes : `id`, `produit_id`, `sku` (unique), `libelle` (ex. « 200 ml », « 18 pouces, blond »), `attributs` (`jsonb`, validé côté serveur), `prix_fcfa` (nullable = prix du produit), `actif`.
- Relations : n à 1 avec `produits`.
- Index : `(produit_id)`.

### F7. `images_produits`
- Colonnes : `id`, `produit_id`, `variante_id` (nullable), `chemin_storage`, `texte_alternatif`, `position`.

### F8. `stocks` — soldes (une ligne par variante et emplacement)
- Colonnes : `variante_id`, `emplacement_id` (si multi-emplacement, sinon un emplacement unique), `physique` (int), `reserve` (int), `disponible` (colonne générée = `physique - reserve`).
- Contraintes : `physique >= 0`, `reserve >= 0`, `reserve <= physique`. Clé primaire `(variante_id, emplacement_id)`.
- Ces contraintes sont la dernière barrière : même si une fonction est mal écrite, la base refuse un stock négatif.

### F9. `mouvements_stock` — journal append-only
- Colonnes : `id`, `variante_id`, `emplacement_id`, `type`, `delta_physique` (int), `delta_reserve` (int), `reference_type` (`commande` | `reception` | `inventaire` | `manuel`), `reference_id`, `motif` (obligatoire pour `perte` et `correction`), `auteur_id`, `cle_idempotence` (unique, nullable), `created_at`.
- Contraintes : `type IN ('entree','reservation','annulation_reservation','vente','retour','perte','correction','transfert','livraison')` ; `delta_physique` et `delta_reserve` ne peuvent pas être nuls en même temps, sauf pour `livraison` (événement tracé).
- Droits : `INSERT` seulement via RPC ; `UPDATE` et `DELETE` interdits (trigger qui lève une erreur).

### F10. `fournisseurs`
- Colonnes : `id`, `nom`, `telephone`, `ville`, `notes`, `archive_at`.

### F11. `receptions`
- Rôle : bon d'entrée de marchandises.
- Colonnes : `id`, `fournisseur_id`, `reference_fournisseur`, `date_reception`, `auteur_id`, `created_at`.
- Lignes : `reception_lignes` (`reception_id`, `variante_id`, `quantite` > 0, `cout_unitaire_fcfa` nullable).

### F12. `services`
- Colonnes : `id`, `slug` (unique), `nom`, `description`, `type` (`perruque` | `cils` | `autre`), `duree_minutes` (> 0), `tampon_avant_minutes`, `tampon_apres_minutes`, `prix_fcfa` (≥ 0), `publie`, `archive_at`.

### F13. `disponibilites_services` — horaires hebdomadaires
- Colonnes : `id`, `jour_semaine` (0–6), `heure_debut`, `heure_fin`, `pas_minutes` (ex. 30), `actif`.
- Contrainte : `heure_fin > heure_debut`.

### F14. `exceptions_disponibilite`
- Colonnes : `id`, `date`, `ferme` (bool), `heure_debut` / `heure_fin` (nullable), `motif`.
- Contrainte : `UNIQUE (date)`.

### F15. `rendez_vous`
- Colonnes : `id`, `cliente_id`, `service_id`, `debut` / `fin` (heure de la prestation), `occupe_debut` / `occupe_fin` (prestation + tampons, utilisés pour les chevauchements), `statut` (`demande` | `confirme` | `annule` | `termine` | `absent`), `notes`, `motif_annulation`, `created_at`, `updated_at`.
- Contraintes : `fin > debut` ; **contrainte d'exclusion** `EXCLUDE USING gist (tstzrange(occupe_debut, occupe_fin) WITH &&) WHERE (statut IN ('demande','confirme'))` pour empêcher deux rendez-vous actifs qui se chevauchent, tampons compris (un seul salon).
- Index : `(debut)`, `(cliente_id)`.

### F16. `commandes`
- Colonnes : `id`, `reference` (unique, lisible, ex. `GD-2611-0042`), `cliente_id`, `ville_id`, `devise`, `canal` (`web` | `whatsapp`), `statut`, `sous_total_fcfa`, `frais_livraison_fcfa`, `total_fcfa`, `cle_idempotence` (unique), `reservation_expire_at`, `message_whatsapp_genere_at`, `message_whatsapp_ouvert_at`, `confirmee_at`, `annulee_at`, `motif_annulation`, `notes_internes`, `created_at`, `updated_at`.
- Statuts : `nouvelle` → `confirmee` → `expediee` → `livree` ; `annulee` possible depuis `nouvelle` ou `confirmee` ; `retournee` possible après `livree` (partielle ou totale).
- Devise : `devise` (`XAF` pour le Cameroun, `XOF` pour Abidjan), déduite de la ville de livraison. Affichage « FCFA » partout, montants identiques.
- Paiement (à la livraison, aucun paiement en ligne) : `statut_paiement` (`non_paye` | `paye` | `rembourse`), `mode_paiement` (`especes` | `mobile_money`, nullable tant que non payé), `montant_encaisse_fcfa`, `reference_paiement` (numéro de transaction Mobile Money, nullable), `paye_at`, `encaisse_par`. Champs sur la commande et non table séparée : un seul encaissement par commande en V1.
- Contraintes : `total_fcfa = sous_total_fcfa + frais_livraison_fcfa` (`CHECK`) ; montants ≥ 0 ; `statut_paiement = 'paye'` exige `mode_paiement` et `paye_at`.
- Index : `(statut, created_at)`, `(cliente_id)`, `(reservation_expire_at) WHERE statut = 'nouvelle'`.

### F17. `commande_lignes` — lignes figées
- Colonnes : `id`, `commande_id`, `variante_id`, `nom_snapshot`, `prix_unitaire_snapshot_fcfa`, `quantite` (> 0), `total_ligne_fcfa`, `quantite_retournee` (défaut 0, ≤ quantité).
- Index : `(commande_id)`, `(variante_id)` (pour les statistiques).

### F18. `livraisons`
- Colonnes : `id`, `commande_id` (unique parmi les livraisons actives), `ville`, `quartier`, `adresse`, `telephone`, `statut` (`a_preparer` | `expediee` | `livree` | `echec` | `retournee`), `motif_echec`, `expediee_at`, `livree_at`, `created_at`.
- Remarque : l'adresse est **copiée**, pas référencée.
- Index : `(ville, livree_at)`, `(statut)`.

### F19. `villes` (remplace `zones_livraison`, abandonnée : pas de frais de livraison calculés)
- Rôle : liste fermée des villes desservies, pour des statistiques fiables (« Yaoundé » et « Yaounde » ne deviennent pas deux villes) et pour déduire devise et fuseau.
- Colonnes : `id`, `nom` (unique), `pays` (`CM` | `CI`), `indicatif` (`+237` | `+225`), `devise` (`XAF` | `XOF`), `fuseau` (`Africa/Douala` | `Africa/Abidjan`), `actif`, `ordre`.
- Données initiales : Douala, Yaoundé, Garoua (Cameroun, XAF) ; Abidjan (Côte d'Ivoire, XOF).
- `adresses_clientes.ville_id`, `livraisons.ville_id` et `commandes.ville_id` y font référence. Le quartier reste un texte libre.

### F19 bis. `emplacements`
- Rôle : lieux de stock. Une seule ligne au départ (« Stock principal »), pour permettre un futur `transfert` sans migration.
- Colonnes : `id`, `code` (unique), `nom`, `actif`.

### F20. `parametres`
- Colonnes : `cle` (PK), `valeur` (`jsonb`), `modifie_par`, `updated_at`.
- Exemples de clés : `whatsapp_numero`, `horaires`, `delai_expiration_reservation_heures`, `seuil_montant_double_validation_inventaire`.

### F21. `audit_logs`
- Colonnes : `id`, `auteur_id`, `action`, `entite`, `entite_id`, `avant` (`jsonb`), `apres` (`jsonb`), `created_at`.
- Droits : insertion via triggers ou RPC ; pas de modification.

### Vues et calculs (pas de table)
- `v_ventes_quotidiennes` : agrégat par jour, produit, variante, ville (depuis `commande_lignes` + `commandes` + `livraisons`). Matérialisée si la volumétrie l'exige.
- `v_stock_produit` : soldes et alertes.
- Les prévisions sont calculées par une fonction ; le résultat peut être mis en cache dans une table `previsions_stock` si le calcul devient lent. Pas avant.

### Tables volontairement absentes
- `paniers` en base : le panier est local (sinon il faudrait gérer des paniers orphelins et du stock fantôme).
- `notifications` : pas en V1 (alertes calculées).
- `paiements` : pas en V1 (pas de paiement en ligne). À ajouter si ce besoin apparaît.
- `messages_whatsapp` : les champs `message_whatsapp_*` sur la commande suffisent tant qu'il n'y a pas d'API WhatsApp.

---

## G. Logique du stock

Notation : **P** = physique, **R** = réservé, **D** = disponible = P − R. Toutes les opérations sont exécutées dans une transaction, avec verrou sur la ligne de `stocks` (`SELECT … FOR UPDATE`), les lignes étant verrouillées dans un ordre stable (par `variante_id`) pour éviter les interblocages.

| Événement | Effet sur P | Effet sur R | Effet sur D | Mouvement | Condition |
|---|---|---|---|---|---|
| **Entrée** (réception fournisseur) | + q | — | + q | `entree` | Quantité > 0 |
| **Panier** (ajout, modification) | — | — | — | aucun | Vérification indicative côté front seulement |
| **Réservation** (création de commande) | — | + q | − q | `reservation` | D ≥ q pour chaque ligne, sinon la commande est refusée entièrement |
| **Commande confirmée** (validée par l'équipe) | — | — | — | aucun | La réservation reste en place |
| **Vente** (sortie réelle : remise au livreur ou retrait) | − q | − q | 0 | `vente` | Commande confirmée ; P − q ≥ 0 |
| **Annulation** (avant vente) | — | − q | + q | `annulation_reservation` | Commande en `nouvelle` ou `confirmee` |
| **Expiration** (commande WhatsApp non confirmée) | — | − q | + q | `annulation_reservation` | Tâche planifiée, délai dans les paramètres |
| **Livraison** (confirmation côté client) | — | — | — | `livraison` (delta nul) | Trace uniquement ; aucun changement de quantité |
| **Retour** (produit rendu, vendable) | + q | — | + q | `retour` | Quantité retournée ≤ quantité livrée non encore retournée |
| **Retour** (produit non vendable) | — | — | — | `perte` | Motif obligatoire |
| **Perte / casse / péremption** | − q | — | − q | `perte` | Motif obligatoire ; P − q ≥ R (on ne peut pas perdre du stock réservé) |
| **Correction** (inventaire) | Δ = comptage − P | — | Δ | `correction` | Motif obligatoire ; double validation si |Δ| > seuil ; P ≥ R |
| **Réapprovisionnement** | — | — | — | aucun | Le système propose une quantité ; la marchandise reçue génère une `entree` |

Règles associées :
- **Une commande est tout ou rien.** Si une ligne ne peut pas être réservée, la commande entière est refusée, avec le détail de la ligne en cause.
- **Une vente est toujours précédée d'une réservation.** Il n'existe pas de vente « directe » ; cela garantit qu'un produit vendu n'a pas été vendu deux fois.
- **Annuler une commande déjà expédiée** n'est pas une annulation : c'est un retour (ou une perte si le produit est abîmé).
- **Un retour partiel** met à jour `quantite_retournee` sur la ligne et crée un mouvement par ligne.
- **Remboursement** : la logique financière (montant à rembourser) reste hors stock ; le stock ne sait que les quantités. Le montant est saisi dans la commande (à définir en Phase 5).
- **Modifier une quantité sans mouvement est interdit.** Aucune écriture directe sur `stocks` depuis l'application : seules les fonctions RPC écrivent, et elles écrivent toujours le mouvement dans la même transaction.
- **Tout mouvement est traçable** : référence, auteur, date, motif si requis. Le journal ne se modifie pas ; une erreur se corrige par un mouvement compensateur.

Gestion de la concurrence :
- Deux commandes simultanées sur le dernier article : la première verrouille la ligne, la seconde attend, puis reçoit « stock insuffisant » si D est passé à 0. Ce cas doit être testé (Phase 13).
- La clé d'idempotence (`cle_idempotence`) empêche la double création de commande en cas de double clic ou de réseau instable.

---

## H. Logique WhatsApp

Parcours : **PANIER → COMMANDE → ENREGISTREMENT → MESSAGE WHATSAPP**

1. **Panier (local)** : la cliente ajoute des variantes et des quantités. Rien n'est écrit en base, aucun stock n'est réservé.
2. **Commande (formulaire)** : elle saisit nom, téléphone, ville, quartier, adresse, point de repère, notes. Le front valide le format (téléphone, champs obligatoires) pour l'expérience, mais le serveur valide de nouveau.
3. **Enregistrement (RPC `creer_commande`)**, dans une seule transaction :
   - normaliser le téléphone et trouver ou créer la cliente ;
   - enregistrer l'adresse (ou réutiliser une adresse identique) ;
   - recharger les prix et les variantes depuis la base (le prix du panier n'est jamais cru) ;
   - vérifier les variantes actives et la disponibilité ; réserver le stock (G) ;
   - calculer le sous-total et le total (frais de livraison à 0 par défaut : ils ne sont pas calculés par le site ; l'équipe peut les ajouter dans l'admin s'ils ont été convenus sur WhatsApp) ;
   - générer la référence lisible ;
   - insérer la commande, ses lignes, la livraison à préparer ;
   - générer le **texte du message** à partir de ces données enregistrées ;
   - enregistrer `message_whatsapp_genere_at` ;
   - retourner la référence et le texte.
   Si l'une de ces étapes échoue, rien n'est écrit.
4. **Message WhatsApp** : le texte est construit par le serveur, donc ce qui est envoyé est identique à ce qui est enregistré. Contenu : référence, produits, quantités, prix, total, nom, téléphone, adresse complète, demande de confirmation.
5. **Ouverture** : deux modes selon le paramètre disponible.
   - **Avec le numéro de la boutique** (`parametres.whatsapp_numero`, recommandé) : le front ouvre `https://wa.me/<numero>?text=<message encodé>`. Le message est déjà écrit dans WhatsApp, la cliente appuie sur « Envoyer ».
   - **Avec le lien court seulement** (`https://wa.me/message/IJXZX7ST64EGG1`, fourni par le client) : WhatsApp n'accepte pas de texte pré-rempli sur ce type de lien. Le front **copie automatiquement le message** dans le presse-papiers, puis ouvre le lien court ; un encadré indique « Votre commande est copiée : collez-la et envoyez ». La cliente ne recopie rien, mais doit coller (une action de plus, et la copie automatique peut échouer sur certains navigateurs : bouton « Copier » de secours).
   Dans les deux cas : enregistrement de `message_whatsapp_ouvert_at` au clic, page de confirmation avec la référence et un bouton « Renvoyer sur WhatsApp ».

Cas limites :
- **La cliente ferme WhatsApp sans envoyer.** La commande existe, en statut `nouvelle`, avec stock réservé. Elle apparaît dans la file « À confirmer ». Si personne ne la confirme avant l'expiration, elle est annulée et le stock libéré (G). Elle n'est jamais supprimée.
- **Double clic sur « Commander »** : la clé d'idempotence renvoie la commande déjà créée.
- **Panier modifié entre-temps** (prix changé, produit épuisé) : la RPC refuse ou met à jour, et le front affiche l'écart avant de finaliser.
- **Pas de réseau au moment de valider** : la commande n'est pas créée (pas de stock fantôme). Message clair à la cliente. Pas de file d'attente hors ligne pour les commandes en V1.
- **Numéro WhatsApp de la boutique absent ou invalide** : la commande est enregistrée, la page affiche la référence et le message à copier. La commande n'est jamais perdue.
- **Retour de WhatsApp** : aucun statut « reçu » n'est possible sans API. L'équipe confirme manuellement dans l'admin.

---

## I. Logique rendez-vous

Disponibilités :
- Horaires hebdomadaires par jour (`disponibilites_services`) ; exceptions par date (`exceptions_disponibilite`) : fermeture ou horaires spéciaux.
- Fuseau horaire : `Africa/Douala` (UTC+1, sans heure d'été). Les rendez-vous sont stockés en `timestamptz` ; l'affichage est converti.
- Créneaux générés par pas (ex. 30 min) dans les horaires, en tenant compte de la durée du service et des tampons.
- Un créneau est proposé seulement s'il respecte : délai minimum de réservation (paramètre, ex. 2 h), pas dans le passé, aucun chevauchement avec un rendez-vous actif (`demande` ou `confirme`) y compris tampons.

Règles de réservation :
- Le calcul des créneaux se fait côté serveur (fonction SQL). Le front n'affiche que ce que le serveur renvoie.
- La réservation passe par une RPC qui réessaie la vérification ; la contrainte d'exclusion sur `rendez_vous` est la garantie finale contre les doubles réservations.
- Statut initial : `demande` (validation manuelle) ou `confirme` (validation automatique). Choix à faire (voir O).
- Annulation par la cliente : possible jusqu'à un délai minimal avant le rendez-vous (paramètre, ex. 24 h). Au-delà, contact par WhatsApp.
- Annulation par l'équipe : motif obligatoire, la cliente est informée (WhatsApp pré-rempli depuis l'admin).
- Statut `absent` : utile pour les statistiques, n'efface rien.
- Une cliente peut réserver plusieurs services à la suite : chaque service est un rendez-vous ou un rendez-vous composé (à trancher).

Historique : tout rendez-vous reste en base, y compris annulé.

---

## J. Prévisions

Principe : **n'inventer aucune donnée.** Chaque chiffre vient de commandes réelles, et chaque prévision indique sa base (nombre de jours, nombre de ventes).

Données sources :
- Ventes : lignes de commandes dont le statut est `confirmee`, `expediee` ou `livree` (les annulées sont exclues ; les retours sont déduits).
- Stock : soldes actuels et historique des mouvements (pour savoir les jours de rupture).

Calculs :
- **Vitesse de vente** (unités/jour) sur une fenêtre de 28 jours : `ventes nettes sur la fenêtre ÷ nombre de jours où le produit était disponible sur la fenêtre`. Les jours de rupture sont exclus, sinon la vitesse est sous-estimée.
- **Ventes quotidiennes / hebdomadaires / mensuelles** : agrégats directs.
- **Jours avant rupture** : `disponible ÷ vitesse`.
- **Date estimée de rupture** : date du jour + jours avant rupture.
- **Quantité recommandée** : `max(0, vitesse × (délai d'approvisionnement + stock de sécurité en jours) − disponible)`, arrondie au multiple du conditionnement si défini.
- **Tendance** : vitesse des 30 derniers jours comparée aux 30 précédents. Croissance au-delà de +20 %, baisse en dessous de −20 % (seuils à valider).
- **Produit dormant** : aucune vente depuis 60 jours et disponible > 0 (seuil à valider).
- **Produit à risque de rupture** : jours avant rupture inférieurs au délai d'approvisionnement.
- **Ville la plus active** : nombre de commandes livrées par ville. **Ville la plus rentable** : impossible sans coût d'achat ; à afficher seulement si les coûts sont saisis.
- **Clientes récurrentes** : au moins deux commandes livrées (seuil à valider).

Garde-fous :
- Moins de 3 ventes ou moins de 14 jours d'historique : affichage « données insuffisantes », aucune prévision chiffrée.
- Délai d'approvisionnement et stock de sécurité ne sont pas inventés : ils sont saisis par l'admin par produit. Sans valeur saisie, la quantité recommandée n'est pas calculée.
- Les prévisions sont recalculées par tâche planifiée (quotidienne) ou à la demande ; l'affichage indique la date du dernier calcul.

---

## K. Sécurité

Rôles :

| Rôle | Périmètre |
|---|---|
| **Visiteuse** (non connectée) | Lire le catalogue publié et les services ; créer une commande ; réserver un rendez-vous ; voir sa commande via référence + téléphone |
| **Cliente** (compte) | Tout ce qui est ci-dessus, plus son historique, ses adresses, ses rendez-vous |
| **Ventes** | Commandes (confirmer, annuler, notes), rendez-vous, clientes, catalogue en lecture |
| **Stock** | Stock et mouvements (créer), réceptions, pertes, corrections (dans la limite du seuil), catalogue en lecture |
| **Logistique** | Livraisons (statuts, échecs, retours), commandes en lecture |
| **Admin** | Tout sauf gestion des owners et paramètres sensibles |
| **Owner** | Tout, dont utilisateurs, rôles et paramètres critiques |

Règles :
- **Aucune clé `service_role` dans le navigateur.** Seule la clé publique (anon) est exposée.
- **RLS activée sur toutes les tables** exposées. Politique par défaut : refus. Chaque politique est écrite et testée (pgTAP).
- **Écritures sensibles uniquement via RPC** `SECURITY DEFINER` avec `search_path` fixé ; chaque RPC vérifie elle-même le rôle (une politique RLS seule ne suffit pas à protéger une logique métier).
- **Pas de suppression** sur les tables commerciales : droits `DELETE` retirés ; les données sont archivées ou annulées.
- **Données personnelles** (téléphone, adresse) : accès limité au rôle concerné ; pas d'export sans rôle admin ; mention dans la politique de confidentialité.
- **Limitation de débit** sur les actions publiques (création de commande, réservation) pour éviter le blocage de stock par des requêtes automatiques. Mécanisme à choisir : limite de l'hébergeur, Edge Function, ou captcha.
- **Stockage des images** : lecture publique pour les images de produits publiés ; écriture réservée au staff.
- **Journal d'audit** pour toutes les actions staff sensibles.
- **Validation** : chaque entrée est validée côté serveur (types, longueurs, bornes, format E.164).
- **Gestion d'erreurs** : messages génériques à la cliente, détails seulement dans les journaux ; aucune trace technique affichée.

---

## L. Structure des fichiers

```
gloriousdestiny/
├── .claude/skills/              # skills de design et de travail (déjà en place)
├── docs/
│   ├── ARCHITECTURE.md          # ce document
│   ├── DECISIONS.md             # décisions validées (ADR courts)
│   └── STOCK-RULES.md           # règles de stock, pour référence rapide
├── public/                      # favicon, manifest (Phase 12)
├── src/
│   ├── app/                     # point d'entrée, routes, providers
│   ├── pages/                   # une page = un fichier (public et admin)
│   │   ├── public/
│   │   └── admin/
│   ├── features/                # un dossier par module métier
│   │   ├── catalogue/
│   │   ├── panier/
│   │   ├── commandes/
│   │   ├── whatsapp/
│   │   ├── clientes/
│   │   ├── rendez-vous/
│   │   ├── stock/
│   │   ├── livraisons/
│   │   ├── statistiques/
│   │   └── previsions/
│   ├── components/
│   │   ├── ui/                  # design system (bouton, carte, badge, modale…)
│   │   └── layout/              # en-têtes, navigation, pieds de page
│   ├── lib/
│   │   ├── supabase/            # client, types générés
│   │   ├── format/              # montants FCFA, dates Africa/Douala, téléphone
│   │   └── errors/              # gestion centralisée des erreurs
│   ├── schemas/                 # schémas Zod partagés (formulaires, RPC)
│   ├── hooks/
│   └── styles/                  # tokens (couleurs, typographies) et Tailwind
├── supabase/
│   ├── migrations/              # une migration par changement, versionnée
│   ├── functions/               # RPC si gérées en fichiers, Edge Functions
│   ├── seed/                    # données de démonstration (jamais en production)
│   └── tests/                   # pgTAP
├── tests/
│   ├── unit/
│   └── e2e/                     # Playwright, parcours réels (Phase 13)
├── .env.example                 # variables sans valeurs secrètes
├── package.json
└── README.md
```

Règles de structure :
- Une fonctionnalité vit dans un seul dossier `features/…` ; elle ne s'importe pas directement depuis une autre fonctionnalité (passer par `lib/` ou `schemas/`).
- Les composants `ui/` ne connaissent aucun métier.
- Les types de la base sont **générés** depuis Supabase, jamais écrits à la main.
- Aucune donnée de démonstration n'est chargée en production.

---

## M. Risques

1. **Stock fantôme** : commandes WhatsApp jamais envoyées qui bloquent le stock. → Expiration automatique, file « À confirmer », durée à valider.
2. **Double vente** sur le dernier article (concurrence). → Verrou transactionnel + contrainte `reserve <= physique` + tests de simultanéité.
3. **Prix falsifiés** depuis le navigateur. → Prix recalculés et figés côté serveur uniquement.
4. **Modification directe du stock** par erreur de code. → Pas de droit `UPDATE` direct sur `stocks` ; mouvement obligatoire.
5. **Perte de l'historique** (suppression accidentelle). → Pas de `DELETE` sur les tables commerciales ; archivage.
6. **Fuite de données personnelles** via une RLS mal écrite. → RLS par défaut refusé, tests pgTAP par rôle, aucune clé service côté client.
7. **Prévisions trompeuses** avec peu de données. → Seuils minimaux, mention de la base de calcul, pas de valeur inventée.
8. **Dépendance à WhatsApp** (lien `wa.me` sans confirmation d'envoi). → L'équipe confirme manuellement ; pas de promesse de statut automatique.
9. **Spam de commandes ou de rendez-vous** qui vide le stock ou le planning. → Limitation de débit, délai d'expiration, validation manuelle possible.
10. **Erreurs de fuseau horaire** sur les créneaux. → Tout stocké en UTC, affiché en Africa/Douala, tests sur les bords de jour.
11. **Adresses incomplètes** (quartiers non standardisés). → Liste fermée de villes, quartier en texte libre, point de repère obligatoire.
12. **Montants en décimales** (erreurs d'arrondi). → Entiers de FCFA partout.
13. **Dérive de la PWA** : un service worker qui sert un stock périmé. → Pas de cache des données de stock ni des pages admin ; réseau requis pour commander (Phase 12).
14. **Conformité données personnelles** (téléphone, adresse) et envoi de messages. → Mentions légales, consentement à la communication, vérification des obligations locales avant mise en production.
15. **Devise et taxes** non confirmées (XAF supposé, TVA non précisée). → À confirmer avant de coder les montants.
16. ~~Ambiguïté des produits « lace »~~ : réglé, ce sont des produits de perruque.
17. **Étiquettes différentes du brief** sur les visuels fournis : Hair Curl Mousse marquée **250 ml** (brief : 200 ml) ; Glue Residue Remover Shampoo marquée **300 ml** (brief : 245 ml). → Le brief fait foi dans la base ; à corriger soit dans le brief, soit sur les visuels.
18. **Lien WhatsApp court** sans numéro : pré-remplissage impossible (voir H). → Fournir le numéro pour supprimer l'étape « coller ».

---

## N. Roadmap

Chaque phase a une **condition de sortie** : elle n'est terminée que si ses tests passent et si la documentation est à jour.

| Phase | Contenu | Condition de sortie |
|---|---|---|
| **1. Architecture** (en cours) | Ce document, décisions à valider | Validation écrite du client |
| **2. Fondations techniques** | Vite, React, TypeScript, Tailwind, Supabase, Auth, Storage, structure des dossiers, gestion d'erreurs, variables d'environnement, premier schéma de base, types générés, CI de base | Projet qui démarre, connexion Supabase testée, migrations rejouables depuis zéro |
| **3. Design system** | Tokens couleurs (noir, doré, ivoire), typographies, boutons, cartes, badges, formulaires, navigation, modales, alertes, tableaux, graphiques, états loading / empty / error, responsive | Composants documentés, contrastes vérifiés, rendu correct sur mobile et desktop |
| **4. Site public** | Accueil, catalogue, perruques, produits, cils, services, fiches, rendez-vous (interface), contact, panier (local) | Parcours de navigation complet, données réelles en base, aucune donnée factice en production |
| **5. Commerce** | Création de commande, clientes, adresses, statuts, historique, encaissement (espèces / Mobile Money) | Commande créée en base avec prix serveur et statuts corrects |
| **6. WhatsApp** | Enregistrement atomique, génération du message côté serveur, ouverture `wa.me`, page de confirmation, renvoi | Les dix étapes de la logique H passent les tests ; aucune commande perdue si WhatsApp n'ouvre pas |
| **7. Stock** | Soldes physique / réservé / disponible, journal append-only, toutes les opérations de G, réceptions, pertes, corrections | Chaque opération produit un mouvement ; contraintes de base vérifiées ; tests de concurrence |
| **8. Livraison** | Statuts logistiques, adresse figée, échecs, retours, requêtes par ville et produit | Les questions types (« Lace Glue livrées à Yaoundé ce mois-ci ») répondent juste sur jeu de test |
| **9. Rendez-vous** | Services, disponibilités, exceptions, créneaux serveur, réservation, annulation, historique | Aucun chevauchement possible (contrainte + tests) ; fuseau correct |
| **10. Dashboard admin** | Tous les indicateurs de D1 et les écrans D2 à D8 | Chaque chiffre est vérifiable par une requête directe |
| **11. Analyse et prévision** | Vitesse, rupture, réapprovisionnement, classification, clientes récurrentes | Calculs vérifiés à la main sur jeu de test ; « données insuffisantes » affiché quand il faut |
| **12. PWA** | Manifest, service worker, installation, icônes, cache maîtrisé, comportement hors connexion, optimisation mobile | Installation testée ; pas de stock périmé servi |
| **13. Tests de recette** | Tous les scénarios de la liste de la mission (achat, dernier produit, double commande, annulation, retour, livraison, rupture, réappro, rendez-vous, WhatsApp, erreur réseau, accès non autorisé) | Tous verts ; rapport d'audit écrit |

Règle de séquence : on ne saute pas de phase. Une décision qui touche plusieurs phases (ex. statut de réservation, devise) est tranchée en amont.

---

## O. Décisions et questions à valider

Ces points changent le modèle ou le travail. Merci de répondre avant la Phase 2.

**Réponses déjà reçues (10/11/2026)**
- **Devise** : FCFA. XAF pour le Cameroun ; Abidjan est en zone XOF (même valeur, 1:1) : affichage « FCFA » sans distinction, devise réelle conservée sur chaque commande.
- **Villes desservies** : Douala, Yaoundé, Garoua (les trois plus grandes villes du Cameroun ; Garoua peut être remplacée par Bafoussam ou Bamenda), et Abidjan (Côte d'Ivoire, indicatif +225, fuseau UTC+0).
- **Paiement** : aucun paiement sur le site ni l'application. La cliente est dirigée vers WhatsApp et paie **à la livraison**, en **espèces** ou par **Mobile Money**. L'équipe enregistre l'encaissement dans l'admin.
- **Rendez-vous** : un seul salon, dans une seule ville (ville à préciser).
- **Lien WhatsApp fourni** : `https://wa.me/message/…` est un lien court de WhatsApp Business. Ce type de lien **ne permet pas de pré-remplir le message de la commande**. Il faut le **numéro de téléphone** de la boutique (format `wa.me/237XXXXXXXXX?text=…`) pour respecter la règle « la cliente ne recopie jamais sa commande ». Le lien court reste utilisable pour le bouton « Nous écrire » général.

**Décisions d'architecture — toutes validées par le client le 10/11/2026**
1. **Logique métier dans PostgreSQL (RPC)** plutôt que dans le navigateur. Recommandé : oui.
2. **Pas d'API WhatsApp Business en V1** ; lien `wa.me` seulement. Recommandé : oui.
3. **Commande sans compte possible** (commande invitée), compte optionnel. Recommandé : oui.
4. **Panier local** (pas de panier en base). Recommandé : oui.
5. **Un seul emplacement de stock** en V1, mais colonne `emplacement_id` prévue pour un futur transfert. Recommandé : oui.
6. **Livraison** tracée à quantité nulle dans le journal (événement, sans effet sur les quantités). Recommandé : oui.
7. **Vente** = sortie physique réelle (remise au livreur ou retrait), pas la confirmation. Recommandé : oui.

**Règles métier à fixer**
8. **Délai d'expiration** d'une commande non confirmée (proposition : 48 h) avant libération du stock.
9. **Statut initial d'un rendez-vous** : `demande` (validé par l'équipe) ou `confirme` (automatique) ?
10. **Délai minimum** de réservation (proposition : 2 h) et délai d'annulation par la cliente (proposition : 24 h).
11. **Seuil de double validation** pour une correction d'inventaire (valeur ou pourcentage).
12. **Seuils de tendance** (+/−20 %), de dormance (60 jours), de récurrence (2 commandes) : valeurs proposées, à confirmer.
13. **Rendez-vous composés** : une cliente peut-elle réserver plusieurs services d'affilée dans un seul créneau global ?

**Informations manquantes (bloquantes pour la Phase 2)**
14. **Prix officiels** : à fournir. En attendant, **prix provisoires** dans les données de développement uniquement, à la demande du client (fichier de seed marqué « provisoire », jamais en production).
15. ~~Devise~~ : réglé (FCFA, voir plus haut). Reste à confirmer : TVA applicable ou non.
16. **Quantités de stock initiales** : à fournir. En attendant, stock provisoire en données de développement, saisi par des mouvements `entree` (jamais par écriture directe). Formats : ceux du brief (200 ml, 245 ml, 50 ml, 250 g) ; formats non précisés pour Lace Melting Spray, Lace Glue et Wax Stick.
17. ~~Villes et frais de livraison~~ : réglé. Villes : Douala, Yaoundé, Garoua, Abidjan. Pas de frais de livraison calculés par le site (« on n'en a pas besoin ») : la livraison se règle sur WhatsApp.
18. **WhatsApp** : lien court fourni (`wa.me/message/IJXZX7ST64EGG1`) ; le numéro complet reste recommandé (voir H). Restent : **horaires** d'ouverture et **ville du salon**.
19. ~~Catégorisation~~ : réglé (les produits « Lace » relèvent de la perruque ; pas de produit cils actuellement).
20. **Ajout de variantes** : les 7 produits existent-ils en plusieurs formats ou couleurs, ou un seul format chacun ?
21. **Perruques** : liste des attributs à gérer (longueur, couleur, texture, densité, type de dentelle, taille) et nombre de références prévues.
22. **Fournisseurs** : nombre, et délai habituel d'approvisionnement.
23. ~~Paiement~~ : réglé (à la livraison, espèces ou Mobile Money, aucun paiement en ligne).
24. **Hébergeur et domaine** du site, et qui a accès au compte Supabase.
25. **Langue** : français seul en V1 ou aussi anglais ?

Une fois ces points validés, la Phase 2 peut commencer.
