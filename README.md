# Glorious Destiny

Site officiel (puis PWA) de Glorious Destiny : vitrine, catalogue, commandes WhatsApp, rendez-vous, stock, livraisons, tableau de bord.

- Architecture : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Préparation PWA : [`docs/PWA.md`](docs/PWA.md)
- Stack : React 19, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, Supabase (PostgreSQL 17)

## Démarrer

Prérequis : Node.js 22 ou plus.

```bash
npm install
cp .env.example .env.local   # puis renseigner l'URL et la clé publishable Supabase
npm run dev
```

## Scripts

| Commande                 | Rôle                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| `npm run dev`            | Serveur de développement                                                 |
| `npm run build`          | Vérification des types puis build de production (`dist/`)                |
| `npm run preview`        | Sert le build de production                                              |
| `npm run typecheck`      | TypeScript strict                                                        |
| `npm run lint`           | ESLint (zéro avertissement toléré)                                       |
| `npm run format`         | Formatage Prettier                                                       |
| `npm test`               | Tests unitaires et de routes (Vitest)                                    |
| `npm run test:db`        | Rejoue toutes les migrations sur un PostgreSQL local et teste les règles |
| `npm run check:secrets`  | Cherche des secrets dans le code et le build                             |
| `npm run check:supabase` | Vérifie le projet Supabase réel avec la clé publique                     |
| `npm run check`          | Tout ce qui précède avant un commit                                      |

## Structure

```
src/
├── app/            # point d'entrée, fournisseurs globaux, routeur et gardes
├── components/     # composants réutilisables (ui/ sans métier, feedback/ notifications)
├── config/         # variables d'environnement validées, constantes de marque
├── domain/         # règles et valeurs métier partagées (rôles, statuts)
├── features/       # un dossier par module métier (auth, puis catalogue, commandes…)
├── hooks/          # hooks génériques
├── layouts/        # gabarits public et admin
├── lib/            # erreurs, formats (FCFA, dates, téléphone)
├── pages/          # pages : public/, admin/, errors/
├── services/       # accès aux données (Supabase, auth, paramètres)
├── test/           # configuration des tests
└── types/          # types générés depuis la base
supabase/
├── migrations/     # schéma versionné (déjà appliqué au projet)
├── seed.sql        # données de référence réelles (villes, paramètres)
└── tests/          # tests SQL des règles métier
```

## Règles

- Aucune clé secrète dans le frontend : uniquement la clé **publishable**. `src/config/env.ts` refuse une clé secrète ou `service_role`.
- Le stock ne change jamais sans mouvement : seules les fonctions SQL écrivent dans `stocks`.
- L'historique commercial n'est jamais supprimé (triggers de protection).
- Les types de `src/types/database.ts` sont générés, jamais écrits à la main.
