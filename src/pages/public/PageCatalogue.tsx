import { SITE } from '@/config/site'
import { Link, useSearchParams } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { EtatVide } from '@/components/ui/Etats'
import { HeroLaGamme } from '@/features/catalogue/HeroLaGamme'
import { SLUG_LA_GAMME } from '@/features/catalogue/visuels'
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
  { valeur: 'coffret', libelle: 'Coffret' },
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
    if (gammeSeule) return p.type === 'produit' && p.slug !== SLUG_LA_GAMME
    return categorie === null || p.categorie.slug === categorie
  })
  const libelle = FILTRES.find((f) => f.valeur === categorie)?.libelle

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-10">
      {/* En-tête compact, comme un écran d'application : titre, nombre d'articles, livraison. */}
      <header className="flex items-end justify-between gap-4 pt-4 pb-5 sm:pt-8">
        <div>
          <h1 className="titre-affiche text-[40px] text-encre sm:text-[52px]">
            {gammeSeule ? 'Produits' : 'Boutique'}
          </h1>
          <p className="mt-1 text-[14px] text-encre-3">
            Livraison dans {SITE.paysLivres.length} pays · paiement à la livraison
          </p>
        </div>
        {filtres && (
          <p className="chiffres shrink-0 rounded-full bg-or-doux px-3 py-1.5 text-[13px] font-semibold text-or-texte">
            {filtres.length} article{filtres.length > 1 ? 's' : ''}
          </p>
        )}
      </header>
      {gammeSeule && (
        <div className="mb-8">
          <HeroLaGamme produit={produits.data?.find((p) => p.slug === SLUG_LA_GAMME)} />
        </div>
      )}
      {!gammeSeule && (
        <nav
          aria-label="Catégories"
          className="-mx-4 mb-5 [scrollbar-width:none] overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
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
