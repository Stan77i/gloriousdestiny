import { z } from 'zod'

/**
 * Variables d'environnement publiques (préfixe VITE_, envoyées au navigateur).
 * La validation refuse explicitement toute clé secrète : une erreur de
 * configuration vaut mieux qu'une fuite.
 */
const schema = z.object({
  VITE_SUPABASE_URL: z.url({ protocol: /^https$/ }),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20)
    .refine((cle) => !cle.startsWith('sb_secret_'), 'Clé secrète interdite côté navigateur')
    .refine((cle) => !estJwtServiceRole(cle), 'Clé service_role interdite côté navigateur'),
})

function estJwtServiceRole(cle: string): boolean {
  const parties = cle.split('.')
  const charge = parties[1]
  if (parties.length !== 3 || charge === undefined) return false
  try {
    const json: unknown = JSON.parse(atob(charge.replace(/-/g, '+').replace(/_/g, '/')))
    return (
      typeof json === 'object' && json !== null && 'role' in json && json.role === 'service_role'
    )
  } catch {
    return false
  }
}

export type Env = {
  supabaseUrl: string
  supabasePublishableKey: string
}

export class ConfigurationError extends Error {
  override name = 'ConfigurationError'
}

export function lireEnv(source: Record<string, unknown> = import.meta.env): Env {
  const resultat = schema.safeParse(source)
  if (!resultat.success) {
    const details = resultat.error.issues
      .map((i) => `${i.path.join('.')} : ${i.message}`)
      .join(' ; ')
    throw new ConfigurationError(`Configuration invalide. ${details}`)
  }
  return {
    supabaseUrl: resultat.data.VITE_SUPABASE_URL,
    supabasePublishableKey: resultat.data.VITE_SUPABASE_PUBLISHABLE_KEY,
  }
}
