import { useState } from 'react'
import { Menu, ShoppingBag } from 'lucide-react'
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { CHEMINS, NAVIGATION_PUBLIQUE } from '@/app/router/chemins'
import { BandeauHorsLigne } from '@/components/feedback/BandeauHorsLigne'
import { Signature } from '@/components/marque/Signature'
import { VeineOr } from '@/components/marque/VeineOr'
import { BoutonIcone } from '@/components/ui/Bouton'
import { Modale } from '@/components/ui/Modale'
import { SITE } from '@/config/site'
import { useParametresPublics } from '@/features/catalogue/requetes'
import { usePanier } from '@/features/panier/usePanier'
import { BoutonTheme } from '@/features/theme/BoutonTheme'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { cx } from '@/lib/cx'

function LienPanier() {
  const { nombreArticles } = usePanier()
  return (
    <Link
      to={CHEMINS.panier}
      className="relative inline-flex size-11 items-center justify-center rounded-full bg-encre text-fond no-underline transition-colors duration-300 hover:bg-encre-2 [&_svg]:size-[18px]"
      aria-label={
        nombreArticles > 0
          ? `Panier, ${String(nombreArticles)} article${nombreArticles > 1 ? 's' : ''}`
          : 'Panier, vide'
      }
    >
      <ShoppingBag aria-hidden="true" />
      {nombreArticles > 0 && (
        <span
          aria-hidden="true"
          className="chiffres absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-or px-1 text-[11px] font-bold text-sur-or"
        >
          {nombreArticles}
        </span>
      )}
    </Link>
  )
}

function classesLien({ isActive }: { isActive: boolean }) {
  return cx(
    'inline-flex min-h-10 items-center rounded-full px-4 text-[15px] whitespace-nowrap no-underline transition-colors duration-300',
    isActive ? 'bg-encre text-fond' : 'text-encre-2 hover:bg-carte-2 hover:text-encre',
  )
}

function PiedDePage() {
  const parametres = useParametresPublics()
  return (
    <footer className="mt-12 bg-carte">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-10">
        <div className="flex flex-col gap-4">
          <Signature />
          <VeineOr className="max-w-[220px]" animee={false} />
          <p className="max-w-xs text-sm leading-relaxed text-encre-3">
            Perruques, pose de cils et produits professionnels.
          </p>
          <BoutonWhatsApp taille="petit" className="self-start" />
        </div>
        <div className="text-sm">
          <h2 className="font-semibold text-encre">Le salon</h2>
          <dl className="mt-3 flex flex-col gap-1 text-encre-3">
            {parametres.data?.ville_salon && <dd>{parametres.data.ville_salon}</dd>}
            {parametres.data?.horaires_salon && <dd>{parametres.data.horaires_salon}</dd>}
          </dl>
          <Link to={CHEMINS.rendezVous} className="mt-3 inline-block text-or-texte hover:text-or">
            Prendre rendez-vous
          </Link>
        </div>
        <div className="text-sm">
          <h2 className="font-semibold text-encre">Livraison</h2>
          <p className="mt-3 leading-relaxed text-encre-3">
            Douala, Yaoundé, Garoua et Abidjan. Paiement à la livraison, en espèces ou Mobile Money.
          </p>
        </div>
      </div>
      <div className="border-t border-filet px-4 py-6 text-center text-[13px] text-encre-3">
        © {new Date().getFullYear()} {SITE.nom}
      </div>
    </footer>
  )
}

/** Gabarit du site public : en-tête, menu mobile, pied de page. */
export function LayoutPublic() {
  const [menu, setMenu] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollRestoration />
      <a
        href="#contenu"
        className="sr-only rounded-full focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-or focus:px-4 focus:py-2 focus:text-sur-or"
      >
        Aller au contenu
      </a>
      <BandeauHorsLigne />
      <header className="sticky top-0 z-40 bg-fond/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Link to={CHEMINS.accueil} className="no-underline" aria-label={`${SITE.nom}, accueil`}>
            <Signature />
          </Link>
          <nav aria-label="Navigation principale" className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-1 rounded-full bg-carte p-1 shadow-panneau">
              {NAVIGATION_PUBLIQUE.map((l) => (
                <li key={l.vers}>
                  <NavLink to={l.vers} className={classesLien}>
                    {l.libelle}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-4">
            <Link
              to={CHEMINS.rendezVous}
              className="hidden min-h-11 items-center rounded-full bg-carte px-5 text-sm font-semibold text-encre no-underline shadow-panneau transition-colors duration-300 hover:bg-carte-2 md:inline-flex"
            >
              Rendez-vous
            </Link>
            <BoutonTheme className="hidden sm:inline-flex" />
            <LienPanier />
            <BoutonIcone
              libelle="Ouvrir le menu"
              className="lg:hidden"
              onClick={() => {
                setMenu(true)
              }}
            >
              <Menu />
            </BoutonIcone>
          </div>
        </div>
      </header>

      <Modale
        forme="tiroir"
        ouverte={menu}
        onFermer={() => {
          setMenu(false)
        }}
        titre="Menu"
      >
        <nav aria-label="Navigation mobile">
          <ul className="flex flex-col">
            {[...NAVIGATION_PUBLIQUE, { vers: CHEMINS.rendezVous, libelle: 'Rendez-vous' }].map(
              (l) => (
                <li key={l.vers} className="border-b border-filet">
                  <NavLink
                    to={l.vers}
                    onClick={() => {
                      setMenu(false)
                    }}
                    className={({ isActive }) =>
                      cx(
                        'flex min-h-14 items-center text-[26px] font-semibold tracking-[-0.02em] no-underline',
                        isActive ? 'text-or-texte' : 'text-encre',
                      )
                    }
                  >
                    {l.libelle}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>
        <div className="mt-8 flex items-center gap-3">
          <BoutonWhatsApp />
          <BoutonTheme />
        </div>
      </Modale>

      <main id="contenu" className="flex-1">
        <Outlet />
      </main>
      <PiedDePage />
    </div>
  )
}
