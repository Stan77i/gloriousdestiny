import { useState } from 'react'
import { CalendarHeart } from 'lucide-react'
import { Meches } from '@/components/marque/Meches'
import { Squelette } from '@/components/ui/Chargeur'
import { Bouton } from '@/components/ui/Bouton'
import { EtatErreur } from '@/components/ui/Etats'
import { usePrestations } from '@/features/catalogue/prestations'
import { ArcEtapes } from '@/features/prestations/ArcEtapes'
import { BadgeArticle } from '@/components/produit/BadgesArticle'
import type { TypeBadge } from '@/components/produit/badges'
import { ReservationPrestation } from '@/features/prestations/ReservationPrestation'
import { universPrestation } from '@/features/prestations/univers'
import { useRevele } from '@/hooks/useRevele'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterFcfa } from '@/lib/format/montant'
import type { Prestation } from '@/services/catalogue.service'

/** Le tarif dans son carré : libellé, montant en grand, devise en petites capitales. */
function CarreTarif({ prix }: { prix: number }) {
  const [chiffres] = formaterFcfa(prix).split(/\s*FCFA/)
  return (
    <p className="presta-tarif chiffres flex flex-col items-center justify-center rounded-[20px] bg-or-doux px-5 py-3 text-center ring-1 ring-or/30">
      <span className="text-[11px] font-semibold tracking-[0.14em] text-or-texte uppercase">
        Tarif
      </span>
      <span className="text-[28px] leading-tight font-bold text-encre">{chiffres}</span>
      <span className="text-[11px] font-semibold tracking-[0.14em] text-or-texte">FCFA</span>
    </p>
  )
}

function BlocPrestation({ p, onReserver }: { p: Prestation; onReserver: () => void }) {
  const ref = useRevele()
  const badges: TypeBadge[] = [
    ...(p.badges.coupDeCoeur ? (['coup-de-coeur'] as const) : []),
    ...(p.badges.tresDemandee ? (['tres-demandee'] as const) : []),
  ]
  return (
    <article
      ref={ref}
      id={p.slug}
      aria-labelledby={`titre-${p.slug}`}
      className="presta flex scroll-mt-24 flex-col items-center rounded-panneau bg-carte px-5 pt-8 pb-7 text-center shadow-panneau sm:px-8"
    >
      <ArcEtapes slug={p.slug} photo={p.photo} />
      <div className="mt-6 flex flex-col items-center gap-3">
        {badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {badges.map((b, i) => (
              <BadgeArticle key={b} type={b} indice={i} />
            ))}
          </div>
        )}
        <h2
          id={`titre-${p.slug}`}
          className="titre-affiche text-[34px] leading-[1.04] text-encre sm:text-[40px]"
        >
          {p.nom}
          <span className="mt-2 block font-sans text-[15px] font-medium tracking-normal text-or-texte">
            {universPrestation(p.slug).accroche}
          </span>
        </h2>
      </div>
      <div className="mt-5 flex w-full flex-wrap items-center justify-center gap-3">
        <CarreTarif prix={p.prix} />
        <Bouton variante="or" taille="grand" icone={<CalendarHeart />} onClick={onReserver}>
          Réserver
        </Bouton>
      </div>
      {p.description && (
        <details className="group mt-5 w-full border-t border-filet text-left">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 pt-3 text-[15px] font-semibold text-encre [&::-webkit-details-marker]:hidden">
            En savoir plus
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5 text-or-texte transition-transform duration-300 group-open:rotate-180"
            >
              <path d="m5 7.5 5 5 5-5" />
            </svg>
          </summary>
          <p className="depliable-contenu pt-2 text-[15px] leading-relaxed text-encre-2">
            {p.description}
          </p>
        </details>
      )}
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

      <div className="grid gap-6 py-12 sm:py-16 lg:grid-cols-2 lg:gap-8">
        {prestations.isError ? (
          <EtatErreur
            message={versErreurApp(prestations.error).message}
            onReessayer={() => void prestations.refetch()}
          />
        ) : prestations.isPending ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Squelette className="h-[560px] w-full rounded-panneau" />
            <Squelette className="h-[560px] w-full rounded-panneau" />
          </div>
        ) : (
          prestations.data.map((p) => (
            <BlocPrestation
              key={p.id}
              p={p}
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
