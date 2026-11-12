import { useState } from 'react'
import { Banknote, Check, Heart, MapPin, MessageCircle, Minus, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { BadgeArticle } from '@/components/produit/BadgesArticle'
import { choisirBadges } from '@/components/produit/badges'
import { CompteARebours } from '@/components/produit/CompteARebours'
import { BadgePromo } from '@/components/produit/PrixProduit'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { SITE } from '@/config/site'
import { lienProduit } from '@/features/catalogue/liens'
import { useDisponibilites, useProduit, useProduits } from '@/features/catalogue/requetes'
import { visuelProduit } from '@/features/catalogue/visuels'
import { PrevenezMoi } from '@/features/notifications/cliente/PrevenezMoi'
import { QUANTITE_MAX } from '@/features/panier/panier'
import { usePanier } from '@/features/panier/usePanier'
import { jouer, vibrer } from '@/features/sons/sons'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterFcfa } from '@/lib/format/montant'
import { PageIntrouvable } from '@/pages/errors/PageIntrouvable'
import type { Produit } from '@/services/catalogue.service'
import { formatAffiche, teinteUnivers } from './catalogueApp'
import { BarreAction, BoutonRetour, ROND } from './elements'
import { classesCta } from './classes'
import { basculerFavori, useFavoris } from './favoris'
import { PrixApp, VignetteProduit } from './produits'

/** « Souvent pris avec » : « Ajouter » ↔ « ✓ Ajouté » (le même bouton retire). */
function RangeeAssociee({ produit }: { produit: Produit }) {
  const panier = usePanier()
  const v = formatAffiche(produit)
  const dans = v ? panier.lignes.some((l) => l.varianteId === v.id) : false
  return (
    <li className="relative flex items-center gap-3 rounded-[22px] bg-carte p-2 pr-3 shadow-panneau">
      <VignetteProduit produit={produit} className="size-[60px] shrink-0 rounded-[16px]" />
      <div className="min-w-0 flex-1">
        <Link
          to={lienProduit(produit)}
          className="block truncate text-[15px] font-semibold text-encre no-underline"
        >
          {produit.nom}
        </Link>
        <PrixApp produit={produit} variante={v} />
      </div>
      {v && (
        <button
          type="button"
          data-son="aucun"
          onClick={() => {
            if (dans) {
              panier.retirer(v.id)
              jouer('retrait')
            } else panier.ajouter(v.id)
            vibrer(10)
          }}
          aria-label={dans ? `Retirer ${produit.nom} du panier` : `Ajouter ${produit.nom}`}
          className={cx(
            'min-h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors',
            dans
              ? 'bg-encre text-fond'
              : 'bg-carte text-encre shadow-[inset_0_0_0_1px_var(--color-filet-fort)]',
          )}
        >
          {dans ? '✓ Ajouté' : 'Ajouter'}
        </button>
      )}
    </li>
  )
}

