---
name: Glorious Destiny
description: L'interface est l'étiquette — noir profond, dorure rare, ivoire pour lire.
colors:
  noir: "#0d0b09"
  surface-1: "#15120f"
  surface-2: "#1c1814"
  surface-3: "#262019"
  filet: "#2e271f"
  filet-fort: "#43392d"
  filet-champ: "#75664f"
  ivoire: "#f3ede2"
  ivoire-2: "#cbc0ae"
  ivoire-3: "#9b8f7d"
  or: "#d6a756"
  or-clair: "#ecc887"
  or-fonce: "#9c7432"
  sur-or: "#1a1206"
  succes: "#5fbf86"
  alerte: "#f0b23e"
  danger: "#ef6a5b"
  info: "#78a6e0"
  serie-1: "#b8862c"
  serie-2: "#3a82d4"
  serie-3: "#d0613a"
  serie-4: "#24a08e"
  voile: "rgb(5 4 3 / 0.72)"
typography:
  display-xxl:
    fontFamily: "Bodoni Moda Variable, Didot, serif"
    fontSize: "96px"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  display-xl:
    fontFamily: "Bodoni Moda Variable, Didot, serif"
    fontSize: "84px"
    fontWeight: 500
    lineHeight: 1.02
  display:
    fontFamily: "Bodoni Moda Variable, Didot, serif"
    fontSize: "92px"
    fontWeight: 500
    lineHeight: 1.02
  display-l:
    fontFamily: "Bodoni Moda Variable, Didot, serif"
    fontSize: "64px"
    fontWeight: 500
    lineHeight: 1.02
  display-m:
    fontFamily: "Bodoni Moda Variable, Didot, serif"
    fontSize: "56px"
    fontWeight: 500
    lineHeight: 1.02
  headline-l:
    fontFamily: "Bodoni Moda Variable, Didot, serif"
    fontSize: "52px"
    fontWeight: 500
    lineHeight: 1.05
  headline-m:
    fontFamily: "Bodoni Moda Variable, Didot, serif"
    fontSize: "44px"
    fontWeight: 500
    lineHeight: 1.05
  headline:
    fontFamily: "Bodoni Moda Variable, Didot, serif"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: 1.05
  headline-s:
    fontFamily: "Bodoni Moda Variable, Didot, serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.1
  headline-xs:
    fontFamily: "Bodoni Moda Variable, Didot, serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.15
  figure:
    fontFamily: "Urbanist Variable, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  price-l:
    fontFamily: "Urbanist Variable, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
  title-l:
    fontFamily: "Urbanist Variable, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.3
  title-m:
    fontFamily: "Urbanist Variable, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Urbanist Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Urbanist Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 450
    lineHeight: 1.6
  label:
    fontFamily: "Urbanist Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0.02em"
  micro:
    fontFamily: "Urbanist Variable, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  badge: "9999px"
  control: "9999px"
  field: "10px"
  alert: "12px"
  panel: "16px"
spacing:
  gutter-mobile: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "40px"
  panel-padding: "24px"
  section-gap: "56px"
components:
  button-primary:
    backgroundColor: "{colors.or}"
    textColor: "{colors.sur-or}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.or-clair}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ivoire}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 20px"
  button-ghost:
    textColor: "{colors.ivoire-2}"
    rounded: "{rounded.control}"
    height: "44px"
  input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ivoire}"
    rounded: "{rounded.field}"
    height: "48px"
    padding: "0 14px"
  panel:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-padding}"
  nav-pill-active:
    backgroundColor: "{colors.or}"
    textColor: "{colors.sur-or}"
    rounded: "{rounded.control}"
    height: "40px"
  badge:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ivoire-2}"
    rounded: "{rounded.badge}"
    height: "24px"
---

# Design System: Glorious Destiny

## Overview

**Étoile polaire : « l'étiquette dorée ».** Le site et l'administration parlent la langue des emballages Glorious Destiny : marbre noir, veine d'or, lettrage clair. Le noir est chaud (brun-noir, jamais bleu-noir). L'or s'emploie comme une dorure à chaud : rare, fin, posé sur ce qui compte (l'action principale, l'état actif, le focus, un prix). L'ivoire sert à lire.

