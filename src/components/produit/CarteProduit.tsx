import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { cx } from '@/lib/cx'

export type Disponibilite = 'disponible' | 'bientot_epuise' | 'epuise'

/**
 * Carte produit du catalogue. Le produit détouré repose sur un socle noir chaud,
 * la photo d'usage apparaît au survol (souris) quand elle existe.
 * Le prix est fourni par la base ; sans prix, « Prix sur demande ».
 */
export function CarteProduit({
  nom,
  format,
  categorie,
  detoure,
  photo,
  prix,
  disponibilite,
  onAjouter,
}: {
  nom: string
  format: string | null
  categorie: string
  detoure: string
  photo?: string | undefined
  prix: string | null
  disponibilite: Disponibilite
  onAjouter?: () => void
}) {
  const epuise = disponibilite === 'epuise'
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-panneau border border-filet bg-surface-1 transition-[border-color,transform] duration-300 ease-(--ease-sortie) hover:-translate-y-0.5 hover:border-or/45">
      <div className="relative aspect-[4/5] overflow-hidden bg-[radial-gradient(120%_80%_at_50%_100%,var(--color-surface-3),var(--color-noir)_70%)]">
        <img
          src={detoure}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-contain p-[6%] transition-transform duration-700 ease-(--ease-sortie) group-hover:scale-[1.04]"
        />
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
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-[17px] leading-snug font-semibold text-ivoire">{nom}</h3>
        <p className="text-[13px] text-ivoire-3">
          {format ? `${categorie} · ${format}` : categorie}
        </p>
        {/* Sur mobile (2 colonnes étroites) : prix au-dessus, bouton pleine largeur. */}
        <div className="mt-auto flex flex-col items-stretch gap-2.5 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className={cx('text-[15px] font-semibold', prix ? 'text-or-clair' : 'text-ivoire-3')}>
            {prix ?? 'Prix sur demande'}
          </p>
          {onAjouter && (
            // Variante discrète : l'or plein reste réservé à l'action principale de la page.
            <Bouton
              taille="petit"
              variante="secondaire"
              disabled={epuise}
              onClick={onAjouter}
              icone={<Plus />}
              aria-label={`Ajouter ${nom} au panier`}
            >
              Ajouter
            </Bouton>
          )}
        </div>
      </div>
    </article>
  )
}
