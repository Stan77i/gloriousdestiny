/**
 * Alertes du navigateur (API Notification), avec consentement explicite : la case est décochée
 * par défaut, et cocher déclenche la demande d'autorisation du navigateur. Préférence mémorisée
 * sur l'appareil. Pas d'alerte la nuit (21 h – 8 h, heure locale de l'appareil).
 */
const CLE = 'gd-alertes-navigateur'

export function alerteNavigateurActive(): boolean {
  try {
    return (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      localStorage.getItem(CLE) === 'oui'
    )
  } catch {
    return false
  }
}

export async function activerAlerteNavigateur(activer: boolean): Promise<boolean> {
  try {
    if (!activer) {
      localStorage.removeItem(CLE)
      return false
    }
    if (typeof Notification === 'undefined') return false
    const permission =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission
    if (permission !== 'granted') return false
    localStorage.setItem(CLE, 'oui')
    return true
  } catch {
    return false
  }
}

export function heureCalme(date: Date): boolean {
  const h = date.getHours()
  return h >= 21 || h < 8
}

export function afficherAlerteNavigateur(titre: string, corps: string): void {
  if (!alerteNavigateurActive() || heureCalme(new Date())) return
  try {
    new Notification(titre, { body: corps, tag: titre })
  } catch {
    // Certains navigateurs mobiles exigent un service worker : l'alerte reste dans le centre.
  }
}
