import { ArrowRight, Clock } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { VeineOr } from '@/components/marque/VeineOr'
import { classesBouton } from '@/components/ui/classesBouton'
import { GAMME } from '@/features/catalogue/gamme'
import { GrilleProduits } from '@/features/catalogue/GrilleProduits'
import { useParametresPublics, useProduits, useServices } from '@/features/catalogue/requetes'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { formaterDuree } from '@/lib/format/duree'
import { formaterFcfa } from '@/lib/format/montant'

/** Le rituel de pose : les produits de la gamme dans l'ordre où on les utilise. */
const RITUEL = [
  { slug: 'lace-glue', geste: 'Fixer', texte: 'La colle se pose le long de la ligne frontale.' },
  { slug: 'lace-melting-spray', geste: 'Fondre', texte: 'La dentelle disparaît dans la peau.' },
  {
    slug: 'lace-glue-remover-spray',
    geste: 'Retirer',
    texte: 'La perruque se décolle en douceur.',
  },
  {
    slug: 'glue-residue-remover-shampoo',
    geste: 'Nettoyer',
    texte: 'Les résidus de colle partent au lavage.',
  },
]

function Rituel() {
  const etapes = RITUEL.flatMap((e) => {
    const produit = GAMME.find((p) => p.slug === e.slug)
    return produit?.photo ? [{ ...e, produit, photo: produit.photo }] : []
  })
  return (
    <ol className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {etapes.map((e, i) => (
        <li key={e.slug} className="w-[78%] shrink-0 snap-start sm:w-auto">
          <Link to={CHEMINS.produit(e.slug)} className="group block no-underline">
            <div className="relative aspect-[3/4] overflow-hidden rounded-panneau border border-filet">
              <img
                src={e.photo.petite}
                alt={e.photo.alt}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-700 ease-(--ease-sortie) group-hover:scale-[1.03]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-noir/70 to-transparent"
              />
              <span className="absolute top-4 left-4 font-display text-[44px] leading-none text-ivoire">
                {i + 1}
              </span>
            </div>
            <p className="mt-4 font-display text-[28px] text-ivoire">{e.geste}</p>
            <p className="mt-1 text-sm leading-relaxed text-ivoire-3">{e.texte}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-or-clair group-hover:text-or [&_svg]:size-4">
              {e.produit.nom}
              <ArrowRight aria-hidden="true" />
            </p>
          </Link>
        </li>
      ))}
    </ol>
  )
}

