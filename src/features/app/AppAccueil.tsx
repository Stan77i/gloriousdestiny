import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, Truck } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { VeineOr } from '@/components/marque/VeineOr'
import { BadgePromo } from '@/components/produit/PrixProduit'
import { SITE } from '@/config/site'
import { usePrestations } from '@/features/catalogue/prestations'
import { lienProduit } from '@/features/catalogue/liens'
import { useDisponibilites, useProduits } from '@/features/catalogue/requetes'
import { SLUG_LA_GAMME, visuelProduit } from '@/features/catalogue/visuels'
import { useMouvementReduit } from '@/hooks/useMouvementReduit'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { useHorloge } from '@/hooks/useHorloge'
import { cx } from '@/lib/cx'
import { restant } from '@/lib/format/echeance'
import { formaterFcfa } from '@/lib/format/montant'
import type { Produit, Variante } from '@/services/catalogue.service'
import { statutProduit } from './catalogueApp'
import { classesCta } from './classes'
import { BoutonTheme } from './elements'
import { PrixApp } from './produits'

/** Photos d'usage qui défilent derrière le titre (une toutes les 2 s). */
const PHOTOS = [
  'lace-glue',
  'lace-melting-spray',
  'glue-residue-remover-shampoo',
  'wax-stick',
  'lace-glue-remover-spray',
  'braid-gel',
]
const DUREE = 2000

type Offre = { produit: Produit; variante: Variante; reduction: number; fin: string | null }

/** La meilleure promotion réelle en cours (aucune n'est jamais simulée). */
function meilleureOffre(produits: Produit[]): Offre | null {
  let best: Offre | null = null
  for (const p of produits)
    for (const v of p.variantes)
      if (v.promo && (!best || v.promo.reduction > best.reduction))
        best = { produit: p, variante: v, reduction: v.promo.reduction, fin: v.promo.fin }
  return best
}

/** « Fin dans 02j 06h 14m » : le vrai compte à rebours de l'offre. */
function FinDans({ fin }: { fin: string }) {
  const r = restant(fin, useHorloge())
  const d = (n: number) => String(n).padStart(2, '0')
  if (r.total === 0) return <>Offre terminée</>
  return (
    <span className="chiffres">
      Fin dans {d(r.jours)}j {d(r.heures)}h {d(r.minutes)}m
    </span>
  )
}

/**
 * Premier écran « Écrin » : photo plein cadre qui change toutes les 2 s (fondu et zoom lent),
 * pastille GD, grand titre « Glorious Destiny » et sa veine d'or. Mouvement réduit : une photo fixe.
 */
