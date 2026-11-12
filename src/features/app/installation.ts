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
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
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
