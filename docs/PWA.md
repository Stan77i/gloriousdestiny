# Préparation PWA (Phase 12)

La PWA n'est pas encore active. La Phase 2 a seulement préparé le terrain.

## Déjà en place

- `index.html` : `theme-color`, `color-scheme`, `viewport-fit=cover` (encoches des téléphones).
- `src/hooks/useEnLigne.ts` + `BandeauHorsLigne` : la cliente est prévenue quand le réseau est coupé.
- Espace admin chargé à la demande (`lazy`) : le site public reste léger à installer.
- Aucune logique métier dans le navigateur : rien à resynchroniser après une coupure.

## À faire en Phase 12

1. Manifest (`public/manifest.webmanifest`) : nom, couleurs noir/doré/ivoire, icônes 192/512 et maskable (à partir du logo final de la Phase 3).
2. Service worker (outil à choisir à ce moment-là, par exemple `vite-plugin-pwa`).
3. Stratégie de cache :
   - **mis en cache** : coquille de l'application, polices, images produits ;
   - **jamais mis en cache** : disponibilité du stock, commandes, rendez-vous, pages `/admin` ;
   - **commander et réserver exigent le réseau** : pas de commande hors ligne (pas de stock fantôme, voir ARCHITECTURE.md section H).
4. Invite d'installation et page hors ligne.
5. Tests Lighthouse PWA sur mobile réel.
