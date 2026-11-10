import type { Session } from '@supabase/supabase-js'
import { estRole, type Role } from '@/domain/roles'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { ErreurApp } from '@/lib/errors/ErreurApp'
import { supabase } from '@/services/supabase/client'

export type ProfilStaff = { id: string; nom: string; role: Role }

export async function connexionParMotDePasse(email: string, motDePasse: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email, password: motDePasse })
  if (error) {
    // Message volontairement identique que l'e-mail existe ou non.
    if (error.status === 400)
      throw new ErreurApp('validation', 'Identifiants invalides', { cause: error })
    throw versErreurApp(error)
  }
}

export async function deconnexion(): Promise<void> {
  const { error } = await supabase().auth.signOut()
  if (error) throw versErreurApp(error)
}

export async function sessionActuelle(): Promise<Session | null> {
  const { data, error } = await supabase().auth.getSession()
  if (error) throw versErreurApp(error)
  return data.session
}

/** Profil du personnel connecté ; null si l'utilisateur n'est pas staff ou est désactivé. */
export async function profilStaff(userId: string): Promise<ProfilStaff | null> {
  const { data, error } = await supabase()
    .from('profiles')
    .select('id, nom, role, actif')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw versErreurApp(error)
  if (!data?.actif || !estRole(data.role)) return null
  return { id: data.id, nom: data.nom, role: data.role }
}

export function ecouterSession(rappel: (session: Session | null) => void): () => void {
  const { data } = supabase().auth.onAuthStateChange((_evenement, session) => {
    rappel(session)
  })
  return () => {
    data.subscription.unsubscribe()
  }
}
