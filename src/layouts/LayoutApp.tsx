import { useEffect, useState } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { BandeauHorsLigne } from '@/components/feedback/BandeauHorsLigne'
import { Signature } from '@/components/marque/Signature'
import { SITE } from '@/config/site'
import { BoutonRetour, BoutonTheme } from '@/features/app/elements'
import { FeuillePlus } from '@/features/app/FeuillePlus'
import { useSonsDuSite } from '@/features/sons/useSonsDuSite'
import { BarreOnglets } from './BarreOnglets'

/** Écrans dessinés pour l'application : ils portent leur propre en-tête. */
function ecranNatif(chemin: string): boolean {
  if (
    [
      CHEMINS.accueil,
      CHEMINS.catalogue,
      CHEMINS.produits,
      CHEMINS.perruques,
      CHEMINS.cils,
      CHEMINS.panier,
      CHEMINS.prestations,
      CHEMINS.compte,
      CHEMINS.suivi,
    ].includes(chemin as never)
  )
    return true
  return /^\/(produits|perruques|prestations)\/[^/]+$/.test(chemin)
}

/** Écrans à action principale : la barre d'onglets cède la place à une barre d'action. */
function avecBarreAction(chemin: string): boolean {
  return /^\/(produits|perruques|prestations)\/[^/]+$/.test(chemin)
}

/**
 * Gabarit de l'application (téléphone) : contenu en colonne (gouttière 16 px), barre d'onglets
 * flottante, feuille « Plus ». Chaque changement d'écran remonte en haut et entre en fondu.
 * Les écrans pas encore redessinés pour l'application gardent leur page, sous un en-tête court.
 */
export function LayoutApp() {
  const { pathname } = useLocation()
  const [plus, setPlus] = useState(false)
  useSonsDuSite()

  useEffect(() => {
    document.documentElement.dataset['app'] = ''
    return () => {
      delete document.documentElement.dataset['app']
    }
  }, [])

  const natif = ecranNatif(pathname)
  const action = avecBarreAction(pathname)
  // Accueil « Écrin » : la photo monte jusque sous la barre d'état.
  const pleinCadre = pathname === CHEMINS.accueil

  return (
    <div className="app-coquille flex min-h-dvh flex-col">
      <ScrollRestoration />
      <BandeauHorsLigne />
      {!natif && (
        <header className="app-entete sticky top-0 z-30 flex items-center gap-3 bg-fond/90 px-4 pb-2 backdrop-blur-md">
          <BoutonRetour />
          <Link
            to={CHEMINS.accueil}
            className="min-w-0 flex-1 no-underline"
            aria-label={`${SITE.nom}, accueil`}
          >
            <Signature />
          </Link>
          <BoutonTheme />
        </header>
      )}
      <main
        id="contenu"
        key={pathname}
        className={
          pleinCadre
            ? 'app-ecran flex-1'
            : `app-ecran flex-1 ${natif ? 'app-haut px-4' : ''} ${action ? 'pb-36' : 'pb-(--barre-onglets)'}`
        }
      >
        <Outlet />
      </main>
      {!action && (
        <BarreOnglets
          app
          menuOuvert={plus}
          onMenu={() => {
            setPlus((p) => !p)
          }}
        />
      )}
      <FeuillePlus
        ouverte={plus}
        onFermer={() => {
          setPlus(false)
        }}
      />
    </div>
  )
}
