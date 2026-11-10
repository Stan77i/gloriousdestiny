import { use } from 'react'
import { AuthContext, type ValeurAuth } from './AuthContext'

export function useAuth(): ValeurAuth {
  const valeur = use(AuthContext)
  if (!valeur) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return valeur
}
