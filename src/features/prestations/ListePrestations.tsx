import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { usePrestations } from '@/features/catalogue/prestations'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterFcfa } from '@/lib/format/montant'

/** Liste éditoriale des prestations (nom, prix), chacune menant à sa section de réservation. */
export function ListePrestations() {
  const prestations = usePrestations()
  if (prestations.isError) {
    return (
      <EtatErreur
        message={versErreurApp(prestations.error).message}
        onReessayer={() => void prestations.refetch()}
      />
    )
  }
  if (prestations.isPending) return <Squelette className="h-40 w-full" />
  return (
    <ul className="divide-y divide-filet border-y border-filet">
      {prestations.data.map((p) => (
        <li key={p.id}>
          <Link
            to={`${CHEMINS.prestations}#${p.slug}`}
            className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-6 no-underline"
          >
            <span className="text-[21px] font-semibold text-encre group-hover:text-or-texte">
              {p.nom}
            </span>
            <span className="chiffres text-[17px] font-semibold whitespace-nowrap text-or-texte">
              {formaterFcfa(p.prix)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-encre-3 [&_svg]:size-3.5">
              Réserver cette prestation
              <ArrowRight
                aria-hidden="true"
                className="text-or-texte transition-transform group-hover:translate-x-1"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
