import { useState } from 'react'
import { CalendarHeart } from 'lucide-react'
import { Meches } from '@/components/marque/Meches'
import { Squelette } from '@/components/ui/Chargeur'
import { Bouton } from '@/components/ui/Bouton'
import { EtatErreur } from '@/components/ui/Etats'
import { usePrestations } from '@/features/catalogue/prestations'
import { PhotoPrestation } from '@/features/prestations/PhotoPrestation'
import { ReservationPrestation } from '@/features/prestations/ReservationPrestation'
import { universPrestation } from '@/features/prestations/univers'
import { useRevele } from '@/hooks/useRevele'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterFcfa } from '@/lib/format/montant'
import type { Prestation } from '@/services/catalogue.service'

function BlocPrestation({
  p,
  rang,
  onReserver,
}: {
  p: Prestation
  rang: number
  onReserver: () => void
}) {
  const ref = useRevele()
  const inverse = rang % 2 === 1
  return (
    <article
      ref={ref}
      id={p.slug}
      aria-labelledby={`titre-${p.slug}`}
      className="presta grid scroll-mt-24 items-center gap-8 lg:grid-cols-2 lg:gap-16"
    >
      <PhotoPrestation
        prestation={p}
        className={cx(
          'rounded-[28px] shadow-[0_30px_70px_-40px_rgb(23_20_15/0.55)]',
          inverse && 'lg:order-2',
        )}
      />
      <div className="flex flex-col gap-5 lg:max-w-lg">
        <h2
          id={`titre-${p.slug}`}
          className="titre-affiche text-[40px] leading-[1.02] text-encre sm:text-[52px]"
        >
          {p.nom}
          <span className="mt-3 block font-sans text-[15px] font-medium tracking-normal text-or-texte">
            {universPrestation(p.slug).accroche}
          </span>
        </h2>
        {p.description && (
          <p className="text-[17px] leading-relaxed text-encre-2">{p.description}</p>
        )}
        <p className="presta-prix chiffres self-start text-[34px] leading-none font-semibold text-encre">
          {formaterFcfa(p.prix)}
        </p>
        <Bouton
          variante="or"
          taille="grand"
          icone={<CalendarHeart />}
          className="self-start"
          onClick={onReserver}
        >
          Réserver cette prestation
        </Bouton>
      </div>
    </article>
  )
}

/** « Nos prestations » : les prestations capillaires, réservées sur demande via WhatsApp. */
export function PagePrestations() {
  useTitreDocument('Nos prestations')
  const prestations = usePrestations()
  const [choisie, setChoisie] = useState<Prestation | null>(null)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <section className="zone-nuit relative isolate mt-4 overflow-hidden rounded-panneau bg-fond text-encre">
        <Meches className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-[60%] opacity-50 sm:w-[42%]" />
        <div className="flex max-w-3xl flex-col gap-6 p-7 py-14 sm:p-12 lg:p-16">
          <span aria-hidden="true" className="presta-fil block h-px w-24 bg-or" />
          <h1 className="titre-affiche text-[44px] leading-[0.98] tracking-[-0.02em] uppercase sm:text-[64px]">
            Nos <span className="text-or">prestations</span>
          </h1>
          <p className="max-w-xl text-[17px] leading-relaxed text-encre-2 sm:text-[19px]">
            Votre beauté mérite une attention particulière. Découvrez nos prestations capillaires et
            profitez d’un savoir-faire dédié à la mise en valeur de vos cheveux.
          </p>
          {prestations.data && prestations.data.length > 0 && (
            <ul className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {prestations.data.map((p) => (
                <li key={p.id}>
                  <a
                    href={`#${p.slug}`}
                    className="group flex min-h-11 items-baseline justify-between gap-4 border-b border-or/25 py-2 text-encre no-underline hover:border-or"
                  >
                    <span className="text-[15px] group-hover:text-or">{p.nom}</span>
                    <span className="chiffres text-[15px] font-semibold text-or">
                      {formaterFcfa(p.prix)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-24 py-20 sm:gap-32">
        {prestations.isError ? (
          <EtatErreur
            message={versErreurApp(prestations.error).message}
            onReessayer={() => void prestations.refetch()}
          />
        ) : prestations.isPending ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <Squelette className="aspect-[4/5] w-full rounded-[28px]" />
            <Squelette className="h-64 w-full" />
          </div>
        ) : (
          prestations.data.map((p, i) => (
            <BlocPrestation
              key={p.id}
              p={p}
              rang={i}
              onReserver={() => {
                setChoisie(p)
              }}
            />
          ))
        )}
      </div>

      {choisie && (
        <ReservationPrestation
          key={choisie.id}
          prestation={choisie}
          onFermer={() => {
            setChoisie(null)
          }}
        />
      )}
    </div>
  )
}