/** Fiche produit de l'application. */
export function AppProduit() {
  const { slug = '' } = useParams()
  const produit = useProduit(slug)
  const tous = useProduits()
  const panier = usePanier()
  const favoris = useFavoris()
  const { notifier } = useNotifications()
  const [idVariante, setIdVariante] = useState<string | null>(null)
  const [quantite, setQuantite] = useState(1)
  const [vue, setVue] = useState<'produit' | 'usage'>('produit')
  const [ajoute, setAjoute] = useState<string | null>(null)
  const variantes = produit.data?.variantes ?? []
  const variante =
    variantes.find((v) => v.id === idVariante) ??
    (produit.data ? formatAffiche(produit.data) : undefined)
  const dispo = useDisponibilites(variantes.map((v) => v.id))
  useTitreDocument(produit.data?.nom)

  if (produit.isPending) {
    return (
      <div className="flex flex-col gap-4 pt-16">
        <Squelette className="h-[330px] w-full rounded-[28px]" />
        <Squelette className="h-10 w-3/4" />
        <Squelette className="h-5 w-full" />
      </div>
    )
  }
  if (produit.isError)
    return (
      <div className="pt-16">
        <EtatErreur
          message={versErreurApp(produit.error).message}
          onReessayer={() => void produit.refetch()}
        />
      </div>
    )
  if (!produit.data) return <PageIntrouvable />

  const p = produit.data
  const visuel = visuelProduit(p.slug)
  const statut = variante ? dispo.data?.get(variante.id) : undefined
  const epuise = statut === 'epuise' || !variante
  const favori = favoris.includes(p.id)
  const f = p.fiche
  const autres = tous.data?.filter((x) => x.id !== p.id) ?? []
  const associes = [
    ...f.associes.flatMap((s) => autres.filter((x) => x.slug === s)),
    ...autres.filter((x) => !f.associes.includes(x.slug) && x.categorie.slug === p.categorie.slug),
  ].slice(0, 3)
  const prix = variante?.prix ?? p.prix
  const total = prix * quantite
  const cleAjout = variante ? `${variante.id}-${String(quantite)}` : ''
  const nombre = panier.nombreArticles

  return (
    <div className="pt-1">
      <header className="flex items-center gap-3 pb-3">
        <BoutonRetour />
        <span
          className={cx(
            'ml-auto rounded-full px-3.5 py-2 text-[13px] font-semibold text-encre',
            teinteUnivers(p.categorie.slug),
          )}
        >
          {p.categorie.nom}
        </span>
        <button
          type="button"
          aria-pressed={favori}
          aria-label={favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onClick={() => {
            const ajout = basculerFavori(p.id)
            vibrer(10)
            notifier(ajout ? 'Ajouté à vos favoris.' : 'Retiré de vos favoris.', 'info')
          }}
          className={cx(ROND, favori && 'text-or')}
        >
          <Heart
            key={String(favori)}
            aria-hidden="true"
            strokeWidth={1.7}
            className={favori ? 'pastille-rebond fill-or' : undefined}
          />
        </button>
      </header>

      {/* Visuel et galerie */}
      <div className="relative">
        {vue === 'usage' && visuel.photo ? (
          <div className="relative h-[330px] overflow-hidden rounded-[28px] bg-carte-2">
            <img
              src={visuel.photo.petite}
              alt={visuel.photo.alt}
              className="apparait-fondu absolute inset-0 size-full object-cover"
            />
          </div>
        ) : (
          <VignetteProduit produit={p} grande className="h-[330px] rounded-[28px]" />
        )}
        <span aria-hidden="true" className="reflet-or pointer-events-none absolute inset-0" />
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
          {variante?.promo && <BadgePromo reduction={variante.promo.reduction} />}
          {choisirBadges({ ...p.badges, stockLimite: statut === 'bientot_epuise' }, 2).map(
            (b, i) => (
              <BadgeArticle key={b} type={b} indice={i} />
            ),
          )}
        </div>
      </div>
      {visuel.photo && visuel.detoure && (
        <div role="group" aria-label="Choisir la vue" className="mt-3 flex items-center gap-2.5">
          {(
            [
              ['produit', visuel.detoure, 'Le produit'],
              ['usage', visuel.photo.petite, 'En situation'],
            ] as const
          ).map(([id, src, libelle]) => (
            <button
              key={id}
              type="button"
              aria-pressed={vue === id}
              aria-label={libelle}
              onClick={() => {
                setVue(id)
              }}
              className={cx(
                'size-16 overflow-hidden rounded-[18px] border-2 bg-carte',
                vue === id ? 'border-encre' : 'border-transparent',
              )}
            >
              <img
                src={src}
                alt=""
                className={cx(
                  'size-full',
                  id === 'produit' ? 'object-contain p-1.5' : 'object-cover',
                )}
              />
            </button>
          ))}
          <span className="ml-1 text-[13px] text-encre-3">
            {vue === 'produit' ? 'Le produit' : 'En situation'}
          </span>
        </div>
      )}

      <h1 className="mt-5 text-[34px] leading-[1.05] font-semibold tracking-[-0.035em] text-encre">
        {p.nom}
      </h1>
      {(f.accroche ?? p.description) && (
        <p className="mt-2 text-[15px] leading-relaxed text-encre-2">
          {f.accroche ?? p.description}
        </p>
      )}

      {/* Formats */}
      {variantes.length > 1 && (
        <fieldset className="mt-5">
          <legend className="mb-2 text-[13px] font-semibold text-encre-3">Format</legend>
          <div className="flex flex-wrap gap-2">
            {variantes.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={v.id === variante?.id}
                onClick={() => {
                  setIdVariante(v.id)
                }}
                className={cx(
                  'relative flex min-h-12 flex-col items-center justify-center rounded-full px-4 leading-tight transition-colors',
                  v.id === variante?.id
                    ? 'bg-encre text-fond'
                    : 'bg-carte text-encre shadow-[inset_0_0_0_1px_var(--color-filet-fort)]',
                )}
              >
                <span className="text-[15px] font-semibold">{v.libelle}</span>
                <span className="chiffres text-[11px] opacity-75">
                  {formaterFcfa(v.prix).replace(/\s*FCFA$/, '')}
                </span>
                {v.promo && (
                  <span
                    aria-label="en promotion"
                    className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-or ring-2 ring-fond"
                  />
                )}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Prix et quantité */}
      <section className="mt-4 rounded-[28px] bg-carte p-5 shadow-panneau">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="chiffres flex flex-wrap items-baseline gap-x-2">
              <span className="text-[26px] font-semibold tracking-[-0.02em] text-or-texte">
                {formaterFcfa(total)}
              </span>
              {variante?.promo && (
                <s className="text-[13px] text-encre-3">
                  {formaterFcfa(variante.promo.prixBase * quantite).replace(/\s*FCFA$/, '')}
                </s>
              )}
            </p>
            {variante?.promo && (
              <p className="chiffres text-[13px] font-semibold text-succes">
                Vous économisez {formaterFcfa((variante.promo.prixBase - prix) * quantite)}
              </p>
            )}
          </div>
          <div className="flex h-11 shrink-0 items-center rounded-full shadow-[inset_0_0_0_1px_var(--color-filet-fort)]">
            <button
              type="button"
              aria-label="Une de moins"
              disabled={quantite <= 1}
              onClick={() => {
                setQuantite((q) => Math.max(1, q - 1))
              }}
              className="grid size-11 place-items-center disabled:opacity-35"
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <span className="chiffres w-6 text-center text-[16px] font-semibold" aria-live="polite">
              {quantite}
            </span>
            <button
              type="button"
              aria-label="Une de plus"
              disabled={quantite >= QUANTITE_MAX}
              onClick={() => {
                setQuantite((q) => Math.min(QUANTITE_MAX, q + 1))
              }}
              className="grid size-11 place-items-center disabled:opacity-35"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
        {variante?.promo?.fin && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-filet pt-4">
            <span className="text-[13px] text-encre-3">L’offre se termine dans</span>
            <CompteARebours
              fin={variante.promo.fin}
              titre="L’offre se termine dans"
              compact
              onTermine={() => void produit.refetch()}
            />
          </div>
        )}
      </section>

      {epuise && variante && (
        <div className="mt-4">
          <PrevenezMoi varianteId={variante.id} produit={p.nom} slug={p.slug} />
        </div>
      )}

      {/* Garanties */}
      <ul className="mt-5 flex flex-col gap-3">
        {(
          [
            [Banknote, 'Paiement à la livraison : espèces ou Mobile Money'],
            [MessageCircle, 'Commande enregistrée, puis confirmée sur WhatsApp'],
            [MapPin, `Livraison par agence dans ${String(SITE.paysLivres.length)} pays`],
          ] as const
        ).map(([Icone, texte]) => (
          <li key={texte} className="flex items-center gap-3 text-[14px] text-encre-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-carte shadow-panneau">
              <Icone aria-hidden="true" className="size-4 text-or-texte" strokeWidth={1.7} />
            </span>
            {texte}
          </li>
        ))}
      </ul>

      {/* Comment l'utiliser : étapes de la fiche, reliées par un fil d'or */}
      {f.utilisation.length > 0 && (
        <section className={cx('mt-6 rounded-[28px] p-5', teinteUnivers(p.categorie.slug))}>
          <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-encre">
            Comment l’utiliser
          </h2>
          <ol className="relative mt-4 flex flex-col gap-4">
            <span
              aria-hidden="true"
              className="fil-etapes absolute top-4 bottom-4 left-[17px] w-px bg-or"
            />
            {f.utilisation.map((etape, i) => (
              <li key={etape} className="relative flex items-start gap-3">
                <span className="chiffres grid size-9 shrink-0 place-items-center rounded-full bg-carte text-[14px] font-bold text-encre shadow-panneau">
                  {i + 1}
                </span>
                <p className="pt-1.5 text-[15px] leading-snug text-encre">{etape}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {associes.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-encre">
            Souvent pris avec
          </h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {associes.map((x) => (
              <RangeeAssociee key={x.id} produit={x} />
            ))}
          </ul>
        </section>
      )}

      <BarreAction>
        {ajoute === cleAjout && nombre > 0 ? (
          <Link to={CHEMINS.panier} className={classesCta('encre')}>
            <Check aria-hidden="true" className="size-5" />
            Voir le panier · {nombre} article{nombre > 1 ? 's' : ''}
          </Link>
        ) : (
          <button
            type="button"
            disabled={epuise || statut === undefined}
            className={classesCta('or')}
            onClick={() => {
              if (!variante) return
              panier.ajouter(variante.id, quantite)
              setAjoute(cleAjout)
              notifier(`${p.nom} ajouté au panier (${String(quantite)}).`, 'succes')
            }}
          >
            {epuise ? 'Épuisé' : `Ajouter au panier · ${formaterFcfa(total)}`}
          </button>
        )}
      </BarreAction>
    </div>
  )
}
