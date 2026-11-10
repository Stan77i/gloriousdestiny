import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  connexionParMotDePasse,
  deconnexion,
  ecouterSession,
  profilStaff,
} from '@/services/auth/auth.service'
import { AuthContext, type EtatAuth, type ValeurAuth } from './AuthContext'

/** Session Supabase + profil staff (rôle). Le rôle est relu depuis la base, jamais depuis le jeton. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatAuth>({ statut: 'chargement' })

  const appliquerSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setEtat({ statut: 'anonyme' })
      return
    }
    try {
      const profil = await profilStaff(session.user.id)
      setEtat({ statut: 'connecte', session, profil })
    } catch (erreur) {
      console.error('Lecture du profil impossible', erreur)
      setEtat({ statut: 'connecte', session, profil: null })
    }
  }, [])

  useEffect(() => {
    // onAuthStateChange émet aussi la session initiale (INITIAL_SESSION).
    // L'appel async est différé pour ne pas bloquer le verrou interne de supabase-js.
    return ecouterSession((session) => {
      setTimeout(() => void appliquerSession(session), 0)
    })
  }, [appliquerSession])

  const valeur = useMemo<ValeurAuth>(
    () => ({
      ...etat,
      seConnecter: connexionParMotDePasse,
      seDeconnecter: deconnexion,
    }),
    [etat],
  )

  return <AuthContext value={valeur}>{children}</AuthContext>
}