function Services() {
  const services = useServices()
  const parametres = useParametresPublics()
  if (!services.data || services.data.length === 0) return null
  const photo = GAMME.find((p) => p.slug === 'braid-gel')?.photo
  return (
    <section
      aria-labelledby="titre-salon"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10"
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        {photo && (
          <div className="relative order-last min-h-80 overflow-hidden rounded-panneau border border-filet lg:order-first">
            <img
              src={photo.grande}
              srcSet={`${photo.petite} 800w, ${photo.grande} 1600w`}
              sizes="(min-width: 1024px) 45vw, 100vw"
              alt={photo.alt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        )}
        <div>
          <h2 id="titre-salon" className="titre-affiche text-[40px] text-ivoire sm:text-[52px]">
            Le salon
          </h2>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-ivoire-2">
            Pose et entretien de perruques, pose de cils
            {parametres.data?.ville_salon ? `, à ${parametres.data.ville_salon}` : ''}.
          </p>
          <ul className="mt-8 divide-y divide-filet border-y border-filet">
            {services.data.map((s) => (
              <li key={s.id}>
                <Link
                  to={CHEMINS.service(s.slug)}
                  className="group flex items-baseline justify-between gap-4 py-5 no-underline"
                >
                  <span>
                    <span className="block text-[19px] font-semibold text-ivoire group-hover:text-or-clair">
                      {s.nom}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-ivoire-3 [&_svg]:size-3.5">
                      <Clock aria-hidden="true" />
                      {formaterDuree(s.dureeMinutes)}
                    </span>
                  </span>
                  <span className="text-[17px] font-semibold whitespace-nowrap text-or-clair">
                    {formaterFcfa(s.prix)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {parametres.data?.horaires_salon && (
            <p className="mt-5 text-sm text-ivoire-3">{parametres.data.horaires_salon}</p>
          )}
          <Link
            to={CHEMINS.rendezVous}
            className={classesBouton('secondaire', 'normal', 'mt-7 no-underline')}
          >
            Prendre rendez-vous
          </Link>
        </div>
      </div>
    </section>
  )
}

/** Accueil du site public. */
export function PageAccueil() {
  useTitreDocument()
  const produits = useProduits()
  const gamme = produits.data?.filter((p) => p.type === 'produit')
  const vedette = GAMME.find((p) => p.slug === 'lace-melting-spray')?.photo

  return (
    <>
      {/* Premier écran */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 pb-16 sm:px-6 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-14 lg:px-10 lg:py-10">
        <div>
          <h1 className="titre-affiche text-[56px] text-ivoire sm:text-[84px] xl:text-[96px]">
            Votre pose,
            <br />
            <span className="italic">sublimée.</span>
          </h1>
          <VeineOr className="mt-7 max-w-md" />
          <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-ivoire-2">
            Perruques, pose de cils au salon et une gamme professionnelle pensée pour la pose, de la
            colle au shampoing anti-résidus.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to={CHEMINS.catalogue}
              className={classesBouton('principal', 'grand', 'no-underline')}
            >
              Découvrir la gamme
            </Link>
            <Link
              to={CHEMINS.rendezVous}
              className={classesBouton('secondaire', 'grand', 'no-underline')}
            >
              Prendre rendez-vous
            </Link>
          </div>
        </div>
        {vedette && (
          <figure className="relative h-[460px] overflow-hidden rounded-panneau border border-filet sm:h-[560px] lg:h-[min(720px,calc(100svh-8rem))]">
            <img
              src={vedette.grande}
              srcSet={`${vedette.petite} 800w, ${vedette.grande} 1600w`}
              sizes="(min-width: 1024px) 45vw, 100vw"
              alt={vedette.alt}
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover object-[50%_30%]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-noir/90 to-transparent px-6 pt-20 pb-5">
              <span className="text-sm text-ivoire-2">Lace Melting Spray</span>
              <Link
                to={CHEMINS.produit('lace-melting-spray')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-or-clair no-underline hover:text-or [&_svg]:size-4"
              >
                Voir le produit
                <ArrowRight aria-hidden="true" />
              </Link>
            </figcaption>
          </figure>
        )}
      </section>

      {/* Le rituel de pose */}
      <section aria-labelledby="titre-rituel" className="border-t border-filet">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
          <h2 id="titre-rituel" className="titre-affiche text-[40px] text-ivoire sm:text-[52px]">
            Le rituel de pose
          </h2>
          <p className="mt-4 mb-10 max-w-xl text-[17px] leading-relaxed text-ivoire-2">
            Quatre gestes, quatre produits Glorious Destiny, de la pose au retrait.
          </p>
          <Rituel />
        </div>
      </section>

      {/* La gamme */}
      <section aria-labelledby="titre-gamme" className="border-t border-filet">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="titre-gamme" className="titre-affiche text-[40px] text-ivoire sm:text-[52px]">
              La gamme
            </h2>
            <Link
              to={CHEMINS.catalogue}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-or-clair no-underline hover:text-or [&_svg]:size-4"
            >
              Tout le catalogue
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <GrilleProduits
            produits={gamme}
            chargement={produits.isPending}
            erreur={produits.error}
            onReessayer={() => void produits.refetch()}
            vide={null}
          />
        </div>
      </section>

      <div className="border-t border-filet">
        <Services />
      </div>

      {/* Clôture */}
      <section className="border-t border-filet">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center">
          <h2 className="titre-affiche text-[34px] text-ivoire sm:text-[44px]">
            Livrée chez vous, payée à la livraison
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ivoire-2">
            Douala, Yaoundé, Garoua et Abidjan. En espèces ou par Mobile Money, à la remise de votre
            colis.
          </p>
          <BoutonWhatsApp className="mt-8" />
        </div>
      </section>
    </>
  )
}
