import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { NotificationsProvider } from '@/components/feedback/notifications/NotificationsProvider'
import { AuthContext, type EtatAuth, type ValeurAuth } from '@/features/auth/AuthContext'
import { PanierProvider } from '@/features/panier/PanierProvider'
import { routes } from './routes'

vi.mock('@/services/parametres.service', () => ({
  lireParametresPublics: vi.fn(() =>
    Promise.resolve({
      whatsapp_lien: null,
      whatsapp_numero: null,
      ville_salon: 'Douala, Cameroun',
      horaires_salon: null,
    }),
  ),
}))
vi.mock('@/services/catalogue.service', () => ({
  listerProduits: vi.fn(() => Promise.resolve([])),
  listerServices: vi.fn(() => Promise.resolve([])),
  produitParSlug: vi.fn(() => Promise.resolve(null)),
  serviceParSlug: vi.fn(() => Promise.resolve(null)),
  disponibilites: vi.fn(() => Promise.resolve(new Map())),
}))
vi.mock('@/services/supabase/sante', () => ({
  verifierConnexionBase: vi.fn(() => Promise.resolve({ villes: 4 })),
}))

function rendre(chemin: string, etat: EtatAuth) {
  const auth: ValeurAuth = { ...etat, seConnecter: vi.fn(), seDeconnecter: vi.fn() }
  const routeur = createMemoryRouter(routes, { initialEntries: [chemin] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Envelopper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext value={auth}>
        <PanierProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </PanierProvider>
      </AuthContext>
    </QueryClientProvider>
  )
  render(<RouterProvider router={routeur} />, { wrapper: Envelopper })
  return routeur
}

const sessionFactice = { user: { id: 'u1' } } as unknown as Extract<
  EtatAuth,
  { statut: 'connecte' }
>['session']

describe('routes', () => {
  it("affiche l'accueil", async () => {
    rendre('/', { statut: 'anonyme' })
    expect(await screen.findByRole('heading', { level: 1, name: /Votre pose/ })).toBeInTheDocument()
  })

  it('affiche une fiche produit inexistante en 404', async () => {
    rendre('/produits/inconnu', { statut: 'anonyme' })
    expect(await screen.findByText("Cette page n'existe pas.")).toBeInTheDocument()
  })

  it('affiche le panier vide', async () => {
    rendre('/panier', { statut: 'anonyme' })
    expect(await screen.findByText('Votre panier est vide')).toBeInTheDocument()
  })

  it('affiche la 404 pour une page inconnue', async () => {
    rendre('/nexiste-pas', { statut: 'anonyme' })
    expect(await screen.findByText("Cette page n'existe pas.")).toBeInTheDocument()
  })

  it("redirige l'admin vers la connexion sans session", async () => {
    const routeur = rendre('/admin', { statut: 'anonyme' })
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/connexion')
  })

  it("refuse l'admin à un compte sans profil staff", async () => {
    rendre('/admin', { statut: 'connecte', session: sessionFactice, profil: null })
    expect(await screen.findByText("Votre compte n'a pas accès à cet espace.")).toBeInTheDocument()
  })

  it("ouvre l'admin pour le personnel", async () => {
    rendre('/admin', {
      statut: 'connecte',
      session: sessionFactice,
      profil: { id: 'u1', nom: 'Awa', role: 'ventes' },
    })
    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument()
    expect(await screen.findByText(/4 villes desservies/)).toBeInTheDocument()
  })
})
