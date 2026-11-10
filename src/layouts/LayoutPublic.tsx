import { Link, Outlet } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { BandeauHorsLigne } from '@/components/feedback/BandeauHorsLigne'
import { Signature } from '@/components/marque/Signature'
import { SITE } from '@/config/site'

/** Gabarit du site public. La navigation complète arrive avec les pages de la Phase 4. */
export function LayoutPublic() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only rounded-full focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-or focus:px-4 focus:py-2 focus:text-sur-or"
      >
        Aller au contenu
      </a>
      <BandeauHorsLigne />
      <header className="sticky top-0 z-40 border-b border-filet bg-noir/85 backdrop-blur-md">
        <nav
          aria-label="Navigation principale"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10"
        >
          <Link to={CHEMINS.accueil} className="no-underline" aria-label={`${SITE.nom}, accueil`}>
            <Signature />
          </Link>
        </nav>
      </header>
      <main id="contenu" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-filet px-4 py-8 text-center text-[13px] text-ivoire-3">
        © {new Date().getFullYear()} {SITE.nom}
      </footer>
    </div>
  )
}
