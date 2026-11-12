import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { cx } from '@/lib/cx'
import type { Disponibilite } from '@/services/catalogue.service'
import { Monogramme } from './Monogramme'
import { Bulles } from './Bulles'
import { BadgePromo } from './PrixProduit'
import { BadgeArticle } from './BadgesArticle'
import type { TypeBadge } from './badges'

export type { Disponibilite }

/** Univers d'un produit : chacun a sa mise en scène. */
export type Univers = 'soin' | 'cils' | 'perruque'

/**
 * Carte produit compacte, comme dans une application : la photo (badges en haut, bouton
 * d'ajout rond en bas à droite), le nom, le format et le prix dans son bloc. Les explications
 * s'ouvrent au toucher (`onApercu` : aperçu en feuille) ; sans aperçu, la carte mène à la fiche.
 */
export function CarteProduit({
  nom,
  format,
  detoure,
  pleine,
  large = false,
  photo,
  prix,
  reduction,
  badges = [],
  dansPanier = 0,
  onRetirer,
  disponibilite,
  vers,
  onApercu,
  onAjouter,
  choisir = false,
  enCours = false,
  univers = 'soin',
  bulles = false,
}: {
  nom: string
  format: string | null
  /** Conservés pour compatibilité ; affichés dans l'aperçu, plus sur la carte. */
  categorie?: string
  accroche?: string | null
  detoure: string | null
  /** Photo de la cliente telle quelle (sans détourage), en plein cadre. */
  pleine?: string | undefined
  /** Carte vedette sur toute la largeur de la grille (La gamme). */
  large?: boolean
  photo?: string | undefined
  /** Prix déjà mis en forme (voir PrixProduit, taille « bloc »). */
  prix: ReactNode
  /** Réduction réelle en cours, en %. */
  reduction?: number | undefined
  /** Badges vrais (voir BadgesArticle), déjà triés et limités. */
  badges?: TypeBadge[]
  /** Quantité de ce produit déjà dans le panier (tous formats) : compteur sur le bouton. */
  dansPanier?: number
  /** Geste inverse de l'ajout : retire un article (toucher le compteur). */
  onRetirer?: () => void
  disponibilite: Disponibilite | undefined
  vers?: string
  /** Ouvre l'aperçu (explications, formats) au toucher de la carte. */
  onApercu?: () => void
  onAjouter?: () => void
  /** Plusieurs formats : le bouton rond ouvre le choix au lieu d'ajouter à l'aveugle. */
  choisir?: boolean
  enCours?: boolean
  univers?: Univers
  /** Mousse ou gel : bulles légères au survol. */
  bulles?: boolean
}) {
  const epuise = disponibilite === 'epuise'
  // Retour visuel de l'ajout : le bouton devient une coche, puis revient.
  const [ajoute, setAjoute] = useState(false)
  const minuteur = useRef<number | undefined>(undefined)
  useEffect(
    () => () => {
      window.clearTimeout(minuteur.current)
    },
    [],
  )
  const ajouter = () => {
    onAjouter?.()
    setAjoute(true)
    window.clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => {
      setAjoute(false)
    }, 1600)
  }

  // Lien étiré : toute la carte ouvre l'aperçu (ou la fiche) ; le bouton rond reste à part.
  const etire =
    "after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none"
  const titre = onApercu ? (
    <button
      type="button"
      onClick={onApercu}
      aria-haspopup="dialog"
      className={cx('text-left', etire)}
    >
      {nom}
    </button>
  ) : vers ? (
    <Link to={vers} className={cx('no-underline', etire)}>
      {nom}
    </Link>
  ) : (
    nom
  )

  return (
    <article className="group relative flex h-full flex-col rounded-[24px] bg-carte p-1.5 shadow-panneau transition-[box-shadow,transform] duration-500 ease-(--ease-sortie) focus-within:ring-2 focus-within:ring-or/60 hover:-translate-y-0.5 hover:shadow-flottant active:scale-[0.985] motion-reduce:transform-none">
      <div className="relative">
        <div
          className={cx(
            'relative isolate overflow-hidden rounded-[19px]',
            large
              ? 'aspect-[4/3] sm:aspect-[16/9]'
              : univers === 'perruque'
                ? 'aspect-[4/5]'
                : 'aspect-square',
            pleine ? 'bg-carte-2' : 'socle-produit',
          )}
        >
          {pleine ? (
            <img
              src={pleine}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover transition-transform duration-[1200ms] ease-(--ease-sortie) group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
            />
          ) : detoure ? (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-x-[24%] bottom-[8%] h-[6%] rounded-[50%] bg-encre/15 blur-md"
              />
              <img
                src={detoure}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-contain p-[10%] transition-transform duration-700 ease-(--ease-sortie) group-hover:-translate-y-1.5 group-hover:scale-[1.04] motion-reduce:group-hover:transform-none"
              />
            </>
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
          {bulles && <Bulles />}
          <span
            aria-hidden="true"
            className="reflet-or pointer-events-none absolute inset-0 z-10"
          />
          <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-1">
            {reduction !== undefined && <BadgePromo reduction={reduction} />}
            {badges.map((b, i) => (
              <BadgeArticle key={b} type={b} indice={i + (reduction === undefined ? 0 : 1)} />
            ))}
          </div>
          {epuise && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-fond/55 backdrop-blur-[2px]">
              <span className="rounded-full bg-carte px-3 py-1 text-[12px] font-semibold text-encre-2 shadow-panneau">
                Épuisé
              </span>
            </div>
          )}
        </div>
        {/* Bouton rond : ajout direct, ou choix du format quand il y en a plusieurs. */}
        {onAjouter && !epuise ? (
          <button
            type="button"
            onClick={ajouter}
            data-son="aucun"
            disabled={disponibilite === undefined || enCours}
            aria-label={ajoute ? `${nom} ajouté au panier` : `Ajouter ${nom} au panier`}
            className={cx(
              'absolute right-2 bottom-2 z-20 grid size-11 place-items-center rounded-full shadow-[0_6px_18px_rgb(0_0_0/0.22)] transition-[background-color,transform] duration-300 ease-(--ease-sortie) active:scale-90 disabled:opacity-50 [&_svg]:size-5',
              ajoute ? 'bg-or text-sur-or' : 'bg-encre text-fond hover:scale-105',
            )}
          >
            {ajoute ? (
              <Check className="coche-trace" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
          </button>
        ) : choisir && !epuise && onApercu ? (
          <button
            type="button"
            onClick={onApercu}
            aria-label={`Choisir le format de ${nom}`}
            className="absolute right-2 bottom-2 z-20 grid size-11 place-items-center rounded-full bg-carte text-encre shadow-[0_6px_18px_rgb(0_0_0/0.18)] transition-transform duration-300 active:scale-90 [&_svg]:size-5"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        ) : null}
        {/* Compteur : combien sont déjà dans le panier (rebondit à chaque ajout). */}
        {/* Compteur : combien sont déjà dans le panier. C'est aussi le geste inverse de « + » :
            le toucher retire un article (un « − » apparaît au survol), sans bouton de plus. */}
        {dansPanier > 0 &&
          (onRetirer ? (
            <button
              key={dansPanier}
              type="button"
              data-son="aucun"
              onClick={onRetirer}
              aria-label={`Retirer un ${nom} du panier (${String(dansPanier)} dans le panier)`}
              title="Toucher pour en retirer un"
              className="group/compteur pastille-rebond chiffres absolute right-0.5 bottom-[40px] z-30 grid h-7 min-w-7 place-items-center rounded-full bg-or px-1.5 text-[13px] font-bold text-sur-or shadow-[0_3px_10px_rgb(0_0_0/0.25)] ring-2 ring-carte transition-transform before:absolute before:-inset-2.5 before:content-[''] active:scale-90"
            >
              <span className="group-hover/compteur:hidden group-focus-visible/compteur:hidden">
                {dansPanier}
              </span>
              <span
                aria-hidden="true"
                className="hidden text-[16px] leading-none group-hover/compteur:inline group-focus-visible/compteur:inline"
              >
                −
              </span>
            </button>
          ) : (
            <span
              key={dansPanier}
              aria-label={`${String(dansPanier)} dans le panier`}
              className="pastille-rebond chiffres absolute right-1 bottom-[42px] z-30 grid h-6 min-w-6 place-items-center rounded-full bg-or px-1.5 text-[12px] font-bold text-sur-or shadow-[0_3px_10px_rgb(0_0_0/0.25)] ring-2 ring-carte"
            >
              {dansPanier}
            </span>
          ))}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-2 pt-2.5 pb-1.5">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold text-encre">
            {titre}
          </h3>
          {format && <p className="mt-0.5 truncate text-[12px] text-encre-3">{format}</p>}
        </div>
        <div className="mt-auto">
          {prix ?? <p className="text-[13px] text-encre-3">Prix sur demande</p>}
        </div>
      </div>
    </article>
  )
}
