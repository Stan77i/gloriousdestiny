import { aRole, estRole } from './roles'

describe('rôles', () => {
  it('owner et admin passent partout', () => {
    expect(aRole('owner', ['stock'])).toBe(true)
    expect(aRole('admin', [])).toBe(true)
  })

  it('un rôle métier ne passe que sur son périmètre', () => {
    expect(aRole('ventes', ['stock'])).toBe(false)
    expect(aRole('stock', ['stock'])).toBe(true)
  })

  it('sans rôle, aucun accès staff', () => {
    expect(aRole(null, ['ventes'])).toBe(false)
  })

  it('valide les valeurs venant de la base', () => {
    expect(estRole('logistique')).toBe(true)
    expect(estRole('superadmin')).toBe(false)
  })
})