Deux registres partagent ce monde. Le **site public** (Persuade) est éditorial : grands titres en didone, vrais visuels produits, beaucoup d'air. L'**administration** (Operate) reprend la grammaire du tableau de bord de référence donné par le client (Caelo) : navigation en pilules, panneaux sombres, chiffres nets ; la précision passe avant l'effet.

Anti-références : le salon de coiffure rose et pailleté, les écritures manuscrites, le tableau de bord SaaS sombre à néon, le texte en dégradé.

Source de vérité : `src/index.css` (jetons `@theme`), composants dans `src/components/`, vitrine vivante sur `/systeme-design` (développement) et `/admin/systeme-design` (personnel).

## Colors

Stratégie **retenue (Restrained)** : neutres teintés du monde (brun-noir) + un accent, l'or.

- **Fonds** : `noir` (page) puis quatre marches `surface-1` → `surface-3` pour la profondeur (panneau, contrôle, survol).
- **Filets** : `filet` (séparateurs 1 px), `filet-fort` (bords de contrôles secondaires), `filet-champ` (bords des champs, ≥ 3:1 pour l'accessibilité).
- **Texte** : `ivoire` (principal, ≥ 13,8:1), `ivoire-2` (secondaire, ≥ 8,9:1), `ivoire-3` (discret, ≥ 5:1). Jamais de gris neutre : toujours teinté chaud.
- **Or** : `or` (action principale, actif, focus, ≥ 7,3:1 en texte), `or-clair` (survol, prix), `or-fonce` (appui), `sur-or` (texte posé sur l'or, 8,4:1).
- **États** (réservés, jamais décoratifs, toujours accompagnés d'une icône ou d'un mot) : `succes`, `alerte`, `danger`, `info`.
- **Séries de graphiques** : `serie-1` à `serie-4` en ordre fixe (Douala, Yaoundé, Garoua, Abidjan). Validées par le validateur dataviz sur `surface-1` (bande de luminance, chroma, séparation daltonisme, contraste). Une 5e série se replie en « Autres ».

## Typography

Deux voix, jamais mélangées dans un même rôle.

- **Bodoni Moda** (didone des magazines de mode, auto-hébergée) : `display` et `headline`, **site public et titres de sections de la vitrine uniquement**. Classe utilitaire `.titre-affiche`. L'italique est permis pour une seule ligne d'accent.
- **Urbanist** (géométrique, auto-hébergée) : tout le reste — interface, formulaires, prix, chiffres, administration. Graisse de lecture 450 (la 400 est trop fine sur fond noir au soleil).
- Les grands chiffres (tuiles) restent en Urbanist, chiffres proportionnels. Les colonnes de tableaux et les axes utilisent `.chiffres` (chiffres tabulaires).
- Pas de sur-titre (« eyebrow ») au-dessus d'un titre : le titre porte seul son poids. Les métadonnées passent sous le titre.
- **Échelle** : affiche didone 96 / 92 / 84 / 64 / 56 px (premier écran, réduite sur mobile), titres didone 52 / 44 / 40 / 34 / 28 px, interface Urbanist 26 (prix) / 21 / 19 / 17 / 15 / 13 / 11 px, chiffre clé 32 px. Aucune autre taille.
- Titres en `text-wrap: balance`, paragraphes en `pretty`, mesure ≤ 75 caractères.

## Layout

- Mobile d'abord : gouttières 16 px (mobile), 24 px (tablette), 40 px (bureau) ; conteneur `max-w-7xl` public, 1440 px admin.
- Sections publiques séparées par un filet et 56 px d'air ; plus d'espace au-dessus d'un titre qu'en dessous.
- Grilles fluides (`grid-cols-2` → 3 → 4 pour le catalogue) ; aucune largeur fixe en pixels qui déborde.
- Tableaux : sous 640 px, chaque ligne devient une fiche empilée (libellé + valeur), sans défilement horizontal.
- Cibles tactiles ≥ 44 px (champs 48 px).

## Elevation & Depth

Profondeur **par étagement tonal**, pas par ombres décoratives : chaque niveau monte d'une marche de surface. Trois ombres seulement, toujours décalées et floues :

- `panneau` : reflet interne de 1 px + ombre basse diffuse (panneaux, cartes).
- `flottant` : modales, tiroirs, notifications, info-bulles.
- `or` : halo doré décalé sous l'action principale et la pilule active (la dorure qui accroche la lumière).

Le fond des modales est le `voile` (noir à 72 %) avec un léger flou (2 px).

## Shapes

- Contrôles (boutons, pilules de navigation, badges, compteurs) : **pilule** complète.
- Champs : 10 px. Alertes : 12 px. Panneaux, cartes, modales : 16 px.
- Filets de 1 px partout ; aucune bordure latérale colorée épaisse.
- Signature : **la veine d'or** (`VeineOr`), un filet organique tracé en SVG d'après le marbre des étiquettes, utilisé seul comme séparateur ou soulignement d'un grand titre. Jamais plus d'une veine par écran.

## Components

- **Bouton** (`Bouton`, `classesBouton`) : principal (or, reflet au survol), secondaire (surface + filet, bord doré au survol), fantôme, danger (contour). Tailles petit 36 px / normal 44 px / grand 52 px. État « en cours » : indicateur + désactivé + `aria-busy`. **Un seul bouton principal doré par écran.** `BoutonIcone` exige un libellé.
- **Champs** (`Champ` + `Saisie`, `ZoneTexte`, `Selection`, `CaseACocher`, `Interrupteur`) : libellé au-dessus, aide ou erreur dessous reliées en ARIA ; focus = bord or + halo doré 3 px ; erreur = bord danger + message qui dit comment corriger.
- **Badge** et **Compteur** : pastille de couleur + mot ; jamais la couleur seule.
- **Alerte** : message dans la page, icône + titre + texte + actions ; teinte de fond à 8 %.
- **Panneau** et **TuileChiffre** : surface de base de l'admin ; la tuile donne libellé, valeur, variation signée et période nommée (couleur = favorable ou non, flèche = sens).
- **Navigation** : `NavPilules` (barre en pilules avec compteurs, actif doré) ; `Onglets` (motif WAI-ARIA, flèches, filet or sous l'actif).
- **Modale** (`<dialog>` natif) : `centre` pour une décision, `tiroir` pour un détail ; focus piégé, Échap, retour du focus. À réserver aux tâches qui exigent une interruption.
- **Tableau** : en-têtes en petites capitales espacées, chiffres alignés à droite, fiches empilées sur mobile.
- **Graphiques** : `GraphiqueColonnes` (colonnes ≤ 24 px, bout arrondi 4 px, base carrée, période en cours en or, info-bulle, tableau équivalent pour lecteurs d'écran, une étiquette sur deux sur mobile) ; `BarreRepartition` (barre segmentée 28 px, part écrite si elle tient, légende).
- **États** : `EtatChargement`, `EtatVide` (icône, titre, explication, action), `EtatErreur` (message + Réessayer), `Squelette`.
- **Notifications** : toasts en bas à droite, icône + message ; erreurs persistantes jusqu'à fermeture.
- **CarteProduit** : produit détouré sur socle noir chaud ; photo d'usage au survol (souris seulement) ; prix en or clair ou « Prix sur demande » ; bouton « Ajouter » discret (secondaire), empilé sous le prix sur mobile.
- **Signature** : nom de marque en didone espacée, à remplacer par le logo officiel dès réception.

## Do's and Don'ts

**À faire**
- Garder l'or rare : action principale, actif, focus, prix.
- Utiliser les vrais visuels fournis (détourés et photos d'usage) ; marquer « Données d'exemple » toute donnée de démonstration.
- Doubler chaque état d'une icône ou d'un mot.
- Respecter `prefers-reduced-motion` : la veine apparaît déjà tracée, les transitions sont neutralisées.
- Tester à 390 px et 1440 px avant de livrer.

**À ne pas faire**
- Plusieurs boutons dorés pleins côte à côte (par exemple « Ajouter » doré sur chaque carte).
- Texte en dégradé, verre décoratif, néon, ombres dures décalées.
- Rose pailleté, typographies manuscrites, clichés de salon.
- Sur-titres au-dessus des titres, numéros de sections décoratifs.
- Couleurs d'état employées comme couleurs de séries, ou séries recyclées.
- Inventer un prix, un avis, un chiffre ou un produit.
