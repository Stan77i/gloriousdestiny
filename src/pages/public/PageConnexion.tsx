import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { CHEMINS } from '@/app/router/chemins'
import { Alerte } from '@/components/ui/Alerte'
import { Bouton } from '@/components/ui/Bouton'
import { Champ, Saisie } from '@/components/ui/Champs'
import { useAuth } from '@/features/auth/useAuth'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'

const schema = z.object({
  email: z.email('Adresse e-mail invalide'),
  motDePasse: z.string().min(8, '8 caractères minimum'),
})
type Valeurs = z.infer<typeof schema>

function cheminDeRetour(etat: unknown): string {
  if (typeof etat === 'object' && etat !== null && 'depuis' in etat) {
    const depuis = etat.depuis
    // Uniquement un chemin interne : pas de redirection ouverte.
    if (typeof depuis === 'string' && depuis.startsWith('/') && !depuis.startsWith('//'))
      return depuis
  }
  return CHEMINS.admin
}

/** Connexion du personnel (e-mail + mot de passe). L'espace cliente arrive en Phase 5. */
export function PageConnexion() {
  useTitreDocument('Connexion')
  const auth = useAuth()
  const naviguer = useNavigate()
  const location = useLocation()
  const [erreur, setErreur] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Valeurs>({ resolver: zodResolver(schema) })

  if (auth.statut === 'connecte' && auth.profil) {
    return <Navigate to={cheminDeRetour(location.state)} replace />
  }

  const soumettre = handleSubmit(async ({ email, motDePasse }) => {
    setErreur(null)
    try {
      await auth.seConnecter(email, motDePasse)
      void naviguer(cheminDeRetour(location.state), { replace: true })
    } catch (e) {
      const app = versErreurApp(e)
      setErreur(app.code === 'validation' ? 'E-mail ou mot de passe incorrect.' : app.message)
    }
  })

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-7 px-4 py-16 sm:py-24">
      <div>
        <h1 className="titre-affiche text-[44px] text-ivoire">Connexion</h1>
        <p className="mt-2 text-sm text-ivoire-3">Espace réservé à l’équipe Glorious Destiny.</p>
      </div>
      {auth.statut === 'connecte' && !auth.profil && (
        <Alerte ton="alerte" titre="Ce compte n'a pas accès à l'administration." />
      )}
      <form onSubmit={(e) => void soumettre(e)} noValidate className="flex flex-col gap-5">
        <Champ libelle="E-mail" erreur={errors.email?.message}>
          {(a) => <Saisie {...a} type="email" autoComplete="email" {...register('email')} />}
        </Champ>
        <Champ libelle="Mot de passe" erreur={errors.motDePasse?.message}>
          {(a) => (
            <Saisie
              {...a}
              type="password"
              autoComplete="current-password"
              {...register('motDePasse')}
            />
          )}
        </Champ>
        {erreur && <Alerte ton="danger" titre={erreur} />}
        <Bouton type="submit" taille="grand" enCours={isSubmitting} className="mt-1">
          Se connecter
        </Bouton>
      </form>
    </section>
  )
}
