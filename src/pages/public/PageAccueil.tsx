import { SITE } from '@/config/site'
import { ArrowRight } from 'lucide-react'
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
import { HeroLaGamme } from '@/features/catalogue/HeroLaGamme'
import { SLUG_LA_GAMME } from '@/features/catalogue/visuels'
import { useProduits } from '@/features/catalogue/requetes'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { OffresDuMoment, RegardCils } from '@/features/accueil/SectionsBeaute'
import { PrestationsAccueil } from '@/features/accueil/PrestationsAccueil'
import { Univers } from '@/features/accueil/Univers'
import { BarreOffre } from '@/features/accueil/BarreOffre'
import { SoieOr } from '@/components/marque/SoieOr'
import { MotTournant } from '@/features/accueil/MotTournant'
import { SceneSalon } from '@/features/accueil/SceneSalon'
import { Revele } from '@/components/marque/Revele'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'

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
    teinte: 'sable',
  },
  {
    slug: 'glue-residue-remover-shampoo',
    geste: 'Nettoyer',
    texte: 'Les résidus de colle partent au lavage.',
    teinte: 'rose',
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
          <Revele indice={i} className="h-full">
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
          </Revele>
        </li>
      ))}
    </ol>
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
          <h2 id="titre-presence" className="titre-affiche text-[40px] text-encre sm:text-[52px]">
            De Douala à Montréal
          </h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-encre-2">
            {SITE.zonesLivraison}. Explorez la carte : chaque trajet en or est un colis réellement
            parti ou livré.
          </p>
        </div>
        <ChiffresPresence />
      </div>
      <Revele>
        <ScenePresence etat={etat} className="mt-8" />
      </Revele>
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
  const gamme = produits.data?.filter((p) => p.type === 'produit' && p.slug !== SLUG_LA_GAMME)
  const laGamme = produits.data?.find((p) => p.slug === SLUG_LA_GAMME)

  return (
    <>
      {/* Premier écran : la soie d'or (WebGL) derrière le titre. */}
      <section className="relative isolate overflow-hidden">
        <SoieOr className="absolute inset-0 -z-20" />
        {/* Voile : garde le texte lisible (en haut sur téléphone, à gauche sur ordinateur). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-fond from-25% via-fond/75 via-50% to-transparent to-80% lg:bg-gradient-to-r lg:from-fond lg:from-20% lg:via-fond/70 lg:via-45% lg:to-transparent lg:to-75%"
        />
        <div className="mx-auto grid min-h-[88svh] max-w-7xl items-center gap-6 px-4 pt-10 pb-16 sm:px-6 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-10 lg:py-16">
          <div className="self-start lg:self-center">
            <h1 className="titre-affiche text-[56px] text-encre sm:text-[84px] xl:text-[96px]">
              Votre pose,
              <br />
              <MotTournant
                className="text-or-texte"
                mots={['sublimée.', 'révélée.', 'magnifiée.', 'parfaite.']}
              />
            </h1>
            <VeineOr className="mt-7 max-w-md" vivante />
            <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-encre-2">
              Perruques, cils, prestations capillaires et une gamme professionnelle pensée pour la
              pose, de la colle au shampoing anti-résidus.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to={CHEMINS.catalogue}
                className={classesBouton('principal', 'grand', 'no-underline')}
              >
                Découvrir la gamme
              </Link>
              <Link
                to={CHEMINS.prestations}
                className={classesBouton('secondaire', 'grand', 'no-underline')}
              >
                Nos prestations
              </Link>
            </div>
          </div>
          {/* La scène du salon, au fil d'or, à droite du titre (dessous sur téléphone). */}
          <SceneSalon className="mx-auto aspect-[420/470] w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[520px]" />
        </div>
      </section>

      <Univers produits={produits.data} />
      <PrestationsAccueil />
      <OffresDuMoment produits={produits.data} onReessayer={() => void produits.refetch()} />
      <BarreOffre produits={produits.data} onTermine={() => void produits.refetch()} />

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
          <Revele vedette className="mb-8">
            <HeroLaGamme produit={laGamme} />
          </Revele>
          <GrilleProduits
            produits={gamme}
            chargement={produits.isPending}
            erreur={produits.error}
            onReessayer={() => void produits.refetch()}
            vide={null}
            colonnes="-mx-4 grid-flow-col auto-cols-[46%] overflow-x-auto snap-x snap-mandatory scroll-px-4 px-4 pb-3 [scrollbar-width:none] [&>li]:snap-start sm:auto-cols-[31%] md:mx-0 md:grid-flow-row md:auto-cols-auto md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4"
          />
        </div>
      </section>

      <RegardCils produits={produits.data} onReessayer={() => void produits.refetch()} />

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
        <div className="zone-nuit grid gap-8 rounded-panneau bg-fond p-8 text-encre sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <h2 className="titre-affiche text-[34px] sm:text-[52px]">
              Livrée chez vous,
              <br />
              <span className="text-or">payée à la livraison</span>
            </h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-encre-2">
              En espèces ou par Mobile Money, à la remise de votre colis.
            </p>
            <BoutonWhatsApp variante="or" className="mt-8" />
          </div>
          <ul aria-label="Pays livrés" className="flex flex-wrap gap-2 lg:justify-end">
            {SITE.paysLivres.map((v) => (
              <li
                key={v}
                className="rounded-full bg-carte px-4 py-2 text-[15px] font-semibold text-encre ring-1 ring-or/25"
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
