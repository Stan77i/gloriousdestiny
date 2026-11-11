import { cx } from '@/lib/cx'
import { useHorloge } from '@/hooks/useHorloge'
import { formaterDate } from '@/lib/format/date'
import { echeance } from '@/lib/format/echeance'
import { formaterFcfa } from '@/lib/format/montant'

export type PromoAffichee = {
  prixBase: number
  reduction: number
  fin: string | null
  libelle?: string | null
}

/**
 * Pastille de réduction : lingot d'or, chiffre en encre. Le pourcentage vient du serveur,
 * calculé sur le prix réel du catalogue.
 */
export function BadgePromo({
  reduction,
  taille = 'normal',
  className,
}: {
  reduction: number
  taille?: 'normal' | 'grand'
  className?: string
}) {
  return (
    <span
      className={cx(
        'badge-promo degrade-or chiffres relative inline-flex items-center gap-1 overflow-hidden rounded-full font-semibold tracking-[0.02em] text-sur-or shadow-or',
        taille === 'grand' ? 'px-3.5 py-1.5 text-[13px] uppercase' : 'px-2.5 py-1 text-[12px]',
        className,
      )}
    >
      {taille === 'grand' ? `${String(reduction)} % de réduction` : `−${String(reduction)} %`}
    </span>
  )
}

/**
 * Prix d'un produit. Sans promotion : le prix seul. Avec une promotion réelle : nouveau prix
 * en avant, ancien prix barré, économie réalisée et date de fin. `des` : « Dès » (plusieurs
 * formats). Aucune promotion n'est jamais simulée : sans `promo`, rien n'est barré.
 */
export function PrixProduit({
  prix,
  promo,
  des = false,
  taille = 'carte',
  className,
}: {
  prix: number
  promo: PromoAffichee | null
  des?: boolean
  taille?: 'carte' | 'fiche'
  className?: string
}) {
  const fiche = taille === 'fiche'
  if (!promo) {
    return (
      <p
        className={cx(
          'chiffres font-semibold text-or-texte',
          fiche ? 'text-[28px] leading-none' : 'text-[16px]',
          className,
        )}
      >
        {des && <span className="mr-1 text-[0.72em] font-medium text-encre-3">Dès</span>}
        {formaterFcfa(prix)}
      </p>
    )
  }
  const economie = promo.prixBase - prix
  return (
    <PrixPromo
      prix={prix}
      promo={promo}
      des={des}
      fiche={fiche}
      economie={economie}
      className={className}
    />
  )
}

function PrixPromo({
  prix,
  promo,
  des,
  fiche,
  economie,
  className,
}: {
  prix: number
  promo: PromoAffichee
  des: boolean
  fiche: boolean
  economie: number
  className?: string | undefined
}) {
  const maintenant = useHorloge()
  const quand = echeance(promo.fin, maintenant)
  return (
    <div className={cx('flex flex-col', fiche ? 'gap-2' : 'gap-0.5', className)}>
      {fiche && (
        <span className="flex flex-wrap items-center gap-2">
          <BadgePromo reduction={promo.reduction} taille="grand" />
          {promo.libelle && (
            <span className="rounded-full bg-encre px-3 py-1.5 text-[12px] font-semibold tracking-[0.08em] text-or uppercase">
              {promo.libelle}
            </span>
          )}
        </span>
      )}
      <p className="chiffres flex flex-wrap items-baseline gap-x-2">
        <span className="sr-only">
          Prix promotionnel {formaterFcfa(prix)} au lieu de {formaterFcfa(promo.prixBase)}
        </span>
        <span
          aria-hidden="true"
          className={cx(
            'font-semibold text-encre',
            fiche ? 'text-[34px] leading-none' : 'text-[17px]',
          )}
        >
          {des && <span className="mr-1 text-[0.6em] font-medium text-encre-3">Dès</span>}
          {formaterFcfa(prix)}
        </span>
        <span
          aria-hidden="true"
          className={cx(
            'text-encre-3 line-through decoration-or decoration-[1.5px]',
            fiche ? 'text-[18px]' : 'text-[13px]',
          )}
        >
          {formaterFcfa(promo.prixBase)}
        </span>
      </p>
      <p className={cx('font-medium text-or-texte', fiche ? 'text-[15px]' : 'text-[12px]')}>
        Vous économisez {formaterFcfa(economie)}
        {promo.fin && fiche && (
          <span className="font-normal text-encre-3">
            {' '}
            · offre jusqu’au {formaterDate(promo.fin)}
          </span>
        )}
      </p>
      {!fiche && (promo.libelle ?? quand) && (
        <p className="text-[12px] text-encre-3">
          {promo.libelle
            ? [promo.libelle, quand].filter(Boolean).join(' · ')
            : `Offre ${quand ?? ''}`}
        </p>
      )}
    </div>
  )
}
