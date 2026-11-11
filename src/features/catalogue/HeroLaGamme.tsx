import { ArrowRight, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Bouton } from '@/components/ui/Bouton'
import { classesBouton } from '@/components/ui/classesBouton'
import { usePanier } from '@/features/panier/usePanier'
import { formaterFcfa } from '@/lib/format/montant'
import type { Produit } from '@/services/catalogue.service'
import { lienProduit } from './liens'
import { useDisponibilites } from './requetes'
import { PHOTO_LA_GAMME } from './visuels'

const COMPOSITION = [
  'Lace Glue × 2',
  'Lace Melting Spray × 2',
  'Wax Stick × 2',
  'Glue Liquid Gel',
  'Lace Glue Remover Spray',
  'Silkening Mist',
  'Hair Styling Gel',
]

/**
 * La gamme en grand : la photo d'ensemble de la cliente, telle quelle, en tête de la gamme
 * (accueil et page Produits). Prix et disponibilité viennent de la base ; sans produit
 * publié, rien ne s'affiche.
 */
export function HeroLaGamme({ produit }: { produit: Produit | undefined }) {
  const panier = usePanier()
  const { notifier } = useNotifications()
  const variante = produit?.variantes[0]
  const dispo = useDisponibilites(variante ? [variante.id] : [])
  if (!produit || !variante) return null
  const statut = dispo.data?.get(variante.id)
  const epuise = statut === 'epuise'

  return (
    <section
      aria-labelledby="titre-la-gamme"
      className="overflow-hidden rounded-panneau bg-carte shadow-panneau"
    >
      <Link to={lienProduit(produit)} className="block" tabIndex={-1} aria-hidden="true">
        <img
          src={PHOTO_LA_GAMME.grande}
          srcSet={`${PHOTO_LA_GAMME.petite} 1000w, ${PHOTO_LA_GAMME.grande} 2000w`}
          sizes="(min-width: 1280px) 1200px, 100vw"
          alt=""
          className="aspect-[4/3] w-full object-cover sm:aspect-[2000/1116]"
        />
      </Link>
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-10 lg:p-10">
        <div>
          <p className="text-[13px] font-semibold tracking-[0.16em] text-or-texte uppercase">
            Le coffret
          </p>
          <h3
            id="titre-la-gamme"
            className="titre-affiche mt-2 text-[34px] leading-[1.05] text-encre sm:text-[48px]"
          >
            {produit.nom}
          </h3>
          <p className="sr-only">{PHOTO_LA_GAMME.alt}</p>
          <ul aria-label="Contenu de La gamme" className="mt-5 flex flex-wrap gap-2">
            {COMPOSITION.map((c) => (
              <li
                key={c}
                className="rounded-full bg-carte-2 px-3.5 py-1.5 text-[13px] font-medium text-encre-2"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4 lg:items-end">
          <p className="chiffres titre-affiche text-[40px] leading-none text-or-texte sm:text-[48px]">
            {formaterFcfa(variante.prix)}
          </p>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Bouton
              variante="or"
              taille="grand"
              icone={<ShoppingBag />}
              disabled={epuise || dispo.isPending}
              onClick={() => {
                panier.ajouter(variante.id)
                notifier(`${produit.nom} ajoutée au panier.`, 'succes')
              }}
            >
              {epuise ? 'Épuisée' : 'Ajouter au panier'}
            </Bouton>
            <Link
              to={lienProduit(produit)}
              className={classesBouton('secondaire', 'grand', 'no-underline')}
            >
              Voir le détail
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
