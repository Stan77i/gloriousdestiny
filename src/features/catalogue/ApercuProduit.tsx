import { useState, type ReactNode } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Link } from 'react-router'
import { BadgeArticle } from '@/components/produit/BadgesArticle'
import { Monogramme } from '@/components/produit/Monogramme'
import { PrixProduit } from '@/components/produit/PrixProduit'
import { choisirBadges } from '@/components/produit/badges'
import { Bouton } from '@/components/ui/Bouton'
import { Modale } from '@/components/ui/Modale'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { usePanier } from '@/features/panier/usePanier'
import { cx } from '@/lib/cx'
import { formaterFcfa } from '@/lib/format/montant'
import type { Disponibilite, Produit } from '@/services/catalogue.service'
import { lienProduit } from './liens'
import { visuelProduit } from './visuels'

const DISPO: Record<Disponibilite, { libelle: string; point: string }> = {
  disponible: { libelle: 'En stock', point: 'bg-succes' },
  bientot_epuise: { libelle: 'Plus que quelques pièces', point: 'bg-alerte' },
  epuise: { libelle: 'Épuisé', point: 'bg-encre-3' },
}

/** Chevron dessiné : tourne quand la section se déplie. */
function Chevron() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 shrink-0 text-or-texte transition-transform duration-300 ease-(--ease-sortie) group-open:rotate-180"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  )
}

/** Section dépliable (élément natif <details> : clavier et lecteurs d'écran inclus). */
function Depliable({
  titre,
  ouvert = false,
  children,
}: {
  titre: string
  ouvert?: boolean
  children: ReactNode
}) {
  return (
    <details className="group border-t border-filet" open={ouvert}>
      <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 py-3 text-[15px] font-semibold text-encre [&::-webkit-details-marker]:hidden">
        {titre}
        <Chevron />
      </summary>
      <div className="depliable-contenu pb-4 text-[15px] leading-relaxed text-encre-2">
        {children}
      </div>
    </details>
  )
}

/**
 * Aperçu d'un produit, comme dans une application : la carte reste courte, les explications
 * s'ouvrent ici, en feuille qui monte du bas (fenêtre centrée sur ordinateur). Choix du format,
 * ajout au panier, et sections dépliables (description, bienfaits, utilisation).
 */
