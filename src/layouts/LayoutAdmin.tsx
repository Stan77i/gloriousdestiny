import { LogOut } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { BandeauHorsLigne } from '@/components/feedback/BandeauHorsLigne'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Signature } from '@/components/marque/Signature'
import { BoutonIcone } from '@/components/ui/Bouton'
import { aRole, LIBELLES_ROLES, type Role } from '@/domain/roles'
import { useAuth } from '@/features/auth/useAuth'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'

/** Modules et rôles qui y ont accès (null = tout le personnel). Chaque phase ajoute les siens. */
const MODULES: { vers: string; libelle: string; fin: boolean; roles: Role[] | null }[] = [
  { vers: CHEMINS.admin, libelle: 'Aperçu', fin: true, roles: null },
  { vers: '/admin/commandes', libelle: 'Commandes', fin: false, roles: ['ventes', 'logistique'] },
  { vers: '/admin/clientes', libelle: 'Clientes', fin: false, roles: ['ventes'] },
  { vers: CHEMINS.adminSystemeDesign, libelle: 'Système de design', fin: false, roles: null },
]

/** Gabarit de l'espace d'administration (rendu uniquement derrière RequireStaff). */
export function LayoutAdmin() {
  const auth = useAuth()
  const { notifier } = useNotifications()
  const naviguer = useNavigate()
  const profil = auth.statut === 'connecte' ? auth.profil : null

  async function deconnecter() {
    try {
      await auth.seDeconnecter()
      void naviguer(CHEMINS.connexion, { replace: true })
    } catch (erreur) {
      notifier(versErreurApp(erreur).message, 'erreur')
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BandeauHorsLigne />
      <header className="sticky top-0 z-40 border-b border-filet bg-noir/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link to={CHEMINS.admin} className="no-underline">
            <Signature className="text-[13px]" />
          </Link>
          <nav
            aria-label="Modules"
            className="order-3 w-full overflow-x-auto md:order-none md:w-auto"
          >
            <ul className="inline-flex items-center gap-1 rounded-full border border-filet bg-surface-1 p-1">
              {MODULES.filter((m) => m.roles === null || aRole(profil?.role ?? null, m.roles)).map(
                (m) => (
                  <li key={m.vers}>
                    <NavLink
                      to={m.vers}
                      end={m.fin}
                      className={({ isActive }) =>
                        cx(
                          'inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap no-underline transition-colors duration-200',
                          isActive
                            ? 'bg-or text-sur-or shadow-or'
                            : 'text-ivoire-2 hover:bg-surface-2 hover:text-ivoire',
                        )
                      }
                    >
                      {m.libelle}
                    </NavLink>
                  </li>
                ),
              )}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {profil && (
              <span className="hidden text-right text-[13px] leading-tight sm:block">
                <span className="block font-semibold text-ivoire">{profil.nom}</span>
                <span className="text-ivoire-3">{LIBELLES_ROLES[profil.role]}</span>
              </span>
            )}
            <BoutonIcone libelle="Se déconnecter" onClick={() => void deconnecter()}>
              <LogOut />
            </BoutonIcone>
          </div>
        </div>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
