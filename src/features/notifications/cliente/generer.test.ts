import { describe, expect, it } from 'vitest'
import { genererNotifications, type DonneesCliente } from './generer'

const MAINTENANT = new Date('2026-11-11T09:00:00Z').getTime()

function donnees(partiel: Partial<DonneesCliente>): DonneesCliente {
  return {
    maintenant: MAINTENANT,
    premiereVisite: '2026-11-01T10:00:00Z',
    commandes: [],
    rdvs: [],
    alertes: [],
    produits: [],
    panier: { noms: [], majLe: null, empreinte: '', lien: '/panier' },
    ...partiel,
  }
}

describe('notifications de la cliente', () => {
  it('suit le statut réel de sa commande, une notification par étape', () => {
    const n = genererNotifications(
      donnees({
        commandes: [
          {
            reference: 'GD-2611-0001',
            statut: 'expediee',
            creeLe: '2026-11-10T09:00:00Z',
            lignes: [
              { nom: 'Lace Glue', quantite: 2 },
              { nom: 'Braid Gel', quantite: 1 },
            ],
            lien: '/commande/GD-2611-0001',
          },
          { reference: 'GD-2611-0002', statut: 'nouvelle', creeLe: '', lignes: [], lien: '' },
        ],
      }),
    )
    expect(n).toHaveLength(1)
    expect(n[0]).toMatchObject({
      cle: 'commande:GD-2611-0001:expediee',
      titre: 'Commande GD-2611-0001 en route',
    })
    expect(n[0]?.corps).toContain('Lace Glue × 2 et 1 autre(s) article(s)')
  })

  it('rappelle un rendez-vous dans les 24 h, une seule fois par horaire', () => {
    const rdv = {
      reference: 'RDV-2611-0001',
      statut: 'confirme',
      debut: '2026-11-12T08:00:00Z',
      service: 'Pose de cils',
      motif: null,
      lien: '/rendez-vous/RDV-2611-0001',
    }
    const n = genererNotifications(donnees({ rdvs: [rdv] }))
    expect(n.map((x) => x.titre)).toEqual(['Rendez-vous confirmé', 'Demain à 09:00 : Pose de cils'])
    const loin = genererNotifications(
      donnees({ rdvs: [{ ...rdv, debut: '2026-11-20T08:00:00Z' }] }),
    )
    expect(loin.some((x) => x.cle.includes('rappel'))).toBe(false)
  })

  it('annonce un retour en stock attendu avec l’accroche réelle du produit', () => {
    const n = genererNotifications(
      donnees({
        alertes: [
          {
            varianteId: 'v1',
            produit: 'Lace Glue',
            disponible: true,
            accroche: 'La pose qui tient, sans y penser.',
            lien: '/produits/lace-glue',
          },
          {
            varianteId: 'v2',
            produit: 'Wax Stick',
            disponible: false,
            accroche: null,
            lien: '/produits/wax-stick',
          },
        ],
      }),
    )
    expect(n).toHaveLength(1)
    expect(n[0]?.corps).toBe('La pose qui tient, sans y penser. Il est de nouveau disponible.')
  })

  it('ne présente comme nouveauté que ce qui est publié après la première visite', () => {
    const n = genererNotifications(
      donnees({
        produits: [
          {
            nom: 'Ancien',
            accroche: null,
            creeLe: '2026-10-01T00:00:00Z',
            lien: '/produits/ancien',
          },
          {
            nom: 'Nouveau',
            accroche: 'Tout neuf.',
            creeLe: '2026-11-05T00:00:00Z',
            lien: '/produits/nouveau',
          },
        ],
      }),
    )
    expect(n.map((x) => x.titre)).toEqual(['Nouveau : Nouveau'])
  })

  it('rappelle le panier seulement après 24 h sans modification', () => {
    const panier = { noms: ['Lace Glue', 'Braid Gel'], empreinte: 'a:1|b:1', lien: '/panier' }
    expect(
      genererNotifications(donnees({ panier: { ...panier, majLe: '2026-11-11T01:00:00Z' } })),
    ).toHaveLength(0)
    const n = genererNotifications(
      donnees({ panier: { ...panier, majLe: '2026-11-09T01:00:00Z' } }),
    )
    expect(n[0]?.cle).toBe('panier:a:1|b:1')
  })
})
