import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { classesBouton } from '@/components/ui/classesBouton'
import { useTitreDocument } from '@/hooks/useTitreDocument'

export function PageIntrouvable() {
  useTitreDocument('Page introuvable')
  return (
    <section className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <h1 className="titre-affiche text-[40px] text-encre">Cette page n'existe pas.</h1>
      <p className="text-encre-3">L’adresse est peut-être erronée, ou la page a été déplacée.</p>
      <Link to={CHEMINS.accueil} className={classesBouton('secondaire', 'normal', 'no-underline')}>
        Retour à l'accueil
      </Link>
    </section>
  )
}