function Ecrin({ produits, offre }: { produits: Produit[]; offre: Offre | null }) {
  const reduit = useMouvementReduit()
  const diapos = PHOTOS.flatMap((slug) => {
    const photo = visuelProduit(slug).photo
    const produit = produits.find((p) => p.slug === slug)
    return photo ? [{ slug, photo, produit }] : []
  })
  const [rang, setRang] = useState(0)
  useEffect(() => {
    if (reduit || diapos.length < 2) return
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') setRang((r) => (r + 1) % diapos.length)
    }, DUREE)
    return () => {
      window.clearInterval(t)
    }
  }, [reduit, diapos.length])
  const actuelle = diapos[rang % Math.max(1, diapos.length)]

  return (
    <section className="ecrin relative h-[560px] overflow-hidden bg-fond text-encre">
      {diapos.map((d, i) => (
        <img
          key={d.slug}
          src={d.photo.petite}
          alt={i === rang ? d.photo.alt : ''}
          aria-hidden={i !== rang}
          loading={i < 2 ? 'eager' : 'lazy'}
          decoding="async"
          className={cx(
            'absolute inset-0 size-full object-cover object-[60%_30%] transition-opacity duration-700',
            i === rang ? 'ecrin-photo z-[1] opacity-100' : 'z-0 opacity-0',
          )}
        />
      ))}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgb(15_15_14/0.6)_0%,rgb(15_15_14/0)_24%,rgb(15_15_14/0)_44%,#0f0f0e_96%)]"
      />

      <div className="app-haut absolute inset-x-4 top-0 z-[3] flex items-center justify-between gap-3">
        <Link
          to={CHEMINS.accueil}
          aria-label={`${SITE.nom}, accueil`}
          className="logo-vivant grid size-11 shrink-0 place-items-center rounded-full bg-[#0f0f0e] text-[14px] font-bold tracking-[-0.04em] text-or no-underline"
        >
          GD
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          {offre && (
            <Link
              to={lienProduit(offre.produit)}
              className="flex h-10 min-w-0 items-center gap-2 rounded-full bg-[#0f0f0e]/85 px-4 text-[13px] font-semibold text-white no-underline backdrop-blur-md"
            >
              <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-or" />
              <span className="truncate">
                Offre · {offre.produit.nom} −{offre.reduction} %
              </span>
            </Link>
          )}
          <BoutonTheme />
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-3.5 z-[3] flex flex-col gap-2.5 text-white">
        {actuelle?.produit && (
          <Link
            key={actuelle.slug}
            to={lienProduit(actuelle.produit)}
            className="apparait-fondu flex h-8 items-center gap-1.5 self-start rounded-full bg-white/15 px-3 text-[13px] font-semibold text-white no-underline backdrop-blur-md"
          >
            {actuelle.produit.nom}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        )}
        <h1 className="text-[84px] leading-[0.88] font-semibold tracking-[-0.045em] max-[370px]:text-[72px]">
          Glorious
          <br />
          <span className="text-or-clair">Destiny</span>
        </h1>
        <VeineOr vivante className="h-5 w-full text-or" />
        <p className="max-w-[300px] text-[15px] leading-relaxed text-white/80">
          La gamme professionnelle de pose, les cils et le salon. Paiement à la livraison.
        </p>
      </div>
      {/* Progression : un trait par photo. */}
      <div aria-hidden="true" className="absolute inset-x-5 bottom-0 z-[3] flex gap-1">
        {diapos.map((d, i) => (
          <span
            key={d.slug}
            className={cx(
              'h-[2px] flex-1 rounded-full transition-colors duration-500',
              i === rang ? 'bg-or' : 'bg-white/20',
            )}
          />
        ))}
      </div>
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
        'relative flex h-[84px] flex-col justify-end overflow-hidden rounded-[24px] p-3.5 no-underline transition-transform active:scale-[0.97]',
        teinte,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="absolute top-2.5 right-2.5 size-8 text-or-texte"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dessin}
      </svg>
      <span className="text-[15px] font-semibold text-encre">{titre}</span>
      <span className="truncate text-[12px] text-encre-2">{detail}</span>
    </Link>
  )
}

