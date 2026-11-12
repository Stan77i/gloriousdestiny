/**
 * Sons et vibrations du site, synthétisés dans le navigateur (Web Audio) : aucun fichier à
 * télécharger, rien de plus pour les connexions lentes. Volume bas, sons courts et doux.
 * - tic : toucher d'un bouton ou d'un lien ;
 * - bascule : interrupteur, choix d'onglet ;
 * - ajout : un produit rejoint le panier (petit carillon) ;
 * - bulle : une bulle de conversation arrive ;
 * - touche : une frappe de clavier, très discrète (le « G » écrit).
 * Réglages (sons, vibrations) gardés sur l'appareil ; les navigateurs n'autorisent le son
 * qu'après un premier geste de la visiteuse.
 */

export type Reglages = { sons: boolean; vibrations: boolean }

const CLE = 'gd-reglages'
const DEFAUT: Reglages = { sons: true, vibrations: true }

let reglages: Reglages = DEFAUT
try {
  const brut = localStorage.getItem(CLE)
  if (brut) reglages = { ...DEFAUT, ...(JSON.parse(brut) as Partial<Reglages>) }
} catch {
  /* stockage indisponible : réglages par défaut */
}

const abonnes = new Set<() => void>()

export function lireReglages(): Reglages {
  return reglages
}

export function changerReglages(r: Partial<Reglages>) {
  reglages = { ...reglages, ...r }
  try {
    localStorage.setItem(CLE, JSON.stringify(reglages))
  } catch {
    /* sans stockage, le réglage vaut pour cette visite */
  }
  abonnes.forEach((f) => {
    f()
  })
}

export function abonnerReglages(f: () => void) {
  abonnes.add(f)
  return () => {
    abonnes.delete(f)
  }
}

let contexte: AudioContext | null = null
let bruit: AudioBuffer | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  // Anciens Safari : le contexte audio n'existe que sous un nom préfixé.
  const g = globalThis as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  const C = g.AudioContext ?? g.webkitAudioContext
  if (!C) return null
  contexte ??= new C()
  if (contexte.state === 'suspended') void contexte.resume()
  return contexte
}

/** Une note douce : attaque rapide, extinction exponentielle. */
function note(
  c: AudioContext,
  freq: number,
  debut: number,
  duree: number,
  volume: number,
  forme: OscillatorType = 'sine',
  glisse?: number,
) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = forme
  o.frequency.setValueAtTime(freq, debut)
  if (glisse) o.frequency.exponentialRampToValueAtTime(glisse, debut + duree)
  g.gain.setValueAtTime(0.0001, debut)
  g.gain.exponentialRampToValueAtTime(volume, debut + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, debut + duree)
  o.connect(g).connect(c.destination)
  o.start(debut)
  o.stop(debut + duree + 0.02)
}

/** Une frappe de clavier : un souffle très court, filtré, presque imperceptible. */
function frappe(c: AudioContext, debut: number) {
  if (!bruit) {
    bruit = c.createBuffer(1, Math.round(c.sampleRate * 0.03), c.sampleRate)
    const d = bruit.getChannelData(0)
    for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length) ** 3
  }
  const s = c.createBufferSource()
  s.buffer = bruit
  s.playbackRate.value = 0.85 + Math.random() * 0.35
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 2400 + Math.random() * 1400
  f.Q.value = 1.2
  const g = c.createGain()
  g.gain.value = 0.05
  s.connect(f).connect(g).connect(c.destination)
  s.start(debut)
}

export type NomSon = 'tic' | 'bascule' | 'ajout' | 'bulle' | 'touche'

export function jouer(nom: NomSon) {
  if (!reglages.sons) return
  const c = audio()
  if (!c || c.state !== 'running') return
  const t = c.currentTime
  switch (nom) {
    case 'tic':
      note(c, 1350, t, 0.045, 0.035, 'triangle', 900)
      break
    case 'bascule':
      note(c, 520, t, 0.07, 0.05, 'sine', 780)
      break
    case 'ajout':
      // Carillon : deux notes or (do, mi aigus), la seconde plus douce.
      note(c, 1046.5, t, 0.22, 0.06, 'sine')
      note(c, 1318.5, t + 0.09, 0.32, 0.045, 'sine')
      break
    case 'bulle':
      note(c, 660, t, 0.12, 0.04, 'sine', 990)
      break
    case 'touche':
      frappe(c, t)
      break
  }
}

export function vibrer(motif: number | number[]) {
  if (!reglages.vibrations) return
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(motif)
  }
}

/** Premier geste : les navigateurs ouvrent la sortie audio seulement à ce moment-là. */
export function deverrouillerAudio() {
  if (reglages.sons) audio()
}
