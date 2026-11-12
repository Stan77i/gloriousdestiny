import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Truck } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Signature } from '@/components/marque/Signature'
import { VeineOr } from '@/components/marque/VeineOr'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { CompteARebours } from '@/components/produit/CompteARebours'
import { BadgePromo } from '@/components/produit/PrixProduit'
import { SITE } from '@/config/site'
import { MotTournant } from '@/features/accueil/MotTournant'
import { usePrestations } from '@/features/catalogue/prestations'
import { lienProduit } from '@/features/catalogue/liens'
import { useDisponibilites, useProduits } from '@/features/catalogue/requetes'
import { SLUG_LA_GAMME, visuelProduit } from '@/features/catalogue/visuels'
import { usePanier } from '@/features/panier/usePanier'
import { useMouvementReduit } from '@/hooks/useMouvementReduit'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'
import { formaterFcfa } from '@/lib/format/montant'
import type { Produit } from '@/services/catalogue.service'
import { statutProduit } from './catalogueApp'
import { BoutonTheme } from './elements'
import { PrixApp, VignetteProduit } from './produits'

const DUREE = 5000

type Diapo = { produit: Produit; image: string; legende: string }

/**
 * Carrousel de l'accueil : rideau qui s'ouvre, zoom lent, barres de progression. Toucher la
 * légende ouvre le produit. Pause tant qu'on le touche ou qu'il est hors écran ; mouvement
 * réduit : pas de défilement automatique.
 */
function Carrousel({ diapos }: { diapos: Diapo[] }) {
  const reduit = useMouvementReduit()
  const [rang, setRang] = useState(0)
  const [pause, setPause] = useState(false)
  const [visible, setVisible] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e) setVisible(e.isIntersecting)
    })
    obs.observe(el)
    return () => {
      obs.disconnect()
    }
  }, [])

  const tourne = !reduit && !pause && visible && diapos.length > 1
  useEffect(() => {
    if (!tourne) return
    const t = window.setTimeout(() => {
      setRang((r) => (r + 1) % diapos.length)
    }, DUREE)
    return () => {
      window.clearTimeout(t)
    }
  }, [tourne, rang, diapos.length])

  const d = diapos[rang % diapos.length]
  if (!d) return null
  return (
    <section
      ref={ref}
      aria-roledescription="carrousel"
      aria-label="À la une"
      className="relative mt-5 h-[400px] overflow-hidden rounded-[28px] bg-carte-2"
      onPointerDown={() => {
        setPause(true)
      }}
      onPointerUp={() => {
        setPause(false)
      }}
      onPointerCancel={() => {
        setPause(false)
      }}
    >
      {diapos.map((x, i) => (
        <div
          key={x.produit.id}
          aria-hidden={i !== rang}
          className={cx('absolute inset-0', i === rang ? 'diapo-rideau z-10' : 'z-0 opacity-0')}
        >
          <img
            src={x.image}
            alt=""
            className={cx('size-full object-cover', i === rang && 'diapo-zoom')}
          />
        </div>
      ))}
      {/* Barres de progression : toucher une barre montre sa diapositive. */}
      <div className="absolute inset-x-4 top-4 z-20 flex gap-1.5">
        {diapos.map((x, i) => (
          <button
            key={x.produit.id}
            type="button"
            aria-label={`Diapositive ${String(i + 1)} : ${x.produit.nom}`}
            aria-current={i === rang}
            onClick={() => {
              setRang(i)
            }}
            className="relative h-5 flex-1"
          >
            <span className="absolute inset-x-0 top-2 h-[3px] overflow-hidden rounded-full bg-white/45">
              <span
                key={`${String(rang)}-${String(tourne)}`}
                className={cx(
                  'absolute inset-0 origin-left rounded-full bg-white',
                  i < rang && 'scale-x-100',
                  i > rang && 'scale-x-0',
                  i === rang && (tourne ? 'barre-progression' : 'scale-x-100'),
                )}
              />
            </span>
          </button>
        ))}
      </div>
      <Link
        to={lienProduit(d.produit)}
        className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-3 rounded-full bg-carte py-2 pr-2 pl-5 no-underline shadow-flottant"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-encre">
            {d.produit.nom}
          </span>
          <span className="block truncate text-[13px] text-encre-3">{d.legende}</span>
        </span>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-encre text-fond">
          <ArrowRight aria-hidden="true" className="size-5" />
        </span>
      </Link>
    </section>
  )
}

