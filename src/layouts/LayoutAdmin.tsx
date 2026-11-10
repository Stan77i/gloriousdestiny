import { Link, Outlet, useNavigate } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { BandeauHorsLigne } from '@/components/feedback/BandeauHorsLigne'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Bouton } from '@/components/ui/Bouton'
import { LIBELLES_ROLES } from '@/domain/roles'
import { useAuth } from '@/features/auth/useAuth'
import { versErreurApp } from '@/lib/errors/versErreurApp'

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
    <div className="flex min-h-dvh flex-col bg-noir-doux">
      <BandeauHorsLigne />
      <header className="border-b border-ivoire/10 bg-noir">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to={CHEMINS.admin} className="text-sm tracking-[0.25em] uppercase">
            Glorious Destiny · Admin
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {profil && (
              <span className="text-ivoire/70">
                {profil.nom} · {LIBELLES_ROLES[profil.role]}
              </span>
            )}
            <Bouton variante="secondaire" onClick={() => void deconnecter()}>
              Se déconnecter
            </Bouton>
          </div>
        </div>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
