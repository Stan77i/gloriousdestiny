import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import {
  IconeAccueil,
  IconeBoutique,
  IconePanier,
  IconePlus,
  IconePrestations,
} from '@/components/marque/IconesOnglets'
import { usePanier } from '@/features/panier/usePanier'
import { cx } from '@/lib/cx'

/** Pages rangées sous l'onglet Boutique (la boutique et ses univers). */
const BOUTIQUE = [CHEMINS.catalogue, CHEMINS.produits, CHEMINS.perruques, CHEMINS.cils]

function classes(actif: boolean) {
  return cx(
    'relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 text-[11px] font-medium no-underline transition-colors duration-300',
    actif ? 'text-or-texte' : 'text-encre-3 hover:text-encre',
  )
}

/** Filet d'or au-dessus de l'onglet actif. */
function Repere({ actif }: { actif: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'absolute top-0 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-or transition-[opacity,transform] duration-300 ease-(--ease-sortie)',
        actif ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
      )}
    />
  )
}

function Onglet({
  vers,
  libelle,
  actif,
  icone,
  extra,
}: {
  vers: string
  libelle: string
  actif: boolean
  icone: (actif: boolean) => ReactNode
  extra?: ReactNode
}) {
  return (
    <li className="min-w-0 flex-1">
      <NavLink to={vers} aria-current={actif ? 'page' : undefined} className={classes(actif)}>
        <Repere actif={actif} />
        <span className="relative">
          {icone(actif)}
          {extra}
        </span>
        <span className="max-w-full truncate">{libelle}</span>
      </NavLink>
    </li>
  )
}

/**
 * Barre d'onglets du téléphone, comme dans les applications beauté : les quatre destinations
 * principales et « Plus » (le menu complet), toujours à portée du pouce.
 */
export function BarreOnglets({ menuOuvert, onMenu }: { menuOuvert: boolean; onMenu: () => void }) {
  const { pathname } = useLocation()
  const { nombreArticles } = usePanier()
  // Chaque ajout au panier fait rebondir la pastille (jamais au chargement).
  const [ajouts, setAjouts] = useState(0)
  useEffect(() => {
    const f = () => {
      setAjouts((n) => n + 1)
    }
    window.addEventListener('panier:ajout', f)
    return () => {
      window.removeEventListener('panier:ajout', f)
    }
  }, [])

  const sous = (c: string) => pathname === c || pathname.startsWith(`${c}/`)
  const accueil = pathname === CHEMINS.accueil
  const boutique = BOUTIQUE.some(sous)
  const prestations = sous(CHEMINS.prestations)
  const panier = sous(CHEMINS.panier) || sous(CHEMINS.commande)
  const plus = menuOuvert || !(accueil || boutique || prestations || panier)

  return (
    <nav
      aria-label="Navigation rapide"
      className="barre-onglets fixed inset-x-3 z-40 rounded-[24px] bg-carte/95 p-1 shadow-flottant backdrop-blur-md lg:hidden"
    >
      <ul className="flex items-stretch justify-around">
        <Onglet
          vers={CHEMINS.accueil}
          libelle="Accueil"
          actif={accueil && !menuOuvert}
          icone={(a) => <IconeAccueil actif={a} />}
        />
        <Onglet
          vers={CHEMINS.catalogue}
          libelle="Boutique"
          actif={boutique && !menuOuvert}
          icone={(a) => <IconeBoutique actif={a} />}
        />
        <Onglet
          vers={CHEMINS.prestations}
          libelle="Prestations"
          actif={prestations && !menuOuvert}
          icone={(a) => <IconePrestations actif={a} />}
        />
        <Onglet
          vers={CHEMINS.panier}
          libelle="Panier"
          actif={panier && !menuOuvert}
          icone={(a) => <IconePanier actif={a} />}
          extra={
            nombreArticles > 0 && (
              <>
                <span className="sr-only">
                  {`, ${String(nombreArticles)} article${nombreArticles > 1 ? 's' : ''}`}
                </span>
                <span
                  key={`pastille-${String(ajouts)}`}
                  aria-hidden="true"
                  className={cx(
                    'chiffres absolute -top-1.5 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-or px-1 text-[10px] font-bold text-sur-or',
                    ajouts > 0 && 'pastille-rebond',
                  )}
                >
                  {nombreArticles}
                </span>
              </>
            )
          }
        />
        <li className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onMenu}
            aria-expanded={menuOuvert}
            aria-label="Plus : tout le site"
            className={classes(plus)}
          >
            <Repere actif={plus} />
            <IconePlus actif={plus} />
            <span>Plus</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
