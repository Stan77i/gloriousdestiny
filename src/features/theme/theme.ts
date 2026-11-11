/**
 * Thème d'affichage, au niveau du système de design (variables CSS sur <html>) :
 * « système » (par défaut : suit le réglage clair / sombre de l'appareil), « clair » ou « sombre ».
 * Le choix est mémorisé sur l'appareil ; index.html l'applique avant le premier rendu
 * (pas d'éclair blanc au chargement). Le changement se fait en fondu (sauf mouvement réduit).
 */
export type Theme = 'clair' | 'sombre'
export type PreferenceTheme = 'systeme' | Theme

export const CLE_THEME = 'gd-theme'
const COULEUR_BARRE: Record<Theme, string> = { clair: '#f3efe6', sombre: '#0f0f0e' }

function requeteSombre(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
}

export function lirePreference(): PreferenceTheme {
  try {
    const v = localStorage.getItem(CLE_THEME)
    return v === 'clair' || v === 'sombre' ? v : 'systeme'
  } catch {
    return 'systeme'
  }
}

export function themeEffectif(pref: PreferenceTheme): Theme {
  if (pref !== 'systeme') return pref
  return requeteSombre()?.matches ? 'sombre' : 'clair'
}

export function themeActuel(): Theme {
  return document.documentElement.dataset['theme'] === 'sombre' ? 'sombre' : 'clair'
}

/** Applique un thème à la page, avec un court fondu des couleurs. */
function peindre(theme: Theme, fondu: boolean): void {
  const racine = document.documentElement
  if (fondu) {
    racine.classList.add('theme-en-transition')
    window.setTimeout(() => {
      racine.classList.remove('theme-en-transition')
    }, 360)
  }
  if (theme === 'sombre') racine.dataset['theme'] = 'sombre'
  else delete racine.dataset['theme']
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COULEUR_BARRE[theme])
}

/** Enregistre la préférence et l'applique tout de suite. */
export function appliquerPreference(pref: PreferenceTheme, fondu = true): void {
  try {
    if (pref === 'systeme') localStorage.removeItem(CLE_THEME)
    else localStorage.setItem(CLE_THEME, pref)
  } catch {
    // Stockage indisponible (navigation privée) : le thème vaut pour cette visite.
  }
  peindre(themeEffectif(pref), fondu)
  window.dispatchEvent(new Event('gd-theme'))
}

/** Compatibilité : choix explicite clair / sombre. */
export function appliquerTheme(theme: Theme): void {
  appliquerPreference(theme, false)
}

/**
 * Suit le réglage de l'appareil quand la préférence est « système ».
 * Renvoie la fonction de désabonnement.
 */
export function suivreSysteme(): () => void {
  const mq = requeteSombre()
  if (!mq) return () => undefined
  const surChangement = () => {
    if (lirePreference() === 'systeme') peindre(themeEffectif('systeme'), true)
  }
  mq.addEventListener('change', surChangement)
  return () => {
    mq.removeEventListener('change', surChangement)
  }
}
