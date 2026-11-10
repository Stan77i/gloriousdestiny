import { Link, Outlet } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { BandeauHorsLigne } from '@/components/feedback/BandeauHorsLigne'
import { SITE } from '@/config/site'

/** Gabarit du site public. La navigation complète arrive avec les pages de la Phase 4. */
export function LayoutPublic() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-or focus:px-3 focus:py-2 focus:text-noir"
      >
        Aller au contenu
      </a>
      <BandeauHorsLigne />
      <header className="border-b border-ivoire/10">
        <nav
          aria-label="Navigation principale"
          className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6"
        >
          <Link to={CHEMINS.accueil} className="text-sm tracking-[0.3em] text-ivoire uppercase">
            {SITE.nom}
          </Link>
        </nav>
      </header>
      <main id="contenu" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ivoire/10 px-4 py-6 text-center text-xs text-ivoire/50">
        © {new Date().getFullYear()} {SITE.nom}
      </footer>
    </div>
  )
}
