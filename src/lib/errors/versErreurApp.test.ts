import { ConfigurationError } from '@/config/env'
import { MESSAGES } from './ErreurApp'
import { versErreurApp } from './versErreurApp'

describe('versErreurApp', () => {
  it('reconnaît les erreurs métier levées par les fonctions SQL', () => {
    expect(versErreurApp({ message: 'STOCK_INSUFFISANT: variante x', code: 'P0001' }).code).toBe(
      'stock_insuffisant',
    )
    expect(versErreurApp({ message: 'ACCES_REFUSE', code: '42501' }).code).toBe('acces_refuse')
  })

  it('traduit les codes SQL courants', () => {
    expect(versErreurApp({ code: '23505', message: 'duplicate key' }).code).toBe('conflit')
    expect(versErreurApp({ code: '23P01', message: 'exclusion' }).code).toBe('creneau_indisponible')
    expect(versErreurApp({ code: '23514', message: 'check' }).code).toBe('validation')
    expect(versErreurApp({ code: 'PGRST116', message: 'no rows' }).code).toBe('introuvable')
  })

  it('détecte les coupures réseau', () => {
    expect(versErreurApp(new TypeError('Failed to fetch')).code).toBe('reseau')
  })

  it('reconnaît une configuration invalide', () => {
    expect(versErreurApp(new ConfigurationError('x')).code).toBe('configuration')
  })

  it("n'expose jamais le message technique", () => {
    const erreur = versErreurApp({ code: 'XX000', message: 'relation "secret" does not exist' })
    expect(erreur.message).toBe(MESSAGES.inconnue)
    expect(erreur.detail).toContain('secret')
  })
})

describe('erreurs du commerce', () => {
  it('reconnaît les refus métier de la commande', () => {
    expect(versErreurApp({ message: 'TROP_DE_COMMANDES', code: 'P0001' }).code).toBe(
      'trop_de_commandes',
    )
    expect(versErreurApp({ message: 'TRANSITION_IMPOSSIBLE: x', code: 'P0001' }).code).toBe(
      'transition',
    )
    expect(versErreurApp({ message: 'VALIDATION: telephone', code: '22023' }).code).toBe(
      'validation',
    )
    const e = versErreurApp({ message: 'STOCK_INSUFFISANT: Lace Glue', code: 'P0001' })
    expect(e.code).toBe('stock_insuffisant')
    expect(e.detail).toContain('Lace Glue')
  })
})

describe('erreurs des rendez-vous', () => {
  it('reconnaît les refus métier de la réservation', () => {
    expect(versErreurApp({ message: 'CRENEAU_INDISPONIBLE', code: 'P0001' }).code).toBe(
      'creneau_indisponible',
    )
    expect(versErreurApp({ message: 'TROP_DE_RENDEZ_VOUS', code: 'P0001' }).code).toBe(
      'trop_de_rendez_vous',
    )
    expect(versErreurApp({ message: 'ANNULATION_TARDIVE', code: 'P0001' }).code).toBe(
      'annulation_tardive',
    )
    expect(versErreurApp({ message: 'RDV_EXISTANTS: 2', code: 'P0001' }).code).toBe('rdv_existants')
  })
})
