import { ArrowLeft, Clock } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Squelette } from '@/components/ui/Chargeur'
import { classesBouton } from '@/components/ui/classesBouton'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { EtatErreur } from '@/components/ui/Etats'
import { ListeServices } from '@/features/catalogue/ListeServices'
import { useParametresPublics, useService } from '@/features/catalogue/requetes'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDuree } from '@/lib/format/duree'
import { formaterFcfa } from '@/lib/format/montant'
import { PageIntrouvable } from '@/pages/errors/PageIntrouvable'

function InfosSalon() {
  const parametres = useParametresPublics()
  if (!parametres.data?.ville_salon && !parametres.data?.horaires_salon) return null
  return (
    <p className="text-sm text-encre-3">
      {[parametres.data.ville_salon, parametres.data.horaires_salon].filter(Boolean).join(' · ')}
    </p>
  )
}

/** Liste des prestations du salon. */
export function PageServices() {
  useTitreDocument('Services')
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-10">
      <EnTetePage
        teinte="sable"
        titre="Services"
        intro={
          <>
            <p>Les prestations du salon Glorious Destiny.</p>
            <div className="mt-2">
              <InfosSalon />
            </div>
          </>
        }
        actions={
          <Link
            to={CHEMINS.rendezVous}
            className={classesBouton('principal', 'normal', 'no-underline')}
          >
            Prendre rendez-vous
          </Link>
        }
      />
      <div className="pb-10">
        <ListeServices />
      </div>
    </div>
  )
}

/** Fiche d'une prestation. */
export function PageService() {
  const { slug = '' } = useParams()
  const service = useService(slug)
  useTitreDocument(service.data?.nom)

  if (service.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Squelette className="h-14 w-2/3" />
        <Squelette className="mt-6 h-24 w-full" />
      </div>
    )
  }
  if (service.isError) {
    return (
      <EtatErreur
        message={versErreurApp(service.error).message}
        onReessayer={() => void service.refetch()}
      />
    )
  }
  if (!service.data) return <PageIntrouvable />
  const s = service.data

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <Link
        to={CHEMINS.services}
        className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-encre-3 no-underline hover:text-encre [&_svg]:size-4"
      >
        <ArrowLeft aria-hidden="true" />
        Services
      </Link>
      <EnTetePage
        teinte="sable"
        className="pt-6"
        titre={s.nom}
        intro={s.description}
        actions={
          <Link
            to={CHEMINS.reserver(s.slug)}
            className={classesBouton('principal', 'grand', 'no-underline')}
          >
            Réserver ce service
          </Link>
        }
      />
      <dl className="mb-10 grid grid-cols-2 gap-4 border-t border-filet pt-8 sm:max-w-md">
        <div>
          <dt className="text-sm text-encre-3">Durée</dt>
          <dd className="mt-1 inline-flex items-center gap-1.5 text-[19px] font-semibold [&_svg]:size-4 [&_svg]:text-or">
            <Clock aria-hidden="true" />
            {formaterDuree(s.dureeMinutes)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-encre-3">Prix</dt>
          <dd className="mt-1 text-[19px] font-semibold text-or-texte">{formaterFcfa(s.prix)}</dd>
        </div>
      </dl>
      <InfosSalon />
    </div>
  )
}
