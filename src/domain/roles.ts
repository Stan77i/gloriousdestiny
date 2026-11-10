/**
 * Rôles du personnel. Miroir de la contrainte CHECK de public.profiles.
 * L'autorisation réelle est appliquée par la base (RLS + fonctions) ; ce module
 * ne sert qu'à adapter l'interface (masquer ce qui serait refusé).
 */
export const ROLES = ['owner', 'admin', 'ventes', 'stock', 'logistique'] as const
export type Role = (typeof ROLES)[number]

export const LIBELLES_ROLES: Record<Role, string> = {
  owner: 'Propriétaire',
  admin: 'Administration',
  ventes: 'Ventes',
  stock: 'Stock',
  logistique: 'Logistique',
}

export function estRole(valeur: unknown): valeur is Role {
  return typeof valeur === 'string' && (ROLES as readonly string[]).includes(valeur)
}

/** Même règle que private.a_role : owner et admin ont tous les droits du personnel. */
export function aRole(role: Role | null, autorises: readonly Role[]): boolean {
  if (role === null) return false
  return role === 'owner' || role === 'admin' || autorises.includes(role)
}
