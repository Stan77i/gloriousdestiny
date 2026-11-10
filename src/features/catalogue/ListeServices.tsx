import { ArrowRight, Clock } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDuree } from '@/lib/format/duree'
import { formaterFcfa } from '@/lib/format/montant'
import type { Service } from '@/services/catalogue.service'
import { useServices } from './requetes'

/** Liste éditoriale des prestations (lignes, pas des cartes) : nom, durée, prix. */
export function ListeServices({ filtre }: { filtre?: (s: Service) => boolean }) {
  const services = useServices()
  if (services.isError) {
    return (
      <EtatErreur
        message={versErreurApp(services.error).message}
        onReessayer={() => void services.refetch()}
      />
    )
  }
  if (services.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Squelette className="h-16 w-full" />
        <Squelette className="h-16 w-full" />
      </div>
    )
  }
  const liste = filtre ? services.data.filter(filtre) : services.data
  return (
    <ul className="divide-y divide-filet border-y border-filet">
      {liste.map((s) => (
        <li key={s.id}>
          <Link
            to={CHEMINS.service(s.slug)}
            className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-6 no-underline"
          >
            <span className="text-[21px] font-semibold text-ivoire group-hover:text-or-clair">
              {s.nom}
            </span>
            <span className="text-[17px] font-semibold whitespace-nowrap text-or-clair">
              {formaterFcfa(s.prix)}
            </span>
            {s.description && (
              <span className="max-w-2xl text-[15px] leading-relaxed text-ivoire-3">
                {s.description}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 self-start text-[13px] whitespace-nowrap text-ivoire-3 [&_svg]:size-3.5">
              <Clock aria-hidden="true" />
              {formaterDuree(s.dureeMinutes)}
              <ArrowRight
                aria-hidden="true"
                className="ml-1 text-or-clair opacity-0 transition-opacity group-hover:opacity-100"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
