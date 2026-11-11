import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { NotificationsProvider } from '@/components/feedback/notifications/NotificationsProvider'
import { AuthContext, type EtatAuth, type ValeurAuth } from '@/features/auth/AuthContext'
import { PanierProvider } from '@/features/panier/PanierProvider'
import type * as ServiceAnalyse from '@/services/analyse.service'
import type * as ServiceCatalogueAdmin from '@/services/catalogueAdmin.service'
import type * as ServiceContenus from '@/services/contenus.service'
import type * as ServiceCommandes from '@/services/commandes.service'
import type * as ServiceRdv from '@/services/rendezvous.service'
import type * as ServiceStock from '@/services/stock.service'
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
vi.mock('@/services/commandes.service', async (original) => ({
  ...(await original<typeof ServiceCommandes>()),
  compterCommandes: vi.fn(() =>
    Promise.resolve({
      nouvelle: 3,
      confirmee: 1,
      expediee: 2,
      livree: 0,
      annulee: 0,
      retournee: 0,
    }),
  ),
}))
vi.mock('@/services/tableauDeBord.service', () => ({
  chargerTableauDeBord: vi.fn((du: string, au: string) =>
    Promise.resolve({
      du,
      au,
      precedente: { du, au },
      ventes: {
        ca_fcfa: 35500,
        nombre: 4,
        panier_moyen_fcfa: 8875,
        ca_precedent_fcfa: 9500,
        nombre_precedent: 1,
        encaisse_fcfa: 19000,
        a_encaisser_fcfa: 35500,
      },
      serie: [
        { jour: du, ca_fcfa: 5000, nombre: 1 },
        { jour: au, ca_fcfa: 30500, nombre: 3 },
      ],
      pouls: {
        jours: [{ debut: au, ca_fcfa: 30500, nombre: 3 }],
        semaines: [{ debut: du, ca_fcfa: 35500, nombre: 4 }],
        mois: [{ debut: du, ca_fcfa: 35500, nombre: 4 }],
      },
      commandes_par_statut: { nouvelle: 1 },
      par_ville: [{ ville: 'Douala', nombre: 2, ca_fcfa: 14500 }],
      produits: [],
      clientes: { actives: 3, nouvelles: 2, recurrentes: 2, meilleures: [] },
      alertes: {
        seuil_heures: 12,
        commandes_en_attente: [],
        expirations_proches: 0,
        a_expedier: 4,
        en_cours_de_livraison: 0,
      },
      stock: {
        articles: 7,
        epuises: 0,
        bientot_epuises: 0,
        unites_disponibles: 10,
        valeur_fcfa: null,
        articles_sans_cout: 7,
      },
      rendez_vous: {
        aujourdhui: 0,
        sept_jours: 0,
        a_confirmer: 2,
        periode_confirmes: 0,
        periode_demandes: 0,
        liste_jour: [],
        periode_termines: 0,
        periode_absentes: 0,
        periode_ca_fcfa: 0,
      },
    }),
  ),
}))
vi.mock('@/services/catalogueAdmin.service', async (original) => ({
  ...(await original<typeof ServiceCatalogueAdmin>()),
  listerProduitsAdmin: vi.fn(() =>
    Promise.resolve([
      {
        id: 'p1',
        nom: 'Lace Glue',
        categorie: 'Pose de perruque',
        type: 'produit',
        prixFcfa: 9500,
        publie: true,
        description: '',
        seuilAlerte: 5,
        delaiApproJours: null,
        stockSecuriteJours: null,
      },
    ]),
  ),
}))
vi.mock('@/services/analyse.service', async (original) => ({
  ...(await original<typeof ServiceAnalyse>()),
  chargerAnalyse: vi.fn(() =>
    Promise.resolve({
      calcule_at: '2026-11-11T08:00:00Z',
      aujourdhui: '2026-11-11',
      regles: {
        fenetre_jours: 28,
        tendance_jours: 30,
        seuil_tendance_pct: 20,
        dormant_jours: 60,
        min_ventes: 3,
        min_historique_jours: 14,
        part_populaire_pct: 25,
      },
      produits: [],
      hebdomadaire: [],
      mensuel: [],
    }),
  ),
}))
vi.mock('@/services/contenus.service', async (original) => ({
  ...(await original<typeof ServiceContenus>()),
  listerContenusPublics: vi.fn(() => Promise.resolve([])),
  listerContenusAdmin: vi.fn(() => Promise.resolve([])),
}))
vi.mock('@/services/rendezvous.service', async (original) => ({
  ...(await original<typeof ServiceRdv>()),
  compterDemandes: vi.fn(() => Promise.resolve(2)),
  listerCreneaux: vi.fn(() => Promise.resolve([])),
}))
vi.mock('@/services/stock.service', async (original) => ({
  ...(await original<typeof ServiceStock>()),
  listerStock: vi.fn(() =>
    Promise.resolve([
      {
        varianteId: 'v1',
        produitId: 'p1',
        produit: 'Lace Glue',
        libelle: 'Format standard',
        sku: 'GLUE-STD',
        categorie: 'produits',
        publie: true,
        seuilAlerte: 5,
        delaiApproJours: null,
        stockSecuriteJours: null,
        physique: 4,
        reserve: 1,
        disponible: 3,
        statut: 'bientot_epuise',
        misAJourLe: null,
      },
    ]),
  ),
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

  it('ouvre la prise de rendez-vous en ligne', async () => {
    rendre('/rendez-vous', { statut: 'anonyme' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Rendez-vous' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Réserver ce créneau/ })).toBeInTheDocument()
  })

  it('demande le téléphone pour suivre un rendez-vous', async () => {
    rendre('/rendez-vous/RDV-2611-0001', { statut: 'anonyme' })
    expect(
      await screen.findByLabelText('Téléphone utilisé pour la réservation'),
    ).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Bonjour Awa' })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Où en est la boutique' }),
    ).toBeInTheDocument()
    expect((await screen.findAllByText('35 500 FCFA')).length).toBeGreaterThan(0)
    expect(screen.getByText(/\+274 %/)).toBeInTheDocument()
    expect(screen.queryByText('Stock à surveiller')).not.toBeInTheDocument()
  })

  it('ouvre l’analyse au rôle stock', async () => {
    rendre('/admin/analyse', {
      statut: 'connecte',
      session: sessionFactice,
      profil: { id: 'u2', nom: 'Bintou', role: 'stock' },
    })
    expect(
      await screen.findByRole('heading', { name: 'Analyse et prévisions' }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/Calculé le 11 novembre 2026/)).toBeInTheDocument()
  })

  it('réserve le catalogue à l’administration', async () => {
    rendre('/admin/catalogue', {
      statut: 'connecte',
      session: sessionFactice,
      profil: { id: 'u1', nom: 'Awa', role: 'ventes' },
    })
    expect(await screen.findByText("Votre compte n'a pas accès à cet espace.")).toBeInTheDocument()
  })

  it('ouvre le catalogue à la propriétaire', async () => {
    rendre('/admin/catalogue', {
      statut: 'connecte',
      session: sessionFactice,
      profil: { id: 'u3', nom: 'Grace', role: 'owner' },
    })
    expect(await screen.findByRole('heading', { name: 'Catalogue' })).toBeInTheDocument()
    expect(await screen.findByText('9 500 FCFA')).toBeInTheDocument()
  })

  it('montre les alertes de stock au rôle stock', async () => {
    rendre('/admin', {
      statut: 'connecte',
      session: sessionFactice,
      profil: { id: 'u2', nom: 'Bintou', role: 'stock' },
    })
    expect(await screen.findByText('Stock à surveiller')).toBeInTheDocument()
    expect(await screen.findByText('Lace Glue')).toBeInTheDocument()
  })

  it('refuse le module stock au rôle ventes', async () => {
    rendre('/admin/stock', {
      statut: 'connecte',
      session: sessionFactice,
      profil: { id: 'u1', nom: 'Awa', role: 'ventes' },
    })
    expect(await screen.findByText(/pas accès/)).toBeInTheDocument()
  })

  it('ouvre le module stock au rôle stock', async () => {
    rendre('/admin/stock?vue=inventaire', {
      statut: 'connecte',
      session: sessionFactice,
      profil: { id: 'u2', nom: 'Bintou', role: 'stock' },
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Stock' })).toBeInTheDocument()
    expect(await screen.findByText(/GLUE-STD/)).toBeInTheDocument()
  })
})
