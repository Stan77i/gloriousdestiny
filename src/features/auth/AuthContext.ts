import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'
import type { ProfilStaff } from '@/services/auth/auth.service'

export type EtatAuth =
  | { statut: 'chargement' }
  | { statut: 'anonyme' }
  | { statut: 'connecte'; session: Session; profil: ProfilStaff | null }

export type ValeurAuth = EtatAuth & {
  seConnecter: (email: string, motDePasse: string) => Promise<void>
  seDeconnecter: () => Promise<void>
}

export const AuthContext = createContext<ValeurAuth | null>(null)
