import { useSyncExternalStore } from 'react'

/**
 * Installation de l'application (PWA) sur l'écran d'accueil.
 * Android / Chrome : l'invite native, gardée ici jusqu'au toucher de « Installer ».
 * iPhone (Safari) : pas d'invite, on explique le geste « Partager → Sur l'écran d'accueil ».
 */
type InviteInstallation = Event & { prompt: () => Promise<void> }

let invite: InviteInstallation | null = null
const abonnes = new Set<() => void>()
const prevenir = () => {
  abonnes.forEach((f) => {
    f()
  })
}

export function enregistrerApplication() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    invite = e as InviteInstallation
    prevenir()
  })
  window.addEventListener('appinstalled', () => {
    invite = null
    prevenir()
  })
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    // Mises à jour automatiques, même pour l'app installée sur l'écran d'accueil : chaque
    // publication porte un numéro ; à chaque retour dans l'app (et toutes les 15 min), on
    // vérifie s'il y en a une nouvelle, et la page se recharge d'elle-même une fois installée.
    const avaitControleur = navigator.serviceWorker.controller !== null
    let recharge = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!avaitControleur || recharge) return
      recharge = true
      window.location.reload()
    })
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js?v=${__VERSION__}`, { updateViaCache: 'none' })
        .then((reg) => {
          const verifier = () => {
            if (document.visibilityState === 'visible') void reg.update().catch(() => undefined)
          }
          document.addEventListener('visibilitychange', verifier)
          window.setInterval(verifier, 15 * 60_000)
        })
        .catch(() => {
          /* sans service worker, le site reste utilisable en ligne */
        })
    })
  }
}

export function estInstallee(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

export function estIphone(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

export async function installer(): Promise<boolean> {
  if (!invite) return false
  await invite.prompt()
  invite = null
  prevenir()
  return true
}

function abonner(f: () => void) {
  abonnes.add(f)
  return () => {
    abonnes.delete(f)
  }
}

/** Vrai quand le navigateur propose l'installation (Android, Chrome, Edge). */
export function useInstallable(): boolean {
  return useSyncExternalStore(
    abonner,
    () => invite !== null,
    () => false,
  )
}
