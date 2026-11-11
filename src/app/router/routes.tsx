import type { RouteObject } from 'react-router'
import { EtatChargement } from '@/components/ui/Etats'
import { LayoutPublic } from '@/layouts/LayoutPublic'
import { PageErreurRoute } from '@/pages/errors/PageErreurRoute'
import { PageIntrouvable } from '@/pages/errors/PageIntrouvable'
import { PageAccueil } from '@/pages/public/PageAccueil'
import { PageCatalogue } from '@/pages/public/PageCatalogue'
import { PageCils } from '@/pages/public/PageCils'
import { PageCommande } from '@/pages/public/PageCommande'
import { PageConnexion } from '@/pages/public/PageConnexion'
import { PageContact } from '@/pages/public/PageContact'
import { PagePanier } from '@/pages/public/PagePanier'
import { PagePerruques } from '@/pages/public/PagePerruques'
import { PageProduit } from '@/pages/public/PageProduit'
import { PageRendezVous } from '@/pages/public/PageRendezVous'
import { PageService, PageServices } from '@/pages/public/PageServices'
import { PageSuiviCommande } from '@/pages/public/PageSuiviCommande'
import { PageSuiviRendezVous } from '@/pages/public/PageSuiviRendezVous'
import { CHEMINS } from './chemins'
import { RequireStaff } from './RequireStaff'

/** Vitrine du système de design : chargée à la demande (photos lourdes hors du site public). */
const routeSystemeDesign: RouteObject = {
  lazy: async () => {
    const { PageSystemeDesign } = await import('@/pages/dev/PageSystemeDesign')
    return { element: <PageSystemeDesign /> }
  },
}

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
          { path: CHEMINS.catalogue, element: <PageCatalogue /> },
          { path: CHEMINS.produits, element: <PageCatalogue gammeSeule /> },
          { path: `${CHEMINS.produits}/:slug`, element: <PageProduit /> },
          { path: CHEMINS.perruques, element: <PagePerruques /> },
          { path: `${CHEMINS.perruques}/:slug`, element: <PageProduit /> },
          { path: CHEMINS.cils, element: <PageCils /> },
          { path: CHEMINS.services, element: <PageServices /> },
          { path: `${CHEMINS.services}/:slug`, element: <PageService /> },
          { path: CHEMINS.rendezVous, element: <PageRendezVous /> },
          { path: `${CHEMINS.rendezVous}/:reference`, element: <PageSuiviRendezVous /> },
          { path: CHEMINS.contact, element: <PageContact /> },
          { path: CHEMINS.panier, element: <PagePanier /> },
          { path: CHEMINS.commande, element: <PageCommande /> },
          { path: `${CHEMINS.commande}/:reference`, element: <PageSuiviCommande /> },
          { path: CHEMINS.connexion, element: <PageConnexion /> },
          // En développement uniquement : en production, la vitrine est réservée au personnel.
          ...(import.meta.env.DEV ? [{ ...routeSystemeDesign, path: CHEMINS.systemeDesign }] : []),
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
          {
            path: 'commandes',
            lazy: async () => {
              const { PageAdminCommandes } = await import('@/pages/admin/PageAdminCommandes')
              return {
                element: (
                  <RequireStaff roles={['ventes', 'logistique']}>
                    <PageAdminCommandes />
                  </RequireStaff>
                ),
              }
            },
          },
          {
            path: 'commandes/:id',
            lazy: async () => {
              const { PageAdminCommande } = await import('@/pages/admin/PageAdminCommande')
              return {
                element: (
                  <RequireStaff roles={['ventes', 'logistique']}>
                    <PageAdminCommande />
                  </RequireStaff>
                ),
              }
            },
          },
          {
            path: 'clientes',
            lazy: async () => {
              const { PageAdminClientes } = await import('@/pages/admin/PageAdminClientes')
              return {
                element: (
                  <RequireStaff roles={['ventes']}>
                    <PageAdminClientes />
                  </RequireStaff>
                ),
              }
            },
          },
          {
            path: 'clientes/:id',
            lazy: async () => {
              const { PageAdminCliente } = await import('@/pages/admin/PageAdminClientes')
              return {
                element: (
                  <RequireStaff roles={['ventes']}>
                    <PageAdminCliente />
                  </RequireStaff>
                ),
              }
            },
          },
          {
            path: 'rendez-vous',
            lazy: async () => {
              const { PageAdminRendezVous } = await import('@/pages/admin/PageAdminRendezVous')
              return {
                element: (
                  <RequireStaff roles={['ventes']}>
                    <PageAdminRendezVous />
                  </RequireStaff>
                ),
              }
            },
          },
          {
            path: 'stock',
            lazy: async () => {
              const { PageAdminStock } = await import('@/pages/admin/PageAdminStock')
              return {
                element: (
                  <RequireStaff roles={['stock']}>
                    <PageAdminStock />
                  </RequireStaff>
                ),
              }
            },
          },
          {
            path: 'analyse',
            lazy: async () => {
              const { PageAdminAnalyse } = await import('@/pages/admin/PageAdminAnalyse')
              return {
                element: (
                  <RequireStaff roles={['ventes', 'stock']}>
                    <PageAdminAnalyse />
                  </RequireStaff>
                ),
              }
            },
          },
          {
            path: 'contenus',
            lazy: async () => {
              const { PageAdminContenus } = await import('@/pages/admin/PageAdminContenus')
              return {
                element: (
                  <RequireStaff roles={[]}>
                    <PageAdminContenus />
                  </RequireStaff>
                ),
              }
            },
          },
          {
            path: 'catalogue',
            lazy: async () => {
              const { PageAdminCatalogue } = await import('@/pages/admin/PageAdminCatalogue')
              return {
                element: (
                  <RequireStaff roles={[]}>
                    <PageAdminCatalogue />
                  </RequireStaff>
                ),
              }
            },
          },
          { ...routeSystemeDesign, path: 'systeme-design' },
        ],
      },
    ],
  },
]
