import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { classesBouton } from '@/components/ui/classesBouton'
import { useTitreDocument } from '@/hooks/useTitreDocument'

export function PageAccesRefuse() {
  useTitreDocument('Accès refusé')
  return (
    <section className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-ivoire">
        Votre compte n'a pas accès à cet espace.
      </h1>
      <p className="text-ivoire-3">Demandez à la propriétaire de vous attribuer le bon rôle.</p>
      <Link to={CHEMINS.accueil} className={classesBouton('secondaire', 'normal', 'no-underline')}>
        Retour à l'accueil
      </Link>
    </section>
  )
}
