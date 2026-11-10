import { copierTexte } from './copier'

describe('copierTexte', () => {
  it('utilise le presse-papiers sécurisé quand il existe', async () => {
    const ecrire = vi.fn(() => Promise.resolve())
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: ecrire },
      configurable: true,
    })
    await expect(copierTexte('Commande GD-2611-0042')).resolves.toBe(true)
    expect(ecrire).toHaveBeenCalledWith('Commande GD-2611-0042')
  })

  it('se replie sur execCommand si le presse-papiers refuse', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('refus')) },
      configurable: true,
    })
    const exec = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })
    await expect(copierTexte('x')).resolves.toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
  })
})
