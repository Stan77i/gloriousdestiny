import { ArrowRight, MapPin, PackageCheck, Truck } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { VeineOr } from '@/components/marque/VeineOr'
import { classesBouton } from '@/components/ui/classesBouton'
import { AFRIQUE } from '@/features/carte/fond'
import { ChiffresPresence, ScenePresence } from '@/features/carte/CartePublique'
import { useEtatCarte } from '@/features/carte/etat'
import { useCartePublique } from '@/features/carte/requetes'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'

/** « Notre présence dans le monde » : la carte en grand, les destinations, les expéditions. */
export function PagePresence() {
  useTitreDocument('Notre présence dans le monde')
  const etat = useEtatCarte('monde')
  const carte = useRef<HTMLDivElement>(null)
  const { data: d } = useCartePublique()

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 lg:px-10 lg:pt-14">
        <p className="text-[13px] font-semibold tracking-[0.16em] text-or-texte uppercase">
          D’Afrique au Canada
        </p>
        <h1 className="titre-affiche mt-3 max-w-3xl text-[44px] leading-[1.02] text-encre sm:text-[64px]">
          Notre présence dans le monde
        </h1>
        <VeineOr className="mt-5 max-w-[260px]" />
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-encre-2">
          Préparés à Douala, nos produits partent vers chaque destination ci-dessous. La carte suit
          les vraies commandes : un trajet en or n’apparaît que lorsqu’un colis est réellement en
          route ou remis à sa destinataire.
        </p>
        <ChiffresPresence className="mt-8" />
      </section>

      <section
        ref={carte}
        aria-label="Carte de nos destinations"
        className="mx-auto max-w-7xl scroll-mt-20 px-2 sm:px-6 lg:px-10"
      >
        <ScenePresence etat={etat} hauteur="immersive" />
      </section>

      <section
        aria-labelledby="titre-destinations"
        className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-10"
      >
        <h2 id="titre-destinations" className="titre-affiche text-[34px] text-encre sm:text-[44px]">
          Nos destinations
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {(d?.pays ?? []).map((p) => {
            const villes = d?.villes.filter((v) => v.pays === p.code) ?? []
            return (
              <li key={p.code}>
                <button
                  type="button"
                  onClick={() => {
                    etat.setVue(p.code)
                    carte.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className="group flex h-full w-full flex-col gap-3 rounded-[22px] bg-carte p-4 text-left transition-shadow hover:shadow-flottant sm:p-5"
                  aria-label={`${p.nom} : voir sur la carte`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block text-[11px] font-semibold tracking-[0.14em] text-encre-3 uppercase">
                        {AFRIQUE.has(p.code)
                          ? 'Afrique'
                          : p.code === 'CA'
                            ? 'Amérique du Nord'
                            : 'Europe'}
                      </span>
                      <span className="mt-0.5 block text-[17px] font-semibold tracking-[-0.02em] text-encre sm:text-[20px]">
                        {p.nom}
                      </span>
                    </span>
                    <MapPin
                      aria-hidden="true"
                      className="size-5 text-or-texte transition-transform group-hover:-translate-y-0.5"
                    />
                  </span>
                  <span className="text-[14px] text-encre-2">
                    {villes.map((v) => v.nom).join(', ')}
                  </span>
                  <span
                    className={cx(
                      'mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold [&_svg]:size-3.5',
                      p.livrees > 0
                        ? 'degrade-or text-sur-or'
                        : p.en_route > 0
                          ? 'bg-or-doux text-or-texte'
                          : 'bg-carte-2 text-encre-2',
                    )}
                  >
                    {p.livrees > 0 ? (
                      <>
                        <PackageCheck aria-hidden="true" />
                        {p.livrees} livrée(s)
                      </>
                    ) : p.en_route > 0 ? (
                      <>
                        <Truck aria-hidden="true" />
                        {p.en_route} en route
                      </>
                    ) : (
                      'Destination desservie'
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section
        aria-labelledby="titre-expeditions"
        className="mx-auto max-w-7xl px-4 pt-14 pb-20 sm:px-6 lg:px-10"
      >
        <div className="grid gap-8 rounded-panneau bg-carte p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <h2
              id="titre-expeditions"
              className="titre-affiche text-[34px] text-encre sm:text-[44px]"
            >
              Expéditions internationales
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-encre-2">
              Commandez sur le site comme d’habitude. Nous confirmons avec vous sur WhatsApp les
              modalités d’envoi et de paiement pour votre pays avant de préparer le colis.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={CHEMINS.catalogue} className={classesBouton('or', 'grand', 'no-underline')}>
                Découvrir les produits
                <ArrowRight aria-hidden="true" />
              </Link>
              <BoutonWhatsApp />
            </div>
          </div>
          <dl className="grid gap-3">
            {[
              [
                'Commande enregistrée',
                'Votre commande est reçue. Ce n’est pas encore une livraison : elle n’est pas comptée comme telle sur la carte.',
              ],
              [
                'En route',
                'Le colis est remis au transporteur. Le trajet apparaît en pointillés d’or qui avancent.',
              ],
              [
                'Livrée',
                'Le colis est remis à la cliente. Seulement alors, le trajet est tracé en or plein.',
              ],
            ].map(([t, x], i) => (
              <div key={t} className="flex gap-4 rounded-[18px] bg-carte-2 p-4">
                <span className="chiffres grid size-8 shrink-0 place-items-center rounded-full bg-encre text-[13px] font-semibold text-fond">
                  {i + 1}
                </span>
                <div>
                  <dt className="font-semibold text-encre">{t}</dt>
                  <dd className="mt-1 text-[14px] leading-relaxed text-encre-2">{x}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-4 text-[13px] text-encre-3">
          Chiffres agrégés et anonymes, calculés à partir des commandes réelles. Aucun nom, numéro
          ni adresse n’est publié.
        </p>
      </section>
    </>
  )
}
