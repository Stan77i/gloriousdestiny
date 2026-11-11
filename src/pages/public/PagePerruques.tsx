import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { classesBouton } from '@/components/ui/classesBouton'
import { HeroUnivers } from '@/components/marque/HeroUnivers'
import { Meches } from '@/components/marque/Meches'
import { GAMME } from '@/features/catalogue/gamme'
import { GrilleProduits } from '@/features/catalogue/GrilleProduits'
import { ListeServices } from '@/features/catalogue/ListeServices'
import { useProduits } from '@/features/catalogue/requetes'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'

/** Perruques : vente (catalogue type « perruque »), pose et entretien au salon. */
export function PagePerruques() {
  useTitreDocument('Perruques')
  const produits = useProduits()
  const perruques = produits.data?.filter((p) => p.type === 'perruque')
  const soins = produits.data?.filter((p) => p.categorie.slug === 'pose-de-perruque')
  const photo = GAMME.find((p) => p.slug === 'lace-glue')?.photo

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <HeroUnivers
        titre="Perruques,"
        accent="pose parfaite."
        intro="Lace wigs posées au salon, collées ou sans colle, entretien et remise en forme : avec les produits professionnels qui font tenir la pose."
        fond="bg-rose"
        image={
          photo
            ? {
                src: photo.grande,
                srcSet: `${photo.petite} 800w, ${photo.grande} 1600w`,
                alt: photo.alt,
                position: 'object-[60%_35%]',
              }
            : null
        }
        decor={
          <Meches className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-48 opacity-70 lg:-right-10 lg:w-64" />
        }
        actions={
          <>
            <Link to={CHEMINS.rendezVous} className={classesBouton('or', 'grand', 'no-underline')}>
              Réserver une pose
            </Link>
            <BoutonWhatsApp libelle="Être conseillée" />
          </>
        }
      />

      <section aria-labelledby="titre-selection" className="py-16">
        <h2 id="titre-selection" className="titre-affiche mb-8 text-[34px] text-encre">
          Notre sélection
        </h2>
        <GrilleProduits
          produits={perruques}
          chargement={produits.isPending}
          erreur={produits.error}
          onReessayer={() => void produits.refetch()}
          vide={
            <div className="zone-nuit relative isolate overflow-hidden rounded-panneau bg-fond text-encre">
              <Meches className="pointer-events-none absolute inset-y-0 right-[4%] -z-10 h-full w-56 opacity-70 sm:w-72" />
              <div className="grid gap-8 p-7 sm:p-12 lg:grid-cols-[1.25fr_1fr] lg:items-center">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-or-doux px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.12em] text-or uppercase">
                    <span
                      aria-hidden="true"
                      className="size-1.5 animate-pulse-doux rounded-full bg-or"
                    />
                    Rupture de stock
                  </p>
                  <h3 className="titre-affiche mt-5 text-[34px] leading-[1.05] sm:text-[48px]">
                    Nos perruques sont
                    <br />
                    <span className="text-or">momentanément épuisées.</span>
                  </h3>
                  <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-encre-2">
                    Dites-nous la perruque que vous cherchez : nous vous prévenons sur WhatsApp dès
                    le retour des modèles qui vous correspondent. La pose et l’entretien de votre
                    propre perruque restent disponibles au salon.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <BoutonWhatsApp
                      variante="or"
                      libelle="Être prévenue du retour"
                      message="Bonjour, je souhaite être prévenue du retour des perruques. Je cherche : longueur …, texture …, couleur …, type de lace …"
                    />
                    <Link
                      to={CHEMINS.rendezVous}
                      className={classesBouton('secondaire', 'normal', 'no-underline')}
                    >
                      Réserver une pose
                    </Link>
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-encre-2">
                    Ce que vous pourrez nous préciser
                  </p>
                  <ul
                    aria-label="Ce que vous pourrez nous préciser"
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    {[
                      'Longueur',
                      'Lisse, ondulée ou bouclée',
                      'Couleur',
                      'Type de lace',
                      'Densité',
                    ].map((c) => (
                      <li
                        key={c}
                        className="rounded-full bg-carte px-4 py-2 text-[14px] font-medium text-encre ring-1 ring-or/25"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          }
        />
      </section>

      <section aria-labelledby="titre-salon-perruques" className="border-t border-filet py-16">
        <h2 id="titre-salon-perruques" className="titre-affiche mb-8 text-[34px] text-encre">
          Au salon
        </h2>
        <ListeServices filtre={(s) => s.type === 'perruque'} />
      </section>

      {soins && soins.length > 0 && (
        <section aria-labelledby="titre-soins" className="border-t border-filet py-16">
          <h2 id="titre-soins" className="titre-affiche mb-8 text-[34px] text-encre">
            Pour la pose
          </h2>
          <GrilleProduits
            produits={soins}
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
