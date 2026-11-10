import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { useTitreDocument } from '@/hooks/useTitreDocument'

export function PageIntrouvable() {
  useTitreDocument('Page introuvable')
  return (
    <section className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-xs tracking-[0.4em] text-or uppercase">Erreur 404</p>
      <h1 className="text-2xl font-light">Cette page n'existe pas.</h1>
      <Link
        to={CHEMINS.accueil}
        className="text-sm text-ivoire/80 underline underline-offset-4 hover:text-or"
      >
        Retour à l'accueil
      </Link>
    </section>
  )
}
