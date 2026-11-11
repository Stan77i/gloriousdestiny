import { classesBouton } from '@/components/ui/classesBouton'
import { HeroUnivers } from '@/components/marque/HeroUnivers'
import { Regard } from '@/components/marque/Regard'
import { visuelProduit } from '@/features/catalogue/visuels'
import { GrilleProduits } from '@/features/catalogue/GrilleProduits'
import { useProduits } from '@/features/catalogue/requetes'
import { useTitreDocument } from '@/hooks/useTitreDocument'

/** Cils : les cils et accessoires vendus en ligne. */
export function PageCils() {
  useTitreDocument('Cils')
  const produits = useProduits()
  const accessoires = produits.data?.filter((p) => p.type === 'accessoire_cils')
  const kit = visuelProduit('lash-extension-kit').pleine

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <HeroUnivers
        nuit
        titre="Le regard,"
        accent="sublimé."
        intro="Nos cils à poser vous-même : bandes, grappes de 80D à 200D, kits complets et accessoires, du naturel au cat eye."
        image={
          kit
            ? { src: kit.grande, srcSet: `${kit.petite} 800w, ${kit.grande} 1024w`, alt: kit.alt }
            : null
        }
        decor={<Regard className="w-48 sm:w-64" />}
        actions={
          <>
            <a href="#titre-accessoires" className={classesBouton('or', 'grand', 'no-underline')}>
              Voir les cils
            </a>
          </>
        }
      />

      {accessoires && accessoires.length > 0 && (
        <section
          aria-labelledby="titre-accessoires"
          className="scroll-mt-24 border-t border-filet py-16"
        >
          <h2 id="titre-accessoires" className="titre-affiche mb-8 text-[34px] text-encre">
            Cils et accessoires
          </h2>
          <GrilleProduits
            produits={accessoires}
            chargement={false}
            erreur={null}
            onReessayer={() => void produits.refetch()}
            vide={null}
          />
        </section>
      )}
    </div>
  )
}
