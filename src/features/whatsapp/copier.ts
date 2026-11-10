/**
 * Copie un texte dans le presse-papiers. Doit être appelée pendant un geste de l'utilisatrice
 * (clic). Repli sur execCommand pour les navigateurs anciens ou les pages non sécurisées.
 */
export async function copierTexte(texte: string): Promise<boolean> {
  try {
    if (window.isSecureContext) {
      await navigator.clipboard.writeText(texte)
      return true
    }
  } catch {
    // on tente le repli
  }
  try {
    const zone = document.createElement('textarea')
    zone.value = texte
    zone.setAttribute('readonly', '')
    zone.style.position = 'fixed'
    zone.style.opacity = '0'
    document.body.appendChild(zone)
    zone.select()
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- repli volontaire
    const ok = document.execCommand('copy')
    zone.remove()
    return ok
  } catch {
    return false
  }
}
