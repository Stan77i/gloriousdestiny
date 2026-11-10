import { ConfigurationError } from '@/config/env'
import { ErreurApp, type CodeErreur } from './ErreurApp'

type ErreurPostgrest = { code?: string; message?: string; details?: string | null; status?: number }

/** Préfixes levés par les fonctions SQL (voir supabase/migrations). */
const PREFIXES_METIER: [string, CodeErreur][] = [
  ['STOCK_INSUFFISANT', 'stock_insuffisant'],
  ['TROP_DE_COMMANDES', 'trop_de_commandes'],
  ['TRANSITION_IMPOSSIBLE', 'transition'],
  ['PRODUIT_INDISPONIBLE', 'introuvable'],
  ['COMMANDE_INTROUVABLE', 'introuvable'],
  ['CLIENTE_INTROUVABLE', 'introuvable'],
  ['VALIDATION', 'validation'],
  ['ACCES_REFUSE', 'acces_refuse'],
  ['QUANTITE_INVALIDE', 'validation'],
  ['VARIANTE_INCONNUE', 'introuvable'],
  ['HISTORIQUE_IMMUABLE', 'acces_refuse'],
]

/** Codes SQLSTATE / PostgREST les plus courants. */
const CODES_SQL: Record<string, CodeErreur> = {
  '42501': 'acces_refuse', // permission refusée
  '23505': 'conflit', // unicité
  '23514': 'validation', // contrainte CHECK
  '23502': 'validation', // NOT NULL
  '23503': 'validation', // clé étrangère
  '23P01': 'conflit', // contrainte d'exclusion (créneau déjà pris)
  '22023': 'validation',
  P0002: 'introuvable',
  PGRST116: 'introuvable',
  PGRST301: 'non_connecte',
}

/** Convertit n'importe quelle erreur (Supabase, réseau, JS) en ErreurApp affichable. */
export function versErreurApp(erreur: unknown): ErreurApp {
  if (erreur instanceof ErreurApp) return erreur
  if (erreur instanceof ConfigurationError)
    return new ErreurApp('configuration', erreur.message, { cause: erreur })

  if (erreur instanceof TypeError && /fetch|network|load failed/i.test(erreur.message)) {
    return new ErreurApp('reseau', erreur.message, { cause: erreur })
  }

  if (typeof erreur === 'object' && erreur !== null) {
    const e = erreur as ErreurPostgrest
    const message = e.message ?? ''
    for (const [prefixe, code] of PREFIXES_METIER) {
      if (message.startsWith(prefixe)) return new ErreurApp(code, message, { cause: erreur })
    }
    const code = e.code ? CODES_SQL[e.code] : undefined
    if (code) return new ErreurApp(code, message, { cause: erreur })
    if (e.status === 401) return new ErreurApp('non_connecte', message, { cause: erreur })
    if (e.status === 403) return new ErreurApp('acces_refuse', message, { cause: erreur })
    if (e.status === 404) return new ErreurApp('introuvable', message, { cause: erreur })
    if (/failed to fetch|networkerror/i.test(message))
      return new ErreurApp('reseau', message, { cause: erreur })
    return new ErreurApp('inconnue', message || undefined, { cause: erreur })
  }

  return new ErreurApp('inconnue', String(erreur))
}
