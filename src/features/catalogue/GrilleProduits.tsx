import { useState, type ReactNode } from 'react'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { CarteProduit, type Univers } from '@/components/produit/CarteProduit'
import { BlocPrix } from '@/components/produit/PrixProduit'
import { choisirBadges } from '@/components/produit/badges'
import { SLUGS_BULLES } from '@/components/produit/bulles'
import { useRevele } from '@/hooks/useRevele'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { usePanier } from '@/features/panier/usePanier'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import type { Produit } from '@/services/catalogue.service'
import { ApercuProduit } from './ApercuProduit'
import { lienProduit } from './liens'
import { useDisponibilites } from './requetes'
import { SLUG_LA_GAMME, visuelProduit } from './visuels'
import { cx } from '@/lib/cx'

const UNIVERS_TYPE: Record<Produit['type'], Univers> = {
  produit: 'soin',
  accessoire_cils: 'cils',
  perruque: 'perruque',
}

/** Case de la grille, révélée au défilement (décalée par colonne). */
function CelluleRevelee({
  indice,
  large,
  children,
}: {
  indice: number
  large: boolean
  children: ReactNode
}) {
  const ref = useRevele(indice)
  return (
    <li ref={ref} className={cx('h-full', large && 'col-span-full')}>
      {children}
    </li>
  )
}

/**
 * Grille de produits reliée aux données : prix de la base, disponibilité vivante,
 * ajout au panier. `vide` s'affiche quand la liste filtrée est vide.
 */
export function GrilleProduits({
  produits,
  chargement,
  erreur,
  onReessayer,
  vide,
  colonnes = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}: {
  produits: Produit[] | undefined
  chargement: boolean
  erreur: unknown
  onReessayer: () => void
  vide: ReactNode
  colonnes?: string
}) {
  const panier = usePanier()
  const { notifier } = useNotifications()
  const variantes = (produits ?? []).flatMap((p) => p.variantes.map((v) => v.id))
  const dispo = useDisponibilites(variantes)
  const [apercu, setApercu] = useState<Produit | null>(null)

  if (erreur)
    return <EtatErreur message={versErreurApp(erreur).message} onReessayer={onReessayer} />
  if (chargement || !produits) {
    return (
      <ul
        className={`grid gap-3 sm:gap-4 ${colonnes}`}
        aria-busy="true"
        aria-label="Chargement des produits"
      >
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="rounded-panneau border border-filet bg-carte p-4">
            <Squelette className="aspect-[4/5] w-full rounded-[12px]" />
            <Squelette className="mt-4 h-4 w-3/4" />
            <Squelette className="mt-2 h-3 w-1/2" />
          </li>
        ))}
      </ul>
    )
  }
  if (produits.length === 0) return <>{vide}</>

  return (
    <>
      <ul className={`grid gap-3 sm:gap-4 ${colonnes}`}>
        {produits.map((p, i) => {
          const variante = p.variantes[0]
          const plusieurs = p.variantes.length > 1
          const visuel = visuelProduit(p.slug)
          const large = p.slug === SLUG_LA_GAMME
          // Plusieurs formats : disponible si l'un d'eux l'est ; le choix se fait sur la fiche.
          const statuts = p.variantes.map((v) => dispo.data?.get(v.id) ?? 'epuise')
          const statut = statuts.includes('disponible')
            ? 'disponible'
            : statuts.includes('bientot_epuise')
              ? 'bientot_epuise'
              : variante
                ? 'epuise'
                : undefined
          // Meilleure réduction réelle parmi les formats (badge de l'image).
          const reductions = p.variantes.flatMap((v) => (v.promo ? [v.promo.reduction] : []))
          const reduction = reductions.length > 0 ? Math.max(...reductions) : undefined
          const badges = choisirBadges(
            { ...p.badges, stockLimite: !dispo.isPending && statut === 'bientot_epuise' },
            reduction === undefined ? 2 : 1,
          )
          return (
            <CelluleRevelee key={p.id} indice={i % 4} large={large}>
              <CarteProduit
                nom={p.nom}
                format={
                  plusieurs
                    ? p.variantes.map((v) => v.libelle).join(' · ')
                    : variante && variante.libelle !== 'Format standard'
                      ? variante.libelle
                      : null
                }
                categorie={p.categorie.nom}
                accroche={p.fiche.accroche ?? null}
                univers={UNIVERS_TYPE[p.type]}
                bulles={SLUGS_BULLES.has(p.slug)}
                detoure={visuel.detoure}
                pleine={large ? visuel.pleine?.grande : visuel.pleine?.petite}
                large={large}
                photo={visuel.photo?.petite}
                prix={
                  <BlocPrix
                    prix={variante?.prix ?? p.prix}
                    promo={variante?.promo ?? null}
                    des={plusieurs}
                  />
                }
                onApercu={() => {
                  setApercu(p)
                }}
                reduction={reduction}
                badges={badges}
                disponibilite={dispo.isPending ? undefined : (statut ?? 'epuise')}
                vers={lienProduit(p)}
                choisir={plusieurs}
                {...(variante &&
                  !plusieurs && {
                    onAjouter: () => {
                      panier.ajouter(variante.id)
                      notifier(`${p.nom} ajouté au panier.`, 'succes')
                    },
                  })}
              />
            </CelluleRevelee>
          )
        })}
      </ul>
      {apercu && (
        <ApercuProduit
          key={apercu.id}
          produit={apercu}
          dispo={dispo.data}
          onFermer={() => {
            setApercu(null)
          }}
        />
      )}
    </>
  )
}
