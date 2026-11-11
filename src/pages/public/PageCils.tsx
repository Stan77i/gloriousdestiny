import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { classesBouton } from '@/components/ui/classesBouton'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { GrilleProduits } from '@/features/catalogue/GrilleProduits'
import { ListeServices } from '@/features/catalogue/ListeServices'
import { useProduits } from '@/features/catalogue/requetes'
import { useTitreDocument } from '@/hooks/useTitreDocument'

/** Cils : la prestation au salon, puis les cils et accessoires vendus en ligne. */
export function PageCils() {
  useTitreDocument('Cils')
  const produits = useProduits()
  const accessoires = produits.data?.filter((p) => p.type === 'accessoire_cils')

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <EnTetePage
        teinte="lilas"
        titre="Cils"
        intro="Pose de cils au salon, adaptée à la forme de vos yeux, et nos cils à poser vous-même."
        actions={
          <Link
            to={CHEMINS.rendezVous}
            className={classesBouton('principal', 'normal', 'no-underline')}
          >
            Réserver une pose de cils
          </Link>
        }
      />
      <section aria-labelledby="titre-prestation" className="pb-16">
        <h2 id="titre-prestation" className="titre-affiche mb-8 text-[34px] text-encre">
          La prestation
        </h2>
        <ListeServices filtre={(s) => s.type === 'cils'} />
      </section>
      {accessoires && accessoires.length > 0 && (
        <section aria-labelledby="titre-accessoires" className="border-t border-filet py-16">
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
