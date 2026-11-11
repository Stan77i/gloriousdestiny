import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Regard } from '@/components/marque/Regard'
import { CompteARebours } from '@/components/produit/CompteARebours'
import { prochaineFin } from './offres'
import { classesBouton } from '@/components/ui/classesBouton'
import { GrilleProduits } from '@/features/catalogue/GrilleProduits'
import type { Produit } from '@/services/catalogue.service'

/** Offres du moment : n'existe que si une promotion réelle est en cours. */
export function OffresDuMoment({
  produits,
  onReessayer,
}: {
  produits: Produit[] | undefined
  onReessayer: () => void
}) {
  const offres = produits?.filter((p) => p.variantes.some((v) => v.promo))
  const fin = prochaineFin(produits)
  if (!offres || offres.length === 0) return null
  return (
    <section
      id="offres"
      aria-labelledby="titre-offres"
      className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-20 sm:px-6 lg:px-10"
    >
      <div className="zone-nuit rounded-panneau bg-fond p-5 text-encre sm:p-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="titre-offres" className="titre-affiche text-[40px] leading-none sm:text-[56px]">
            Offres <span className="text-or">du moment</span>
          </h2>
          {fin ? (
            <CompteARebours fin={fin.fin} titre={fin.titre} onTermine={onReessayer} />
          ) : (
            <p className="max-w-sm text-[15px] text-encre-2">
              Réductions réelles, calculées sur le prix habituel.
            </p>
          )}
        </div>
        <GrilleProduits
          produits={offres}
          chargement={false}
          erreur={null}
          onReessayer={onReessayer}
          vide={null}
        />
      </div>
    </section>
  )
}

/** Le regard : bande nocturne, l'œil qui se dessine, et la sélection de cils. */
export function RegardCils({
  produits,
  onReessayer,
}: {
  produits: Produit[] | undefined
  onReessayer: () => void
}) {
  const cils = produits?.filter((p) => p.type === 'accessoire_cils')
  if (!cils || cils.length === 0) return null
  // Les plus accessibles d'abord : une porte d'entrée pour découvrir les cils.
  const selection = [...cils].sort((a, b) => a.prix - b.prix).slice(0, 4)
  return (
    <section
      aria-labelledby="titre-regard"
      className="zone-nuit relative overflow-hidden bg-fond text-encre"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14 lg:px-10 lg:py-28">
        <div>
          <Regard className="w-full max-w-[340px]" />
          <h2
            id="titre-regard"
            className="titre-affiche mt-8 text-[44px] leading-[1.02] sm:text-[64px]"
          >
            Le regard,
            <br />
            <span className="text-or">en grand.</span>
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-encre-2">
            Bandes fluffy, grappes de 80D à 200D, kits complets : du naturel au cat eye, à poser
            vous-même.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={CHEMINS.cils} className={classesBouton('or', 'grand', 'no-underline')}>
              Tous les cils
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
        <GrilleProduits
          produits={selection}
          chargement={false}
          erreur={null}
          onReessayer={onReessayer}
          vide={null}
          colonnes="grid-cols-2"
        />
      </div>
    </section>
  )
}
