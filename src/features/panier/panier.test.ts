import { ecrirePanier, lirePanier, QUANTITE_MAX, reduirePanier, type LignePanier } from './panier'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('reduirePanier', () => {
  it('ajoute puis cumule une même variante', () => {
    let p: LignePanier[] = []
    p = reduirePanier(p, { type: 'ajouter', varianteId: A, quantite: 1 })
    p = reduirePanier(p, { type: 'ajouter', varianteId: A, quantite: 2 })
    expect(p).toEqual([{ varianteId: A, quantite: 3 }])
  })

  it('plafonne la quantité', () => {
    const p = reduirePanier([], { type: 'ajouter', varianteId: A, quantite: 999 })
    expect(p[0]?.quantite).toBe(QUANTITE_MAX)
  })

  it('retire la ligne quand la quantité tombe à zéro', () => {
    const p = reduirePanier([{ varianteId: A, quantite: 2 }], {
      type: 'modifier',
      varianteId: A,
      quantite: 0,
    })
    expect(p).toEqual([])
  })

  it('retire et vide', () => {
    const base = [
      { varianteId: A, quantite: 1 },
      { varianteId: B, quantite: 1 },
    ]
    expect(reduirePanier(base, { type: 'retirer', varianteId: A })).toEqual([
      { varianteId: B, quantite: 1 },
    ])
    expect(reduirePanier(base, { type: 'vider' })).toEqual([])
  })
})

describe('stockage du panier', () => {
  it('relit ce qu’il a écrit', () => {
    const lignes = [{ varianteId: A, quantite: 2 }]
    expect(lirePanier(ecrirePanier(lignes))).toEqual(lignes)
  })

  it('ignore un contenu corrompu ou falsifié', () => {
    expect(lirePanier('{pas du json')).toEqual([])
    expect(
      lirePanier(JSON.stringify({ version: 1, lignes: [{ varianteId: 'x', quantite: 1 }] })),
    ).toEqual([])
    expect(
      lirePanier(JSON.stringify({ version: 1, lignes: [{ varianteId: A, quantite: -3 }] })),
    ).toEqual([])
    expect(lirePanier(null)).toEqual([])
  })
})
