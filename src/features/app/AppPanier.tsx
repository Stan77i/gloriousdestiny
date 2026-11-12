import { Minus, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { lienProduit } from '@/features/catalogue/liens'
import { useDisponibilites, useProduits } from '@/features/catalogue/requetes'
import { QUANTITE_MAX } from '@/features/panier/panier'
import { usePanier } from '@/features/panier/usePanier'
import { jouer, vibrer } from '@/features/sons/sons'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterFcfa } from '@/lib/format/montant'
import { TitreEcran } from './elements'
import { classesCta } from './classes'
import { VignetteProduit } from './produits'

function Sac() {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className="size-28 text-or-texte"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path className="trace-fil" pathLength={1} d="M28 44h64l-6 58H34Z" />
      <path className="trace-fil" pathLength={1} d="M44 50V36a16 16 0 0 1 32 0v14" />
      <path className="trace-fil" pathLength={1} d="M40 70c10 6 30 6 40 0" opacity={0.6} />
    </svg>
  )
}

/** Panier de l'application : prix relus depuis la base, quantité verticale, total à la livraison. */
export function AppPanier() {
  useTitreDocument('Panier')
  const panier = usePanier()
  const produits = useProduits()
  const dispo = useDisponibilites(panier.lignes.map((l) => l.varianteId))

  if (panier.lignes.length === 0) {
    return (
      <div className="flex flex-col items-center pt-24 text-center">
        <Sac />
        <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.03em] text-encre">
          Votre panier est vide
        </h1>
        <p className="mt-2 max-w-xs text-[15px] text-encre-3">
          Vos articles restent ici, même si vous fermez l’application.
        </p>
        <Link to={CHEMINS.catalogue} className={`${classesCta('encre')} mt-6 w-auto px-8`}>
          Voir la boutique
        </Link>
      </div>
    )
  }

  const index = new Map(
    (produits.data ?? []).flatMap((p) =>
      p.variantes.map((v) => [v.id, { produit: p, variante: v }] as const),
    ),
  )
  const lignes = panier.lignes.map((l) => ({ ...l, ref: index.get(l.varianteId) }))
  const total = lignes.reduce((s, l) => s + (l.ref ? l.ref.variante.prix * l.quantite : 0), 0)
  const plein = lignes.reduce(
    (s, l) =>
      s + (l.ref ? (l.ref.variante.promo?.prixBase ?? l.ref.variante.prix) * l.quantite : 0),
    0,
  )
  const economie = plein - total
  const bloque = lignes.some((l) => !l.ref || dispo.data?.get(l.varianteId) === 'epuise')

  return (
    <div>
      <TitreEcran
        detail={`${String(panier.nombreArticles)} article${panier.nombreArticles > 1 ? 's' : ''}`}
      >
        Panier
      </TitreEcran>
      {produits.isError ? (
        <EtatErreur
          message={versErreurApp(produits.error).message}
          onReessayer={() => void produits.refetch()}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {lignes.map((l) => {
              if (!l.ref)
                return (
                  <li key={l.varianteId} className="rounded-[28px] bg-carte p-3">
                    {produits.isPending ? (
                      <Squelette className="h-[78px] w-full rounded-[22px]" />
                    ) : (
                      <div className="flex items-center justify-between gap-3 px-2">
                        <p className="text-[14px] text-encre-3">Cet article n’est plus proposé.</p>
                        <button
                          type="button"
                          className="min-h-10 rounded-full px-4 text-[14px] font-semibold text-danger"
                          onClick={() => {
                            panier.retirer(l.varianteId)
                          }}
                        >
                          Retirer
                        </button>
                      </div>
                    )}
                  </li>
                )
              const { produit, variante } = l.ref
              const epuise = dispo.data?.get(l.varianteId) === 'epuise'
              return (
                <li
                  key={l.varianteId}
                  className="flex items-center gap-3 rounded-[28px] bg-carte p-2 pr-2.5 shadow-panneau"
                >
                  <Link to={lienProduit(produit)} aria-label={produit.nom} className="shrink-0">
                    <VignetteProduit produit={produit} className="size-[78px] rounded-[22px]" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold text-encre">{produit.nom}</p>
                    {variante.libelle !== 'Format standard' && (
                      <p className="text-[13px] text-encre-3">{variante.libelle}</p>
                    )}
                    <p className="chiffres mt-0.5 text-[15px] font-semibold text-or-texte">
                      {formaterFcfa(variante.prix * l.quantite)}
                    </p>
                    {epuise && (
                      <p className="text-[12px] font-semibold text-danger">Épuisé entre-temps</p>
                    )}
                  </div>
                  {/* Quantité verticale : « − » à 1 retire l'article. */}
                  <div className="flex w-11 shrink-0 flex-col items-center rounded-full shadow-[inset_0_0_0_1px_var(--color-filet-fort)]">
                    <button
                      type="button"
                      aria-label={`Un ${produit.nom} de plus`}
                      disabled={l.quantite >= QUANTITE_MAX}
                      onClick={() => {
                        panier.modifier(l.varianteId, l.quantite + 1)
                      }}
                      className="grid size-11 place-items-center disabled:opacity-35"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                    </button>
                    <span className="chiffres text-[15px] font-semibold" aria-live="polite">
                      {l.quantite}
                    </span>
                    <button
                      type="button"
                      data-son="aucun"
                      aria-label={
                        l.quantite > 1 ? `Un ${produit.nom} de moins` : `Retirer ${produit.nom}`
                      }
                      onClick={() => {
                        if (l.quantite > 1) panier.modifier(l.varianteId, l.quantite - 1)
                        else panier.retirer(l.varianteId)
                        jouer('retrait')
                        vibrer(10)
                      }}
                      className="grid size-11 place-items-center"
                    >
                      <Minus aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <section className="mt-3 rounded-[28px] bg-carte p-5 shadow-panneau">
            <dl className="chiffres flex flex-col gap-2 text-[15px]">
              <div className="flex justify-between gap-3">
                <dt className="text-encre-2">Sous-total</dt>
                <dd className="text-encre">{formaterFcfa(plein)}</dd>
              </div>
              {economie > 0 && (
                <div className="flex justify-between gap-3 font-semibold text-succes">
                  <dt>Économies</dt>
                  <dd>− {formaterFcfa(economie)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-encre-2">Livraison</dt>
                <dd className="text-encre-2">Réglée à l’agence</dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-filet pt-4">
                <dt className="font-semibold text-encre">Total à la livraison</dt>
                <dd className="text-[26px] font-semibold tracking-[-0.02em] text-or-texte">
                  {formaterFcfa(total)}
                </dd>
              </div>
            </dl>
            {bloque ? (
              <p className="mt-4 text-[14px] text-danger">
                Retirez les articles épuisés pour commander.
              </p>
            ) : (
              <Link to={CHEMINS.commande} className={`${classesCta('or')} mt-4 min-h-[52px]`}>
                Commander
              </Link>
            )}
            <p className="mt-3 text-center text-[13px] text-encre-3">
              Aucun paiement en ligne · vous réglez à la livraison
            </p>
          </section>
        </>
      )}
    </div>
  )
}
