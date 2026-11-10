import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { FOND_TEINTE, type Teinte } from '@/domain/univers'
import { cx } from '@/lib/cx'
import type { Disponibilite } from '@/services/catalogue.service'
import { Monogramme } from './Monogramme'

export type { Disponibilite }

/**
 * Carte produit du catalogue. Le produit détouré repose sur un socle teinté selon son univers,
 * la photo d'usage apparaît au survol (souris) quand elle existe.
 * Toute la carte mène à la fiche (lien étiré sur le nom) ; le bouton reste indépendant.
 */
export function CarteProduit({
  nom,
  format,
  categorie,
  detoure,
  photo,
  prix,
  disponibilite,
  vers,
  onAjouter,
  enCours = false,
  teinte = 'sauge',
}: {
  nom: string
  format: string | null
  categorie: string
  detoure: string | null
  photo?: string | undefined
  prix: string | null
  disponibilite: Disponibilite | undefined
  vers?: string
  onAjouter?: () => void
  enCours?: boolean
  teinte?: Teinte
}) {
  const epuise = disponibilite === 'epuise'
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-panneau bg-carte p-2 shadow-panneau transition-[box-shadow,transform] duration-300 ease-(--ease-sortie) focus-within:shadow-flottant hover:-translate-y-1 hover:shadow-flottant">
      <div
        className={cx('relative aspect-[4/5] overflow-hidden rounded-[22px]', FOND_TEINTE[teinte])}
      >
        {detoure ? (
          <img
            src={detoure}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-contain p-[6%] transition-transform duration-700 ease-(--ease-sortie) group-hover:scale-[1.04]"
          />
        ) : (
          <Monogramme nom={nom} />
        )}
        {photo && (
          <img
            src={photo}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 [@media(hover:none)]:hidden"
          />
        )}
        <div className="absolute top-3 left-3">
          {disponibilite === 'bientot_epuise' && <Badge ton="alerte">Bientôt épuisé</Badge>}
          {epuise && <Badge ton="neutre">Épuisé</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 pt-4 pb-3">
        <h3 className="text-[17px] leading-snug font-semibold text-encre">
          {vers ? (
            <Link
              to={vers}
              className="no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {nom}
            </Link>
          ) : (
            nom
          )}
        </h3>
        <p className="text-[13px] text-encre-3">
          {format ? `${categorie} · ${format}` : categorie}
        </p>
        {/* Sur mobile (2 colonnes étroites) : prix au-dessus, bouton pleine largeur. */}
        <div className="mt-auto flex flex-col items-stretch gap-2.5 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className={cx('text-[15px] font-semibold', prix ? 'text-or-texte' : 'text-encre-3')}>
            {prix ?? 'Prix sur demande'}
          </p>
          {onAjouter && (
            // Variante discrète : l'encre pleine reste réservée à l'action principale de la page.
            // `relative z-10` : reste cliquable au-dessus du lien étiré.
            <Bouton
              taille="petit"
              variante="secondaire"
              disabled={epuise || disponibilite === undefined}
              enCours={enCours}
              onClick={onAjouter}
              icone={<Plus />}
              aria-label={`Ajouter ${nom} au panier`}
              className="relative z-10"
            >
              {epuise ? 'Épuisé' : 'Ajouter'}
            </Bouton>
          )}
        </div>
      </div>
    </article>
  )
}
