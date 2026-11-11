import { decalerJour } from '@/lib/format/date'

/** Périodes proposées sur le tableau de bord. Les jours sont ceux du salon (AAAA-MM-JJ). */
export const PERIODES = [
  { id: 'jour', libelle: 'Aujourd’hui' },
  { id: '7j', libelle: '7 jours' },
  { id: '30j', libelle: '30 jours' },
  { id: 'mois', libelle: 'Ce mois' },
  { id: 'mois-1', libelle: 'Mois dernier' },
] as const
export type IdPeriode = (typeof PERIODES)[number]['id']

export type Periode = { du: string; au: string; comparaison: string }

function premierDuMois(jour: string): string {
  return `${jour.slice(0, 8)}01`
}

/** Bornes d'une période à partir du jour courant du salon. */
export function bornesPeriode(id: IdPeriode, aujourdhui: string): Periode {
  switch (id) {
    case 'jour':
      return { du: aujourdhui, au: aujourdhui, comparaison: 'vs hier' }
    case '7j':
      return { du: decalerJour(aujourdhui, -6), au: aujourdhui, comparaison: 'vs 7 jours avant' }
    case '30j':
      return { du: decalerJour(aujourdhui, -29), au: aujourdhui, comparaison: 'vs 30 jours avant' }
    case 'mois':
      return {
        du: premierDuMois(aujourdhui),
        au: aujourdhui,
        comparaison: 'vs même durée avant',
      }
    case 'mois-1': {
      const fin = decalerJour(premierDuMois(aujourdhui), -1)
      return { du: premierDuMois(fin), au: fin, comparaison: 'vs mois d’avant' }
    }
  }
}

export type Variation = { valeur: string; sens: 'hausse' | 'baisse' } | null

/**
 * Variation en pourcentage, arrondie à l'unité. Null quand elle n'a pas de sens
 * (période précédente à zéro) ou quand rien n'a bougé.
 */
export function variation(actuel: number, precedent: number): Variation {
  if (precedent <= 0 || actuel === precedent) return null
  const pct = Math.round(((actuel - precedent) / precedent) * 100)
  if (pct === 0) return null
  return {
    valeur: `${pct > 0 ? '+' : '−'}${String(Math.abs(pct))} %`,
    sens: pct > 0 ? 'hausse' : 'baisse',
  }
}

/** Graduation « ronde » au-dessus du maximum (1, 2 ou 5 × 10^n). */
export function graduation(max: number): number {
  if (max <= 0) return 0
  const puissance = 10 ** Math.floor(Math.log10(max))
  const pas = [1, 2, 5, 10].find((p) => p * puissance >= max) ?? 10
  return pas * puissance
}

/** « 47 500 » → « 47,5 k » ; « 1 250 000 » → « 1,3 M ». */
export function montantCompact(n: number): string {
  const f = (x: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: x < 10 ? 1 : 0 }).format(x)
  if (n >= 1_000_000) return `${f(n / 1_000_000)} M`
  if (n >= 1000) return `${f(n / 1000)} k`
  return String(n)
}
