import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { BadgeArticle } from '@/components/produit/BadgesArticle'
import { choisirBadges } from '@/components/produit/badges'
import { Monogramme } from '@/components/produit/Monogramme'
import { BadgePromo } from '@/components/produit/PrixProduit'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { lienProduit } from '@/features/catalogue/liens'
import { visuelProduit } from '@/features/catalogue/visuels'
import { usePanier } from '@/features/panier/usePanier'
import { jouer, vibrer } from '@/features/sons/sons'
import { cx } from '@/lib/cx'
import { formaterFcfa } from '@/lib/format/montant'
import type { Disponibilite, Produit, Variante } from '@/services/catalogue.service'
import { formatAffiche, reductionMax } from './catalogueApp'

/**
 * Visuel d'un produit sur son socle : détouré (contain, ombre portée), photo de la cliente
 * (cover), ou monogramme. `ombre` : ombre douce sous le détouré.
 */
export function VignetteProduit({
  produit,
  className,
  grande = false,
}: {
  produit: Pick<Produit, 'slug' | 'nom'>
  className?: string
  grande?: boolean
}) {
  const v = visuelProduit(produit.slug)
  return (
    <div
      className={cx(
        'relative isolate overflow-hidden',
        v.pleine ? 'bg-carte-2' : 'socle-produit',
        className,
      )}
    >
      {v.pleine ? (
        <img
          src={grande ? v.pleine.grande : v.pleine.petite}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      ) : v.detoure ? (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-x-[26%] bottom-[9%] h-[6%] rounded-[50%] bg-encre/15 blur-md"
          />
          <img
            src={v.detoure}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-contain p-3"
          />
        </>
      ) : (
        <span className="absolute inset-0 bg-lilas">
          <Monogramme nom={produit.nom} />
        </span>
      )}
    </div>
  )
}

/** Prix : « Dès » si plusieurs formats sans promotion ; ancien prix barré si promotion réelle. */
export function PrixApp({
  produit,
  variante,
  taille = 'carte',
}: {
  produit: Produit
  variante: Variante | undefined
  taille?: 'carte' | 'grand'
}) {
  const prix = variante?.prix ?? produit.prix
  const des = produit.variantes.length > 1 && !variante?.promo
  return (
    <p className="chiffres flex flex-wrap items-baseline gap-x-1.5 leading-tight">
      <span
        className={cx(
          'font-semibold text-or-texte',
          taille === 'grand' ? 'text-[21px]' : 'text-[15px]',
        )}
      >
        {des && 'Dès '}
        {formaterFcfa(prix)}
      </span>
      {variante?.promo && (
        <s className={cx('text-encre-3', taille === 'grand' ? 'text-[13px]' : 'text-[12px]')}>
          <span className="sr-only">au lieu de </span>
          {formaterFcfa(variante.promo.prixBase).replace(/\s*FCFA$/, '')}
        </s>
      )}
    </p>
  )
}

/**
 * Carte produit de l'application. Le rond « + » ajoute le format affiché ; une fois au panier,
 * il devient la pilule d'encre « × n » et chaque toucher retire une unité (même place, geste
 * inverse). Toucher la carte ouvre la fiche.
 */
export function CarteApp({
  produit,
  statut,
}: {
  produit: Produit
  statut: Disponibilite | undefined
}) {
  const panier = usePanier()
  const { notifier } = useNotifications()
  const variante = formatAffiche(produit)
  const reduction = reductionMax(produit)
  const epuise = statut === 'epuise'
  const ligne = variante ? panier.lignes.find((l) => l.varianteId === variante.id) : undefined
  const n = ligne?.quantite ?? 0
  const badges = choisirBadges(
    { ...produit.badges, stockLimite: statut === 'bientot_epuise' },
    reduction === undefined ? 1 : 0,
  )
  const sousLigne =
    produit.variantes.length > 1
      ? `${String(produit.variantes.length)} formats`
      : (variante?.libelle ?? '')

  return (
    <article className="relative flex h-full flex-col rounded-[28px] bg-carte p-2 shadow-panneau transition-transform duration-200 active:scale-[0.985]">
      <div className="relative">
        <VignetteProduit produit={produit} className="h-[150px] rounded-[22px]" />
        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
          {reduction !== undefined && <BadgePromo reduction={reduction} />}
          {badges.map((b, i) => (
            <BadgeArticle key={b} type={b} indice={i} />
          ))}
        </div>
        {epuise && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-[22px] bg-fond/55 backdrop-blur-[2px]">
            <span className="rounded-full bg-carte px-3 py-1 text-[12px] font-semibold text-encre-2 shadow-panneau">
              Épuisé
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1.5 pt-2.5 pb-1">
        <h3 className="line-clamp-2 text-[14px] leading-snug font-semibold text-encre">
          <Link
            to={lienProduit(produit)}
            className="no-underline after:absolute after:inset-0 after:content-['']"
          >
            {produit.nom}
          </Link>
        </h3>
        {sousLigne && <p className="truncate text-[12px] text-encre-3">{sousLigne}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <PrixApp produit={produit} variante={variante} />
          {variante && !epuise && statut !== undefined && (
            <button
              key={n > 0 ? 'retirer' : 'ajouter'}
              type="button"
              data-son="aucun"
              onClick={() => {
                if (n > 0) {
                  if (n > 1) panier.modifier(variante.id, n - 1)
                  else panier.retirer(variante.id)
                  jouer('retrait')
                  vibrer(10)
                } else {
                  panier.ajouter(variante.id)
                  notifier(`${produit.nom} ajouté au panier.`, 'succes')
                }
              }}
              aria-label={
                n > 0
                  ? `Retirer un ${produit.nom} (${String(n)} au panier)`
                  : `Ajouter ${produit.nom} au panier`
              }
              className={cx(
                'pastille-rebond relative z-10 grid h-11 shrink-0 place-items-center rounded-full transition-transform duration-200 active:scale-90',
                n > 0
                  ? 'chiffres min-w-11 bg-encre px-3 text-[14px] font-bold text-fond'
                  : 'w-11 text-encre shadow-[inset_0_0_0_1px_var(--color-filet-fort)]',
              )}
            >
              {n > 0 ? `× ${String(n)}` : <Plus aria-hidden="true" className="size-5" />}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
