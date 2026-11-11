import {
  appliquerPreference,
  appliquerTheme,
  CLE_THEME,
  lirePreference,
  themeActuel,
  themeEffectif,
} from './theme'

function systeme(sombre: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (q: string) => ({
      matches: sombre && q.includes('dark'),
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  })
}

describe('thème', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="theme-color" content="#f3efe6" />'
    delete document.documentElement.dataset['theme']
    localStorage.clear()
    systeme(false)
  })

  it('suit l’appareil par défaut', () => {
    expect(lirePreference()).toBe('systeme')
    expect(themeEffectif('systeme')).toBe('clair')
    systeme(true)
    expect(themeEffectif('systeme')).toBe('sombre')
  })

  it('applique un choix manuel, met à jour la barre mobile et le mémorise', () => {
    appliquerPreference('sombre', false)
    expect(document.documentElement.dataset['theme']).toBe('sombre')
    expect(themeActuel()).toBe('sombre')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#0f0f0e',
    )
    expect(localStorage.getItem(CLE_THEME)).toBe('sombre')
  })

  it('revient au réglage de l’appareil sans valeur mémorisée', () => {
    systeme(true)
    appliquerPreference('clair', false)
    expect(themeActuel()).toBe('clair')
    appliquerPreference('systeme', false)
    expect(localStorage.getItem(CLE_THEME)).toBeNull()
    expect(themeActuel()).toBe('sombre')
  })

  it('reste compatible avec le choix clair / sombre', () => {
    appliquerTheme('sombre')
    appliquerTheme('clair')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})
