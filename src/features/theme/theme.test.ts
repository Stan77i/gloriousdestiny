import { appliquerTheme, CLE_THEME, themeActuel } from './theme'

describe('thème', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="theme-color" content="#ecebe7" />'
    delete document.documentElement.dataset['theme']
    localStorage.clear()
  })

  it('est clair par défaut', () => {
    expect(themeActuel()).toBe('clair')
  })

  it('bascule en sombre, met à jour la barre mobile et mémorise le choix', () => {
    appliquerTheme('sombre')
    expect(document.documentElement.dataset['theme']).toBe('sombre')
    expect(themeActuel()).toBe('sombre')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#111110',
    )
    expect(localStorage.getItem(CLE_THEME)).toBe('sombre')
  })

  it('revient en clair sans attribut résiduel', () => {
    appliquerTheme('sombre')
    appliquerTheme('clair')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(localStorage.getItem(CLE_THEME)).toBe('clair')
  })
})
