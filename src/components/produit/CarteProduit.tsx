import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, Check, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Bouton } from '@/components/ui/Bouton'
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

const DISPO: Record<Disponibilite, { libelle: string; point: string }> = {
  disponible: { libelle: 'En stock', point: 'bg-succes' },
  bientot_epuise: { libelle: 'Plus que quelques pièces', point: 'bg-alerte' },
  epuise: { libelle: 'Épuisé', point: 'bg-encre-3' },
}

/**
 * Carte produit. Trois mises en scène :
 * - soin : le flacon détouré sur son socle teinté, reflet d'or au survol, photo d'usage ;
 * - cils : la photo du produit en plein cadre, gros plan au survol ;
 * - perruque : portrait vertical, plus grand.
 * Toute la carte mène à la fiche (lien étiré) ; le bouton d'achat reste indépendant.
 */
export function CarteProduit({
  nom,
  format,
  categorie,
  accroche = null,
  detoure,
  pleine,
  large = false,
  photo,
  prix,
  reduction,
  badges = [],
  disponibilite,
  vers,
  onAjouter,
  choisir = false,
  enCours = false,
  univers = 'soin',
  bulles = false,
}: {
  nom: string
  format: string | null
  categorie: string
  /** Phrase courte de la fiche (accroche), si elle existe. */
  accroche?: string | null
  detoure: string | null
  /** Photo de la cliente telle quelle (sans détourage), en plein cadre. */
  pleine?: string | undefined
  /** Carte vedette sur toute la largeur de la grille (La gamme). */
  large?: boolean
  photo?: string | undefined
  /** Prix déjà mis en forme (voir PrixProduit). */
  prix: ReactNode
  /** Réduction réelle en cours, en %. */
  reduction?: number | undefined
  /** Badges vrais (voir BadgesArticle), déjà triés et limités. */
  badges?: TypeBadge[]
  disponibilite: Disponibilite | undefined
  vers?: string
  onAjouter?: () => void
  /** Plusieurs formats : on invite à choisir sur la fiche plutôt qu'à ajouter à l'aveugle. */
  choisir?: boolean
  enCours?: boolean
  univers?: Univers
  /** Mousse ou gel : bulles légères au survol. */
  bulles?: boolean
}) {
  const epuise = disponibilite === 'epuise'
  const dispo = disponibilite ? DISPO[disponibilite] : null
  // Retour visuel de l'ajout : le bouton devient « Ajouté » avec une coche, puis revient.
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
  return (
    <article className="group relative flex h-full flex-col rounded-panneau bg-carte p-2 shadow-panneau transition-[box-shadow,transform] duration-500 ease-(--ease-sortie) focus-within:shadow-flottant hover:-translate-y-1 hover:shadow-flottant motion-reduce:hover:translate-y-0">
      <div
        className={cx(
          'relative isolate overflow-hidden rounded-[22px]',
          large
            ? 'aspect-[4/3] sm:aspect-[16/9]'
            : univers === 'perruque'
              ? 'aspect-[3/4]'
              : 'aspect-[4/5]',
          pleine ? 'bg-carte-2' : 'socle-produit',
        )}
      >
        {pleine ? (
          <img
            src={pleine}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover transition-transform duration-[1200ms] ease-(--ease-sortie) group-hover:scale-[1.06] motion-reduce:group-hover:scale-100"
          />
        ) : detoure ? (
          <>
            {/* Socle : ombre portée douce sous le flacon. */}
            <span
              aria-hidden="true"
              className="absolute inset-x-[22%] bottom-[9%] h-[6%] rounded-[50%] bg-encre/15 blur-md transition-transform duration-700 group-hover:scale-x-90"
            />
            <img
              src={detoure}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-contain p-[9%] transition-transform duration-700 ease-(--ease-sortie) group-hover:-translate-y-2 group-hover:scale-[1.04] motion-reduce:group-hover:transform-none"
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
        {/* Reflet d'or qui traverse le visuel au survol. */}
        <span aria-hidden="true" className="reflet-or pointer-events-none absolute inset-0 z-10" />
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5">
          {reduction !== undefined && <BadgePromo reduction={reduction} />}
          {badges.map((b, i) => (
            <BadgeArticle key={b} type={b} indice={i + (reduction === undefined ? 0 : 1)} />
          ))}
        </div>
        {epuise && (
          <div className="absolute inset-x-3 bottom-3 z-20 rounded-full bg-carte/90 py-1.5 text-center text-[12px] font-semibold text-encre-2 backdrop-blur-sm">
            Épuisé · prévenez-moi sur la fiche
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 pt-4 pb-3">
        <p className="text-[12px] tracking-[0.02em] text-encre-3">
          {format ? `${categorie} · ${format}` : categorie}
        </p>
        <h3 className="mt-1 text-[17px] leading-snug font-semibold text-encre">
          {vers ? (
            <Link
              to={vers}
              className="no-underline after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none"
            >
              {nom}
            </Link>
          ) : (
            nom
          )}
        </h3>
        {accroche && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-encre-2">{accroche}</p>
        )}
        {dispo && !epuise && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-encre-3">
            <span aria-hidden="true" className={cx('size-1.5 rounded-full', dispo.point)} />
            {dispo.libelle}
          </p>
        )}
        {/* Sur mobile (2 colonnes étroites) : prix au-dessus, bouton pleine largeur. */}
        <div className="mt-auto flex flex-col items-stretch gap-2.5 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="min-w-0">
            {prix ?? <p className="text-[15px] text-encre-3">Prix sur demande</p>}
          </div>
          {onAjouter ? (
            // `relative z-20` : reste cliquable au-dessus du lien étiré.
            <Bouton
              taille="petit"
              variante={epuise ? 'secondaire' : 'principal'}
              disabled={epuise || disponibilite === undefined}
              enCours={enCours}
              onClick={ajouter}
              icone={ajoute ? <Check className="coche-trace" /> : <Plus />}
              aria-label={ajoute ? `${nom} ajouté au panier` : `Ajouter ${nom} au panier`}
              className={cx('relative z-20', ajoute && 'bg-or text-sur-or hover:bg-or')}
            >
              {epuise ? 'Épuisé' : ajoute ? 'Ajouté' : 'Ajouter'}
            </Bouton>
          ) : choisir ? (
            <span
              aria-hidden="true"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-carte-2 px-3.5 text-[13px] font-semibold text-encre transition-colors group-hover:bg-encre group-hover:text-fond [&_svg]:size-[1.1em]"
            >
              Choisir
              <ArrowUpRight />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
