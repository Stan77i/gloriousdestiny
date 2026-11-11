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
            <div className="grid gap-6 rounded-panneau bg-carte p-7 shadow-panneau sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <p className="text-[22px] font-semibold tracking-[-0.015em] text-encre">
                  Notre sélection de perruques arrive en ligne.
                </p>
                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-encre-2">
                  En attendant, décrivez-nous la perruque que vous cherchez : nous vous répondons
                  sur WhatsApp avec les modèles disponibles.
                </p>
                <BoutonWhatsApp libelle="Être conseillée sur WhatsApp" className="mt-6" />
              </div>
              <ul
                aria-label="Ce que nous vous demanderons"
                className="flex flex-wrap gap-2 lg:justify-end"
              >
                {['Longueur', 'Texture : lisse, ondulée, bouclée', 'Couleur', 'Type de lace'].map(
                  (c) => (
                    <li
                      key={c}
                      className="rounded-full bg-rose px-4 py-2 text-[14px] font-medium text-encre"
                    >
                      {c}
                    </li>
                  ),
                )}
              </ul>
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
