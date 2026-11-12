import { useState, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { usePrestations } from '@/features/catalogue/prestations'
import { lienProduit } from '@/features/catalogue/liens'
import { cx } from '@/lib/cx'
import { formaterFcfa } from '@/lib/format/montant'
import type { Produit } from '@/services/catalogue.service'
import { classesCta } from './classes'
import { VignetteProduit } from './produits'

type Intention = {
  id: string
  titre: string
  sous: string
  teinte: string
  dessin: ReactNode
  contenu: ReactNode
}

const nombre = (n: number) => formaterFcfa(n).replace(/\s*FCFA$/, '')

function prixMin(produits: Produit[]): number | null {
  const prix = produits.flatMap((p) => p.variantes.map((v) => v.prix))
  return prix.length > 0 ? Math.min(...prix) : null
}

function Dessin({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="size-12 shrink-0 text-or-texte"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

/** Rangée de produits d'une intention (vignettes cliquables). */
function Produits({ liste, vers, libelle }: { liste: Produit[]; vers: string; libelle: string }) {
  return (
    <>
      <ul className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1">
        {liste.map((p) => (
          <li key={p.id} className="w-[112px] shrink-0">
            <Link
              to={lienProduit(p)}
              className="block rounded-[20px] bg-carte p-1.5 no-underline shadow-panneau"
            >
              <VignetteProduit produit={p} className="h-[88px] rounded-[15px]" />
              <span className="mt-1.5 block truncate px-1 text-[13px] font-semibold text-encre">
                {p.nom}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to={vers} className={cx(classesCta('encre'), 'mt-4 min-h-12')}>
        {libelle}
      </Link>
    </>
  )
}

/**
 * Accueil « Rituel » (maquette 1c) : « Que faisons-nous aujourd'hui ? », quatre intentions en
 * cartes teintées qui se chevauchent. Une seule est ouverte ; toucher l'en-tête d'une carte
 * l'ouvre, toucher celle qui est ouverte la referme (règle de l'antagoniste).
 * Prix et prestations : ceux de la base.
 */
export function Rituel({
  produits,
  perruquesEpuisees,
}: {
  produits: Produit[]
  perruquesEpuisees: boolean
}) {
  const prestations = usePrestations()
  const naviguer = useNavigate()
  const [ouverte, setOuverte] = useState<string | null>('soin')
  const [reference, setReference] = useState('')
  const jour = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const date = jour.charAt(0).toUpperCase() + jour.slice(1)
  const pose = produits.filter(
    (p) => p.categorie.slug === 'pose-de-perruque' || p.categorie.slug === 'coiffage',
  )
  const cils = produits.filter((p) => p.categorie.slug === 'cils')
  const perruques = produits.filter((p) => p.type === 'perruque')
  const desPose = prixMin(pose)
  const desCils = prixMin(cils)

  const intentions: Intention[] = [
    {
      id: 'soin',
      titre: 'Prendre soin',
      sous: 'Le salon · sur demande',
      teinte: 'bg-sable',
      dessin: (
        <Dessin>
          <circle className="trace-fil" pathLength={1} cx={24} cy={18} r={13} />
          <path className="trace-fil" pathLength={1} d="M24 31v13M17 44h14M18 12c2-3 6-4 9-3" />
        </Dessin>
      ),
      contenu: (
        <>
          <ul className="grid grid-cols-2 gap-2">
            {(prestations.data ?? []).map((p) => (
              <li key={p.id}>
                <Link
                  to={CHEMINS.prestation(p.slug)}
                  className="flex h-full flex-col rounded-[20px] bg-carte px-3.5 py-3 no-underline"
                >
                  <span className="line-clamp-2 text-[15px] leading-tight font-semibold text-encre">
                    {p.nom}
                  </span>
                  <span className="chiffres mt-0.5 text-[13px] font-semibold text-or-texte">
                    {formaterFcfa(p.prix)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to={CHEMINS.prestations} className={cx(classesCta('or'), 'mt-4')}>
            Demander un rendez-vous
          </Link>
        </>
      ),
    },
    {
      id: 'poser',
      titre: 'Poser',
      sous: `Lace Glue, sprays, gel${desPose ? ` · dès ${nombre(desPose)}` : ''}`,
      teinte: 'bg-sauge',
      dessin: (
        <Dessin>
          <path
            className="trace-fil"
            pathLength={1}
            d="M21 6h7v4h-4v3M18 13h12v28a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2Z"
          />
        </Dessin>
      ),
      contenu: (
        <Produits liste={pose} vers={CHEMINS.produits} libelle="Voir les produits de pose" />
      ),
    },
    {
      id: 'regard',
      titre: 'Le regard',
      sous: `Grappes, bandes, kit${desCils ? ` · dès ${nombre(desCils)}` : ''}`,
      teinte: 'bg-lilas',
      dessin: (
        <Dessin>
          <path
            className="trace-fil"
            pathLength={1}
            d="M4 26c10-11 30-11 40 0c-10 10-30 10-40 0Z"
          />
          <circle className="trace-fil" pathLength={1} cx={24} cy={26} r={4} />
          <path
            className="trace-fil"
            pathLength={1}
            d="M12 18l-2-4M19 15l-1-5M29 15l1-5M36 18l2-4"
          />
        </Dessin>
      ),
      contenu: <Produits liste={cils} vers={CHEMINS.cils} libelle="Voir tous les cils" />,
    },
    {
      id: 'perruques',
      titre: 'Perruques',
      sous: perruquesEpuisees
        ? 'Rupture · être prévenue'
        : `${String(perruques.length)} modèle${perruques.length > 1 ? 's' : ''}`,
      teinte: 'bg-rose',
      dessin: (
        <Dessin>
          <path
            className="trace-fil"
            pathLength={1}
            d="M12 44V20a12 12 0 0 1 24 0v24M18 44V22a6 6 0 0 1 12 0v22M24 8v36"
          />
        </Dessin>
      ),
      contenu: perruquesEpuisees ? (
        <>
          <p className="text-[14px] leading-relaxed text-encre-2">
            Les perruques reviennent bientôt. Laissez votre numéro : vous serez prévenue sur
            WhatsApp dès leur retour.
          </p>
          <Link to={CHEMINS.perruques} className={cx(classesCta('encre'), 'mt-4 min-h-12')}>
            Me prévenir sur WhatsApp
          </Link>
        </>
      ) : (
        <Produits liste={perruques} vers={CHEMINS.perruques} libelle="Voir les perruques" />
      ),
    },
  ]

  return (
    <section aria-labelledby="titre-rituel" className="px-5 pt-8">
      <div className="flex items-center gap-2 self-start">
        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-carte px-4 text-[15px] font-semibold text-encre shadow-panneau">
          <span aria-hidden="true" className="size-2 rounded-full bg-or" />
          {date}
        </span>
      </div>
      <h2
        id="titre-rituel"
        className="mt-4 text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] text-encre"
      >
        Que faisons-nous <span className="text-or-texte">aujourd’hui</span> ?
      </h2>

      <ol className="mt-5 flex flex-col">
        {intentions.map((it, i) => {
          const ouv = ouverte === it.id
          return (
            <li
              key={it.id}
              style={{ zIndex: intentions.length - i }}
              className={cx(
                'relative rounded-[28px] shadow-[0_-10px_30px_-18px_rgb(20_18_12/0.35)] transition-[padding] duration-500 ease-(--ease-sortie)',
                it.teinte,
                i > 0 && '-mt-[26px] pt-[26px]',
              )}
            >
              <button
                type="button"
                aria-expanded={ouv}
                onClick={() => {
                  setOuverte(ouv ? null : it.id)
                }}
                className={cx(
                  'flex w-full items-center gap-4 px-5 text-left',
                  ouv ? 'pt-5 pb-3' : 'py-4',
                )}
              >
                <span className="chiffres grid size-10 shrink-0 place-items-center rounded-full bg-carte text-[15px] font-bold text-encre">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cx(
                      'block font-semibold tracking-[-0.025em] text-encre transition-[font-size] duration-500',
                      ouv ? 'text-[30px] leading-tight' : 'text-[21px] leading-tight',
                    )}
                  >
                    {it.titre}
                  </span>
                  <span className="block text-[14px] leading-snug text-encre-2">{it.sous}</span>
                </span>
                {it.dessin}
              </button>
              <div
                className={cx(
                  'grid transition-[grid-template-rows] duration-500 ease-(--ease-sortie)',
                  ouv ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="overflow-hidden" inert={!ouv}>
                  <div className="px-5 pt-1 pb-6">{it.contenu}</div>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const ref = reference.trim().toUpperCase()
          void naviguer(ref.length >= 4 ? CHEMINS.suiviCommande(ref) : CHEMINS.suivi)
        }}
        className="mt-4 flex h-14 items-center gap-2 rounded-full bg-carte pr-1.5 pl-5 shadow-[inset_0_0_0_1px_var(--color-filet-fort)]"
      >
        <label htmlFor="suivi-rituel" className="sr-only">
          Suivre une commande
        </label>
        <input
          id="suivi-rituel"
          value={reference}
          onChange={(e) => {
            setReference(e.target.value)
          }}
          placeholder="Suivre une commande · GD-…"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-encre uppercase outline-none placeholder:text-encre-3 placeholder:normal-case"
        />
        <button
          type="submit"
          aria-label="Suivre"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-encre text-fond"
        >
          <ArrowRight aria-hidden="true" className="size-5" />
        </button>
      </form>
    </section>
  )
}