function Tuile({
  vers,
  teinte,
  titre,
  detail,
  dessin,
}: {
  vers: string
  teinte: string
  titre: string
  detail: string
  dessin: ReactNode
}) {
  return (
    <Link
      to={vers}
      className={cx(
        'relative flex h-32 flex-col justify-end overflow-hidden rounded-[28px] p-4 no-underline transition-transform active:scale-[0.97]',
        teinte,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="absolute top-3 right-3 size-12 text-or-texte"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dessin}
      </svg>
      <span className="text-[17px] font-semibold tracking-[-0.01em] text-encre">{titre}</span>
      <span className="text-[13px] text-encre-2">{detail}</span>
    </Link>
  )
}

/** Offre du moment : seulement si une promotion réelle est en cours. */
function OffreDuMoment({ produits }: { produits: Produit[] }) {
  const panier = usePanier()
  const { notifier } = useNotifications()
  const offre = produits
    .flatMap((p) => p.variantes.filter((v) => v.promo).map((v) => ({ p, v })))
    .sort((a, b) => (b.v.promo?.reduction ?? 0) - (a.v.promo?.reduction ?? 0))[0]
  if (!offre?.v.promo) return null
  const { p, v } = offre
  const promo = v.promo
  if (!promo) return null
  return (
    <section className="mt-5 flex gap-3 rounded-[28px] bg-carte p-2 shadow-panneau">
      <Link to={lienProduit(p)} className="relative shrink-0" aria-label={p.nom}>
        <VignetteProduit produit={p} className="h-[168px] w-[140px] rounded-[22px]" />
        <span aria-hidden="true" className="reflet-or pointer-events-none absolute inset-0" />
        <BadgePromo reduction={promo.reduction} className="absolute top-2 left-2" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col py-2 pr-2">
        <p className="text-[13px] text-encre-3">Offre du moment</p>
        <p className="truncate text-[17px] font-semibold text-encre">
          {p.nom}
          {p.variantes.length > 1 ? ` · ${v.libelle}` : ''}
        </p>
        <p className="chiffres mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[21px] font-semibold text-or-texte">{formaterFcfa(v.prix)}</span>
          <s className="text-[13px] text-encre-3">
            {formaterFcfa(promo.prixBase).replace(/\s*FCFA$/, '')}
          </s>
        </p>
        {promo.fin && (
          <CompteARebours fin={promo.fin} titre="Fin de l’offre dans" compact className="mt-1.5" />
        )}
        <button
          type="button"
          onClick={() => {
            panier.ajouter(v.id)
            notifier(`${p.nom} ajouté au panier.`, 'succes')
          }}
          className="degrade-or mt-auto min-h-10 rounded-full px-4 text-[14px] font-semibold text-sur-or shadow-or active:scale-[0.98]"
        >
          Ajouter au panier
        </button>
      </div>
    </section>
  )
}

/** Accueil « Comptoir » de l'application. */
export function AppAccueil() {
  useTitreDocument()
  const produits = useProduits()
  const prestations = usePrestations()
  const liste = produits.data ?? []
  const perruques = liste.filter((p) => p.type === 'perruque')
  const dispo = useDisponibilites(perruques.flatMap((p) => p.variantes.map((v) => v.id)))
  // Aucune perruque disponible (ou aucune en catalogue) : on propose d'être prévenue.
  const perruquesEpuisees =
    produits.data !== undefined &&
    (perruques.length === 0 ||
      (dispo.data !== undefined &&
        perruques.every((p) => statutProduit(p, dispo.data) === 'epuise')))
  const cils = liste.filter((p) => p.categorie.slug === 'cils').length
  const essentiels = liste.filter((p) => p.type === 'produit' && p.slug !== SLUG_LA_GAMME)

  const diapo = (slug: string, legende: string): Diapo[] => {
    const p = liste.find((x) => x.slug === slug)
    const v = visuelProduit(slug)
    const image = v.photo?.petite ?? v.pleine?.petite
    return p && image ? [{ produit: p, image, legende }] : []
  }
  const diapos = [
    ...diapo('lace-glue', 'Colle pour perruque lace'),
    ...diapo(SLUG_LA_GAMME, 'Coffret'),
    ...diapo('cluster-lashes-box', 'Cils en grappes'),
  ]

  return (
    <div className="pt-1">
      <header className="flex items-center justify-between gap-3">
        <Signature vivante />
        <BoutonTheme />
      </header>
      <h1 className="mt-5 text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] text-encre">
        Votre pose,
        <br />
        <MotTournant mots={['sublimée.', 'révélée.', 'signée.']} className="text-or-texte" />
      </h1>
      <VeineOr vivante className="mt-2 h-6 w-full" />

      {diapos.length > 0 ? (
        <Carrousel diapos={diapos} />
      ) : (
        produits.isPending && <div className="mt-5 h-[400px] rounded-[28px] bg-carte-2" />
      )}

      <nav aria-label="Univers" className="mt-3 grid grid-cols-2 gap-2.5">
        <Tuile
          vers={CHEMINS.perruques}
          teinte="bg-rose"
          titre="Perruques"
          detail={
            perruquesEpuisees
              ? 'Être prévenue du retour'
              : `${String(perruques.length)} modèle${perruques.length > 1 ? 's' : ''}`
          }
          dessin={
            <path
              className="trace-fil"
              pathLength={1}
              d="M12 44V22a12 12 0 0 1 24 0v22M18 44V24a6 6 0 0 1 12 0v20"
            />
          }
        />
        <Tuile
          vers={CHEMINS.cils}
          teinte="bg-lilas"
          titre="Cils"
          detail={cils > 0 ? `${String(cils)} accessoires` : 'Grappes, bandes, kit'}
          dessin={
            <>
              <path className="trace-fil" pathLength={1} d="M4 26c10-10 30-10 40 0" />
              <path className="trace-fil" pathLength={1} d="M4 26c10 8 30 8 40 0" />
              <path
                className="trace-fil"
                pathLength={1}
                d="M10 20l-3-5M17 17l-2-6M24 16v-6M31 17l2-6M38 20l3-5"
              />
            </>
          }
        />
        <Tuile
          vers={CHEMINS.catalogue}
          teinte="bg-sauge"
          titre="Produits de pose"
          detail="Lace Glue, sprays, gel"
          dessin={
            <path
              className="trace-fil"
              pathLength={1}
              d="M20 6h8v6h-8zM18 12h12l2 6v22a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V18Z"
            />
          }
        />
        <Tuile
          vers={CHEMINS.prestations}
          teinte="bg-sable"
          titre="Le salon"
          detail={
            prestations.data
              ? `${String(prestations.data.length)} prestations`
              : 'Prestations sur demande'
          }
          dessin={
            <>
              <ellipse className="trace-fil" pathLength={1} cx={24} cy={18} rx={11} ry={13} />
              <path className="trace-fil" pathLength={1} d="M24 31v12M17 44h14" />
            </>
          }
        />
      </nav>

      <OffreDuMoment produits={liste} />

      {essentiels.length > 0 && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-encre">
              Les essentiels de pose
            </h2>
            <Link
              to={CHEMINS.catalogue}
              className="text-[13px] font-semibold text-or-texte no-underline"
            >
              Tout voir
            </Link>
          </div>
          <ul className="-mx-4 mt-3 flex [scrollbar-width:none] gap-2.5 overflow-x-auto px-4 pb-2">
            {essentiels.map((p) => {
              const v = p.variantes.find((x) => x.promo) ?? p.variantes[0]
              return (
                <li key={p.id} className="w-[148px] shrink-0">
                  <Link
                    to={lienProduit(p)}
                    className="block rounded-[24px] bg-carte p-2 no-underline shadow-panneau"
                  >
                    <VignetteProduit produit={p} className="h-[132px] rounded-[18px]" />
                    <p className="mt-2 truncate px-1 text-[14px] font-semibold text-encre">
                      {p.nom}
                    </p>
                    <div className="px-1 pb-1">
                      <PrixApp produit={p} variante={v} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="mt-5 rounded-[28px] bg-menthe p-[22px] text-sur-menthe">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[21px] font-semibold tracking-[-0.02em]">
            Livrée dans {SITE.paysLivres.length} pays
          </h2>
          <Truck aria-hidden="true" className="size-6" strokeWidth={1.6} />
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {SITE.paysLivres.map((pays) => (
            <li
              key={pays}
              className="flex min-h-7 items-center rounded-full bg-white/45 px-3 text-[13px] font-semibold"
            >
              {pays}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[14px] leading-relaxed">
          Paiement à la livraison, en espèces ou Mobile Money. Les frais se règlent directement à
          l’agence.
        </p>
      </section>
    </div>
  )
}
