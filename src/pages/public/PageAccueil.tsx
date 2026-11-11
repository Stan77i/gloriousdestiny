import { SITE } from '@/config/site'
import { ArrowRight, Clock } from 'lucide-react'
import { Link } from 'react-router'
import { ContenusPublics } from '@/features/contenus/ContenusPublics'
import { ChiffresPresence, ScenePresence } from '@/features/carte/CartePublique'
import { useEtatCarte } from '@/features/carte/etat'
import { CHEMINS } from '@/app/router/chemins'
import { VeineOr } from '@/components/marque/VeineOr'
import { classesBouton } from '@/components/ui/classesBouton'
import { FOND_TEINTE, type Teinte } from '@/domain/univers'
import { GAMME } from '@/features/catalogue/gamme'
import { GrilleProduits } from '@/features/catalogue/GrilleProduits'
import { useParametresPublics, useProduits, useServices } from '@/features/catalogue/requetes'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { formaterDuree } from '@/lib/format/duree'
import { cx } from '@/lib/cx'
import { formaterFcfa } from '@/lib/format/montant'

/** Le rituel de pose : les produits de la gamme dans l'ordre où on les utilise. */
const RITUEL: { slug: string; geste: string; texte: string; teinte: Teinte }[] = [
  {
    slug: 'lace-glue',
    geste: 'Fixer',
    texte: 'La colle se pose le long de la ligne frontale.',
    teinte: 'sable',
  },
  {
    slug: 'lace-melting-spray',
    geste: 'Fondre',
    texte: 'La dentelle disparaît dans la peau.',
    teinte: 'rose',
  },
  {
    slug: 'lace-glue-remover-spray',
    geste: 'Retirer',
    texte: 'La perruque se décolle en douceur.',
    teinte: 'lilas',
  },
  {
    slug: 'glue-residue-remover-shampoo',
    geste: 'Nettoyer',
    texte: 'Les résidus de colle partent au lavage.',
    teinte: 'sauge',
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
          <Link
            to={CHEMINS.produit(e.slug)}
            className={cx(
              'group flex h-full flex-col rounded-panneau p-2 pb-5 no-underline transition-transform duration-300 ease-(--ease-sortie) hover:-translate-y-1',
              FOND_TEINTE[e.teinte],
            )}
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-[22px]">
              <img
                src={e.photo.petite}
                alt={e.photo.alt}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-700 ease-(--ease-sortie) group-hover:scale-[1.03]"
              />
              <span className="chiffres absolute top-3 left-3 grid size-11 place-items-center rounded-full bg-carte text-[17px] font-semibold text-encre shadow-panneau">
                {i + 1}
              </span>
            </div>
            <p className="mt-4 px-3 text-[28px] font-semibold tracking-[-0.02em] text-encre">
              {e.geste}
            </p>
            <p className="mt-1 px-3 text-sm leading-relaxed text-encre-2">{e.texte}</p>
            <p className="mt-auto inline-flex items-center gap-1.5 px-3 pt-3 text-sm font-semibold text-encre underline-offset-4 group-hover:underline [&_svg]:size-4">
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
          <div className="relative order-last min-h-80 overflow-hidden rounded-panneau lg:order-first">
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
          <h2 id="titre-salon" className="titre-affiche text-[40px] text-encre sm:text-[52px]">
            Le salon
          </h2>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-encre-2">
            Pose et entretien de perruques, pose de cils
            {parametres.data?.ville_salon ? `, à ${parametres.data.ville_salon}` : ''}.
          </p>
          <ul className="mt-8 flex flex-col gap-2">
            {services.data.map((s) => (
              <li key={s.id}>
                <Link
                  to={CHEMINS.service(s.slug)}
                  className="group flex items-center justify-between gap-4 rounded-[22px] bg-carte px-5 py-4 no-underline shadow-panneau transition-colors duration-300 hover:bg-sable"
                >
                  <span>
                    <span className="block text-[19px] font-semibold text-encre">{s.nom}</span>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-encre-3 [&_svg]:size-3.5">
                      <Clock aria-hidden="true" />
                      {formaterDuree(s.dureeMinutes)}
                    </span>
                  </span>
                  <span className="chiffres rounded-full bg-carte-2 px-3.5 py-1.5 text-[15px] font-semibold whitespace-nowrap text-encre group-hover:bg-carte">
                    {formaterFcfa(s.prix)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {parametres.data?.horaires_salon && (
            <p className="mt-5 text-sm text-encre-3">{parametres.data.horaires_salon}</p>
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
function PresenceAccueil() {
  const etat = useEtatCarte('monde')
  return (
    <section
      aria-labelledby="titre-presence"
      className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10"
    >
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="text-[13px] font-semibold tracking-[0.16em] text-or-texte uppercase">
            Notre présence dans le monde
          </p>
          <h2
            id="titre-presence"
            className="titre-affiche mt-3 text-[40px] text-encre sm:text-[52px]"
          >
            De Douala à Montréal
          </h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-encre-2">
            {SITE.zonesLivraison}. Explorez la carte : chaque trajet en or est un colis réellement
            parti ou livré.
          </p>
        </div>
        <ChiffresPresence />
      </div>
      <ScenePresence etat={etat} className="mt-8" />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={CHEMINS.presence} className={classesBouton('principal', 'grand', 'no-underline')}>
          Explorer la carte
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link
          to={CHEMINS.catalogue}
          className={classesBouton('secondaire', 'grand', 'no-underline')}
        >
          Découvrir les produits
        </Link>
      </div>
    </section>
  )
}

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
          <h1 className="titre-affiche text-[56px] text-encre sm:text-[84px] xl:text-[96px]">
            Votre pose,
            <br />
            <span className="text-or-texte">sublimée.</span>
          </h1>
          <VeineOr className="mt-7 max-w-md" />
          <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-encre-2">
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
          <figure className="relative h-[460px] overflow-hidden rounded-panneau sm:h-[560px] lg:h-[min(720px,calc(100svh-8rem))]">
            <img
              src={vedette.grande}
              srcSet={`${vedette.petite} 800w, ${vedette.grande} 1600w`}
              sizes="(min-width: 1024px) 45vw, 100vw"
              alt={vedette.alt}
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover object-[50%_30%]"
            />
            <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-full bg-carte/90 py-1.5 pr-1.5 pl-5 shadow-flottant backdrop-blur-md sm:inset-x-4 sm:bottom-4">
              <span className="text-[15px] font-semibold text-encre">Lace Melting Spray</span>
              <Link
                to={CHEMINS.produit('lace-melting-spray')}
                aria-label="Voir le Lace Melting Spray"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-encre text-fond no-underline transition-colors duration-300 hover:bg-encre-2 [&_svg]:size-4"
              >
                <ArrowRight aria-hidden="true" />
              </Link>
            </figcaption>
          </figure>
        )}
      </section>

      {/* Le rituel de pose */}
      <section aria-labelledby="titre-rituel">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
          <h2 id="titre-rituel" className="titre-affiche text-[40px] text-encre sm:text-[52px]">
            Le rituel de pose
          </h2>
          <p className="mt-4 mb-10 max-w-xl text-[17px] leading-relaxed text-encre-2">
            Quatre gestes, quatre produits Glorious Destiny, de la pose au retrait.
          </p>
          <Rituel />
        </div>
      </section>

      {/* La gamme */}
      <section aria-labelledby="titre-gamme">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="titre-gamme" className="titre-affiche text-[40px] text-encre sm:text-[52px]">
              La gamme
            </h2>
            <Link
              to={CHEMINS.catalogue}
              className={classesBouton('secondaire', 'normal', 'no-underline')}
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

      <Services />

      {/* Présence dans le monde : la carte des destinations, données réelles. */}
      <PresenceAccueil />

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-10">
        <ContenusPublics
          titre="Elles l’ont adopté"
          intro="Témoignages, transformations et vidéos de nos clientes, publiés avec leur accord."
          types={['temoignage', 'transformation', 'video', 'photo']}
        />
      </div>

      {/* Clôture */}
      <section className="mx-auto max-w-7xl px-4 pt-4 pb-20 sm:px-6 lg:px-10">
        <div className="grid gap-8 rounded-panneau bg-menthe p-8 text-sur-menthe sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <h2 className="titre-affiche text-[34px] sm:text-[52px]">
              Livrée chez vous,
              <br />
              payée à la livraison
            </h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed">
              En espèces ou par Mobile Money, à la remise de votre colis.
            </p>
            <BoutonWhatsApp variante="sur-menthe" className="mt-8" />
          </div>
          <ul aria-label="Pays livrés" className="flex flex-wrap gap-2 lg:justify-end">
            {SITE.paysLivres.map((v) => (
              <li
                key={v}
                className="rounded-full bg-sur-menthe/10 px-4 py-2 text-[15px] font-semibold"
              >
                {v}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
