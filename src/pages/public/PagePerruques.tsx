import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { classesBouton } from '@/components/ui/classesBouton'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { EtatVide } from '@/components/ui/Etats'
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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <EnTetePage
        titre="Perruques"
        intro="Vente, pose et entretien de perruques, avec les produits professionnels qui font tenir la pose."
        actions={
          <Link
            to={CHEMINS.rendezVous}
            className={classesBouton('principal', 'normal', 'no-underline')}
          >
            Réserver une pose
          </Link>
        }
      />

      <section aria-labelledby="titre-selection" className="pb-16">
        <h2 id="titre-selection" className="titre-affiche mb-8 text-[34px] text-ivoire">
          Notre sélection
        </h2>
        <GrilleProduits
          produits={perruques}
          chargement={produits.isPending}
          erreur={produits.error}
          onReessayer={() => void produits.refetch()}
          vide={
            <div className="rounded-panneau border border-filet bg-surface-1">
              <EtatVide
                titre="Notre sélection de perruques arrive en ligne"
                action={<BoutonWhatsApp libelle="Être conseillée sur WhatsApp" />}
              >
                En attendant, décrivez-nous la perruque que vous cherchez : longueur, texture,
                couleur. Nous vous répondons sur WhatsApp.
              </EtatVide>
            </div>
          }
        />
      </section>

      <section aria-labelledby="titre-salon-perruques" className="border-t border-filet py-16">
        <h2 id="titre-salon-perruques" className="titre-affiche mb-8 text-[34px] text-ivoire">
          Au salon
        </h2>
        <ListeServices filtre={(s) => s.type === 'perruque'} />
      </section>

      {soins && soins.length > 0 && (
        <section aria-labelledby="titre-soins" className="border-t border-filet py-16">
          <h2 id="titre-soins" className="titre-affiche mb-8 text-[34px] text-ivoire">
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
