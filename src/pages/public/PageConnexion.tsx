import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { CHEMINS } from '@/app/router/chemins'
import { Bouton } from '@/components/ui/Bouton'
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

  const champ =
    'mt-2 block min-h-11 w-full border border-ivoire/20 bg-noir-doux px-3 text-ivoire placeholder:text-ivoire/40 focus:border-or focus:outline-none'

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-light tracking-[0.15em] uppercase">Connexion</h1>
      {auth.statut === 'connecte' && !auth.profil && (
        <p role="alert" className="text-sm text-ivoire/80">
          Ce compte n'a pas accès à l'administration.
        </p>
      )}
      <form onSubmit={(e) => void soumettre(e)} noValidate className="flex flex-col gap-5">
        <label className="text-sm">
          E-mail
          <input
            type="email"
            autoComplete="email"
            className={champ}
            aria-invalid={errors.email ? true : undefined}
            {...register('email')}
          />
          {errors.email && (
            <span className="mt-1 block text-xs text-red-300">{errors.email.message}</span>
          )}
        </label>
        <label className="text-sm">
          Mot de passe
          <input
            type="password"
            autoComplete="current-password"
            className={champ}
            aria-invalid={errors.motDePasse ? true : undefined}
            {...register('motDePasse')}
          />
          {errors.motDePasse && (
            <span className="mt-1 block text-xs text-red-300">{errors.motDePasse.message}</span>
          )}
        </label>
        {erreur && (
          <p role="alert" className="text-sm text-red-300">
            {erreur}
          </p>
        )}
        <Bouton type="submit" enCours={isSubmitting}>
          Se connecter
        </Bouton>
      </form>
    </section>
  )
}
