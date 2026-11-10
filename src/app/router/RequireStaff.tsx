import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { EtatChargement } from '@/components/ui/Etats'
import { aRole, type Role } from '@/domain/roles'
import { useAuth } from '@/features/auth/useAuth'
import { PageAccesRefuse } from '@/pages/errors/PageAccesRefuse'
import { CHEMINS } from './chemins'

/**
 * Garde des routes d'administration. Protection d'interface uniquement :
 * la base refuse de toute façon les accès non autorisés (RLS).
 * Sans `roles` : tout membre actif du personnel. Avec `roles` : ces rôles + owner/admin.
 */
export function RequireStaff({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.statut === 'chargement') return <EtatChargement libelle="Vérification de la session…" />
  if (auth.statut === 'anonyme') {
    return <Navigate to={CHEMINS.connexion} replace state={{ depuis: location.pathname }} />
  }
  const role = auth.profil?.role ?? null
  const autorise = roles === undefined ? role !== null : aRole(role, roles)
  if (!autorise) return <PageAccesRefuse />
  return children
}
