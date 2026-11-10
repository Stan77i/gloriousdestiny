import type { RouteObject } from 'react-router'
import { EtatChargement } from '@/components/ui/Etats'
import { LayoutPublic } from '@/layouts/LayoutPublic'
import { PageErreurRoute } from '@/pages/errors/PageErreurRoute'
import { PageIntrouvable } from '@/pages/errors/PageIntrouvable'
import { PageAccueil } from '@/pages/public/PageAccueil'
import { PageConnexion } from '@/pages/public/PageConnexion'
import { CHEMINS } from './chemins'
import { RequireStaff } from './RequireStaff'

/**
 * Arbre des routes. L'espace admin est chargé à la demande (code séparé du site public).
 * Les pages publiques complètes arrivent en Phase 4, l'admin en Phase 10.
 */
export const routes: RouteObject[] = [
  {
    errorElement: <PageErreurRoute />,
    hydrateFallbackElement: <EtatChargement />,
    children: [
      {
        element: <LayoutPublic />,
        children: [
          { path: CHEMINS.accueil, element: <PageAccueil /> },
          { path: CHEMINS.connexion, element: <PageConnexion /> },
          { path: '*', element: <PageIntrouvable /> },
        ],
      },
      {
        path: CHEMINS.admin,
        lazy: async () => {
          const { LayoutAdmin } = await import('@/layouts/LayoutAdmin')
          return {
            element: (
              <RequireStaff>
                <LayoutAdmin />
              </RequireStaff>
            ),
          }
        },
        children: [
          {
            index: true,
            lazy: async () => {
              const { PageAdminAccueil } = await import('@/pages/admin/PageAdminAccueil')
              return { element: <PageAdminAccueil /> }
            },
          },
        ],
      },
    ],
  },
]
