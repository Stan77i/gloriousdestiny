import { useEffect, useState } from 'react'
import type { Grille, IdVue } from './projection'

/**
 * Fond commun aux cartes (administration et site public) : grilles de points précalculées,
 * pays desservis en or, position des repères en pourcentage du cadre.
 */

export type Grilles = Partial<Record<IdVue, Grille>>

/** Pays d'Afrique : regroupés en un seul repère sur la vue Monde (trop proches à cette échelle). */
export const AFRIQUE = new Set(['CM', 'CI', 'GA', 'CG', 'SN', 'GN'])

/**
 * Les grilles (≈ 45 ko compressés) ne sont chargées qu'au besoin : à l'ouverture de la carte,
 * ou quand `actif` devient vrai (section visible à l'écran).
 */
export function useGrilles(actif = true): Grilles | null {
  const [g, setG] = useState<Grilles | null>(null)
  useEffect(() => {
    if (!actif) return
    let vivant = true
    void import('./points-carte.json').then((m) => {
      if (vivant) setG(m.default as unknown as Grilles)
    })
    return () => {
      vivant = false
    }
  }, [actif])
  return g
}

/** Position CSS (en %) d'un point de grille dans le cadre de la carte. */
export function positionDansCadre(g: Grille, p: { x: number; y: number }) {
  return {
    left: `${String(((p.x + 0.5) / (g.colonnes + 1)) * 100)}%`,
    top: `${String(((p.y + 0.5) / (g.lignes + 1)) * 100)}%`,
  }
}

/** Rapport largeur / hauteur du cadre d'une grille. */
export function ratioCadre(g: Grille | undefined): string {
  return g ? `${String(g.colonnes + 1)} / ${String(g.lignes + 1)}` : '16 / 9'
}

/** Centre géographique d'une liste de lieux (pour placer un repère de pays ou de région). */
export function centre(
  lieux: { latitude: number | null; longitude: number | null }[],
): { latitude: number; longitude: number } | null {
  const ok = lieux.filter((l) => l.latitude != null && l.longitude != null)
  if (ok.length === 0) return null
  return {
    latitude: ok.reduce((t, l) => t + (l.latitude ?? 0), 0) / ok.length,
    longitude: ok.reduce((t, l) => t + (l.longitude ?? 0), 0) / ok.length,
  }
}
