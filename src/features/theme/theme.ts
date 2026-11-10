/**
 * Thème d'affichage : clair par défaut (comme la marque se présente), sombre au choix.
 * Le choix est mémorisé sur l'appareil ; index.html l'applique avant le premier rendu
 * (pas d'éclair blanc au chargement en thème sombre).
 */
export type Theme = 'clair' | 'sombre'

export const CLE_THEME = 'gd-theme'
const COULEUR_BARRE: Record<Theme, string> = { clair: '#ecebe7', sombre: '#111110' }

export function themeActuel(): Theme {
  return document.documentElement.dataset['theme'] === 'sombre' ? 'sombre' : 'clair'
}

export function appliquerTheme(theme: Theme): void {
  const racine = document.documentElement
  if (theme === 'sombre') racine.dataset['theme'] = 'sombre'
  else delete racine.dataset['theme']
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COULEUR_BARRE[theme])
  try {
    localStorage.setItem(CLE_THEME, theme)
  } catch {
    // Stockage indisponible (navigation privée) : le thème vaut pour cette visite.
  }
}