/** Accueil « Écrin » de l'application (maquette 1b). */
export function AppAccueil() {
  useTitreDocument()
  const produits = useProduits()
  const prestations = usePrestations()
  const liste = produits.data ?? []
  const perruques = liste.filter((p) => p.type === 'perruque')
  const dispo = useDisponibilites(perruques.flatMap((p) => p.variantes.map((v) => v.id)))
  const perruquesEpuisees =
    produits.data !== undefined &&
    (perruques.length === 0 ||
      (dispo.data !== undefined &&
        perruques.every((p) => statutProduit(p, dispo.data) === 'epuise')))
  const cils = liste.filter((p) => p.categorie.slug === 'cils').length
  const gamme = liste.filter((p) => p.type === 'produit' && p.slug !== SLUG_LA_GAMME)
  const offre = meilleureOffre(liste)

  return (
    <div className="zone-nuit -mx-0 min-h-dvh bg-fond pb-(--barre-onglets) text-encre">
      <Ecrin produits={liste} offre={offre} />

      <div className="flex gap-2.5 px-5 pt-2">
        <Link to={CHEMINS.catalogue} className={cx(classesCta('or'), 'min-h-[52px] flex-1')}>
          La boutique
        </Link>
        <Link
          to={CHEMINS.prestations}
          className="flex min-h-[52px] flex-1 items-center justify-center rounded-full bg-carte text-[16px] font-semibold text-encre no-underline shadow-[inset_0_0_0_1px_var(--color-filet-fort)] active:scale-[0.98]"
        >
          Le salon
        </Link>
      </div>

      {offre && (
        <Link
          to={lienProduit(offre.produit)}
          className="mx-5 mt-4 flex items-center gap-3 rounded-full bg-carte py-2 pr-2 pl-2.5 no-underline shadow-panneau"
        >
          <BadgePromo reduction={offre.reduction} />
          <span className="min-w-0 flex-1">
            <span className="chiffres block truncate text-[14px] font-semibold text-encre">
              {offre.produit.nom} · {formaterFcfa(offre.variante.prix)}
            </span>
            {offre.fin && (
              <span className="block text-[12px] text-encre-3">
                <FinDans fin={offre.fin} />
              </span>
            )}
          </span>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-encre text-fond">
            <ArrowRight aria-hidden="true" className="size-4" />
          </span>
        </Link>
      )}

      {gamme.length > 0 && (
        <section className="mt-7">
          <div className="flex items-baseline justify-between gap-3 px-5 pb-3">
            <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-encre">La gamme</h2>
            <Link
              to={CHEMINS.produits}
              className="text-[13px] font-semibold text-or-texte no-underline"
            >
              {gamme.length} essentiels
            </Link>
          </div>
          <ul className="flex [scrollbar-width:none] gap-3 overflow-x-auto px-5 pb-2">
            {gamme.map((p) => {
              const v = visuelProduit(p.slug)
              const variante = p.variantes.find((x) => x.promo) ?? p.variantes[0]
              return (
                <li key={p.id} className="w-[200px] shrink-0">
                  <Link to={lienProduit(p)} className="flex flex-col gap-2.5 no-underline">
                    <span className="socle-produit relative grid h-[250px] place-items-center overflow-hidden rounded-[28px] shadow-[inset_0_0_0_1px_var(--color-filet)]">
                      {v.detoure ? (
                        <img
                          src={v.detoure}
                          alt=""
                          loading="lazy"
                          className="h-[200px] object-contain drop-shadow-[0_20px_20px_rgb(0_0_0/0.5)]"
                        />
                      ) : v.pleine ? (
                        <img
                          src={v.pleine.petite}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover"
                        />
                      ) : (
                        <span className="text-[64px] font-semibold text-or/60">
                          {p.nom.charAt(0)}
                        </span>
                      )}
                      {variante?.promo && (
                        <BadgePromo
                          reduction={variante.promo.reduction}
                          className="absolute top-3 left-3"
                        />
                      )}
                    </span>
                    <span className="flex items-baseline justify-between gap-2 px-1.5">
                      <span className="truncate text-[17px] font-semibold text-encre">{p.nom}</span>
                    </span>
                    <span className="-mt-1.5 px-1.5">
                      <PrixApp produit={p} variante={variante} />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <nav aria-label="Univers" className="mt-6 grid grid-cols-2 gap-2.5 px-5">
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
            prestations.data ? `${String(prestations.data.length)} prestations` : 'Sur demande'
          }
          dessin={
            <>
              <ellipse className="trace-fil" pathLength={1} cx={24} cy={18} rx={11} ry={13} />
              <path className="trace-fil" pathLength={1} d="M24 31v12M17 44h14" />
            </>
          }
        />
      </nav>

      <section className="mx-5 mt-6 rounded-[28px] bg-menthe p-[22px] text-sur-menthe">
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
              className="flex min-h-7 items-center rounded-full bg-white/15 px-3 text-[13px] font-semibold"
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
