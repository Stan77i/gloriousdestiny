import { Link, useSearchParams } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { EtatVide } from '@/components/ui/Etats'
import { GrilleProduits } from '@/features/catalogue/GrilleProduits'
import { useProduits } from '@/features/catalogue/requetes'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'

const FILTRES = [
  { valeur: null, libelle: 'Tout' },
  { valeur: 'pose-de-perruque', libelle: 'Pose de perruque' },
  { valeur: 'coiffage', libelle: 'Coiffage' },
  { valeur: 'perruques', libelle: 'Perruques' },
  { valeur: 'cils', libelle: 'Cils' },
] as const

/**
 * Catalogue. `/catalogue` montre tout (filtre par catégorie dans l'adresse : ?categorie=),
 * `/produits` montre la gamme de produits professionnels.
 */
export function PageCatalogue({ gammeSeule = false }: { gammeSeule?: boolean }) {
  useTitreDocument(gammeSeule ? 'Produits' : 'Catalogue')
  const [params] = useSearchParams()
  const categorie = gammeSeule ? null : params.get('categorie')
  const produits = useProduits()

  const filtres = produits.data?.filter((p) => {
    if (gammeSeule) return p.type === 'produit'
    return categorie === null || p.categorie.slug === categorie
  })
  const libelle = FILTRES.find((f) => f.valeur === categorie)?.libelle

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-10">
      <EnTetePage
        teinte="sauge"
        titre={gammeSeule ? 'Produits' : 'Catalogue'}
        intro="La gamme professionnelle Glorious Destiny : pose de perruque et coiffage. Livraison au Cameroun, en Côte d’Ivoire, au Gabon, au Congo, au Sénégal, en Guinée, au Canada et au Royaume-Uni."
      />
      {!gammeSeule && (
        <nav aria-label="Catégories" className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {FILTRES.map((f) => {
              const actif = f.valeur === categorie
              return (
                <li key={f.libelle}>
                  <Link
                    to={f.valeur ? `${CHEMINS.catalogue}?categorie=${f.valeur}` : CHEMINS.catalogue}
                    aria-current={actif ? 'page' : undefined}
                    className={cx(
                      'inline-flex min-h-10 items-center rounded-full border px-4 text-sm whitespace-nowrap no-underline transition-colors',
                      actif
                        ? 'border-or bg-or/12 text-or-texte'
                        : 'border-filet-fort text-encre-2 hover:border-or/60 hover:text-encre',
                    )}
                  >
                    {f.libelle}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
      <GrilleProduits
        produits={filtres}
        chargement={produits.isPending}
        erreur={produits.error}
        onReessayer={() => void produits.refetch()}
        vide={
          <EtatVide
            titre={`Aucun article ${libelle ? `en « ${libelle} »` : ''} pour le moment`}
            action={<BoutonWhatsApp libelle="Demander conseil sur WhatsApp" />}
          >
            Notre sélection s’enrichit. Écrivez-nous : nous vous répondons sur WhatsApp.
          </EtatVide>
        }
      />
    </div>
  )
}
