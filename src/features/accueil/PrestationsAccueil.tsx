import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { classesBouton } from '@/components/ui/classesBouton'
import { usePrestations } from '@/features/catalogue/prestations'
import { PhotoPrestation } from '@/features/prestations/PhotoPrestation'
import { useRevele } from '@/hooks/useRevele'
import { formaterFcfa } from '@/lib/format/montant'
import type { Prestation } from '@/services/catalogue.service'

function Vignette({ p, indice }: { p: Prestation; indice: number }) {
  const ref = useRevele(indice)
  return (
    <li ref={ref}>
      <Link
        to={`${CHEMINS.prestations}#${p.slug}`}
        className="presta group flex flex-col gap-3 no-underline"
      >
        <PhotoPrestation
          prestation={p}
          fixe
          tailles="(min-width: 1024px) 22vw, 45vw"
          className="rounded-[22px]"
        />
        <span className="flex flex-col gap-1 px-1">
          <span className="text-[17px] font-semibold text-encre group-hover:text-or sm:text-[19px]">
            {p.nom}
          </span>
          <span className="chiffres text-[15px] font-semibold text-or">{formaterFcfa(p.prix)}</span>
        </span>
      </Link>
    </li>
  )
}

/** Accès aux prestations depuis l'accueil : les quatre prestations, leur prix, un lien. */
export function PrestationsAccueil() {
  const prestations = usePrestations()
  if (!prestations.data || prestations.data.length === 0) return null
  return (
    <section
      aria-labelledby="titre-prestations-accueil"
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10"
    >
      <div className="zone-nuit rounded-panneau bg-fond p-6 text-encre sm:p-10 lg:p-14">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <h2
              id="titre-prestations-accueil"
              className="titre-affiche text-[40px] uppercase sm:text-[52px]"
            >
              Nos <span className="text-or">prestations</span>
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-encre-2">
              Pose frontale, traitement, coloration et montage de perruque : un savoir-faire dédié à
              la mise en valeur de vos cheveux.
            </p>
          </div>
          <Link to={CHEMINS.prestations} className={classesBouton('or', 'grand', 'no-underline')}>
            Découvrir et réserver
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-6">
          {prestations.data.map((p, i) => (
            <Vignette key={p.id} p={p} indice={i} />
          ))}
        </ul>
      </div>
    </section>
  )
}