export function ApercuProduit({
  produit: p,
  dispo,
  onFermer,
}: {
  produit: Produit
  dispo: Map<string, Disponibilite> | undefined
  onFermer: () => void
}) {
  const panier = usePanier()
  const { notifier } = useNotifications()
  // Format proposé d'abord : le premier disponible.
  const [choix, setChoix] = useState(
    () => p.variantes.find((v) => dispo?.get(v.id) !== 'epuise')?.id ?? p.variantes[0]?.id,
  )
  const variante = p.variantes.find((v) => v.id === choix) ?? p.variantes[0]
  const statut = variante ? (dispo?.get(variante.id) ?? 'epuise') : 'epuise'
  const visuel = visuelProduit(p.slug)
  const image = visuel.pleine?.petite ?? visuel.detoure ?? null
  const f = p.fiche
  const texte = f.histoire ?? p.description
  const badges = choisirBadges({ ...p.badges, stockLimite: statut === 'bientot_epuise' }, 3)

  return (
    <Modale ouverte forme="feuille" sansEntete onFermer={onFermer} titre={p.nom}>
      <div className="relative grid md:grid-cols-[0.9fr_1.1fr]">
        {/* Poignée (téléphone) et fermeture */}
        <span
          aria-hidden="true"
          className="absolute top-2 left-1/2 z-30 h-1.5 w-10 -translate-x-1/2 rounded-full bg-encre/20 md:hidden"
        />
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer l’aperçu"
          className="absolute top-3 right-3 z-30 grid size-10 place-items-center rounded-full bg-carte/90 text-encre shadow-panneau backdrop-blur-sm [&_svg]:size-5"
        >
          <X aria-hidden="true" />
        </button>

        <div
          className={cx(
            'relative aspect-[4/3] overflow-hidden md:aspect-auto md:min-h-full',
            visuel.pleine ? 'bg-carte-2' : 'socle-produit',
          )}
        >
          {image ? (
            <img
              src={image}
              alt={visuel.pleine?.alt ?? `${p.nom}, Glorious Destiny`}
              className={cx(
                'absolute inset-0 size-full',
                visuel.pleine ? 'object-cover' : 'object-contain p-[9%]',
              )}
            />
          ) : (
            <Monogramme nom={p.nom} />
          )}
          <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-1.5">
            {badges.map((b, i) => (
              <BadgeArticle key={b} type={b} indice={i} />
            ))}
          </div>
        </div>

        <div className="flex flex-col px-5 pt-5 pb-4 md:px-7 md:pt-8">
          <p className="text-[13px] text-encre-3">{p.categorie.nom}</p>
          <h2 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-encre">
            {p.nom}
          </h2>
          {f.accroche && <p className="mt-1.5 text-[16px] text-encre-2">{f.accroche}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PrixProduit
              prix={variante?.prix ?? p.prix}
              promo={variante?.promo ?? null}
              taille="fiche"
            />
          </div>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-encre-3">
            <span aria-hidden="true" className={cx('size-2 rounded-full', DISPO[statut].point)} />
            {variante && variante.libelle !== 'Format standard' ? `${variante.libelle} · ` : ''}
            {DISPO[statut].libelle}
          </p>

          {p.variantes.length > 1 && (
            <fieldset className="mt-4">
              <legend className="mb-2 text-[13px] font-semibold text-encre">Format</legend>
              <div className="flex flex-wrap gap-2">
                {p.variantes.map((v) => {
                  const st = dispo?.get(v.id) ?? 'epuise'
                  const actif = v.id === choix
                  return (
                    <button
                      key={v.id}
                      type="button"
                      aria-pressed={actif}
                      disabled={st === 'epuise'}
                      onClick={() => {
                        setChoix(v.id)
                      }}
                      className={cx(
                        'flex min-h-12 flex-col items-start justify-center rounded-[14px] border px-3.5 py-1.5 text-left transition-colors disabled:opacity-40',
                        actif
                          ? 'border-encre bg-encre text-fond'
                          : 'border-filet bg-carte text-encre hover:border-filet-fort',
                      )}
                    >
                      <span className="text-[14px] font-semibold">{v.libelle}</span>
                      <span
                        className={cx(
                          'chiffres text-[12px]',
                          actif ? 'text-fond/75' : 'text-or-texte',
                        )}
                      >
                        {formaterFcfa(v.prix)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-5">
            {texte && (
              <Depliable titre="Description" ouvert>
                <p>{texte}</p>
              </Depliable>
            )}
            {f.benefices.length > 0 && (
              <Depliable titre="Les bienfaits">
                <ul className="flex flex-col gap-2">
                  {f.benefices.map((b) => (
                    <li key={b} className="flex gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-or"
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </Depliable>
            )}
            {f.utilisation.length > 0 && (
              <Depliable titre="Comment l’utiliser">
                <ol className="flex flex-col gap-2">
                  {f.utilisation.map((e, i) => (
                    <li key={e} className="flex gap-2.5">
                      <span className="chiffres grid size-6 shrink-0 place-items-center rounded-full bg-or-doux text-[12px] font-semibold text-or-texte">
                        {i + 1}
                      </span>
                      {e}
                    </li>
                  ))}
                </ol>
              </Depliable>
            )}
          </div>

          {/* Actions, toujours visibles en bas de la feuille. */}
          <div className="sticky bottom-0 -mx-5 mt-4 flex flex-col gap-2 border-t border-filet bg-carte/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:-mx-7 md:px-7">
            <Bouton
              variante="or"
              taille="grand"
              disabled={!variante || statut === 'epuise'}
              onClick={() => {
                if (!variante) return
                panier.ajouter(variante.id)
                notifier(
                  `${p.nom}${variante.libelle !== 'Format standard' ? ` (${variante.libelle})` : ''} ajouté au panier.`,
                  'succes',
                )
                onFermer()
              }}
              className="w-full"
            >
              {statut === 'epuise'
                ? 'Épuisé'
                : `Ajouter au panier · ${formaterFcfa(variante?.prix ?? p.prix)}`}
            </Bouton>
            <Link
              to={lienProduit(p)}
              onClick={onFermer}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 text-[14px] font-semibold text-encre no-underline hover:text-or-texte [&_svg]:size-4"
            >
              Voir la fiche complète
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </Modale>
  )
}
