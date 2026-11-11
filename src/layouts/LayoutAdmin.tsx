import { useState, type ReactNode } from 'react'
import {
  Boxes,
  CalendarDays,
  ChartLine,
  Ellipsis,
  ExternalLink,
  Inbox,
  LayoutGrid,
  LogOut,
  Moon,
  Palette,
  Sun,
  Tags,
  Users,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { BandeauHorsLigne } from '@/components/feedback/BandeauHorsLigne'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Signature } from '@/components/marque/Signature'
import { BoutonIcone } from '@/components/ui/Bouton'
import { Modale } from '@/components/ui/Modale'
import { aRole, LIBELLES_ROLES, type Role } from '@/domain/roles'
import { useAuth } from '@/features/auth/useAuth'
import { useCompteurs } from '@/features/commandes-admin/requetes'
import { CentreEquipe } from '@/features/notifications/CentreEquipe'
import { useDemandesRdv } from '@/features/rendez-vous/requetes'
import { appliquerTheme, themeActuel, type Theme } from '@/features/theme/theme'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { useMaintenant } from '@/hooks/useMaintenant'
import { formaterJour, initiale, jourSalon } from '@/lib/format/date'

type Module = {
  vers: string
  libelle: string
  court?: string
  icone: ReactNode
  fin: boolean
  /** null = tout le personnel ; [] = administration et propriétaire seulement. */
  roles: Role[] | null
  compteur?: 'commandes' | 'rdv'
}

/** Modules de l'administration, groupés comme dans le menu. Chaque phase ajoute les siens. */
const GROUPES: { titre: string; modules: Module[] }[] = [
  {
    titre: 'Boutique',
    modules: [
      { vers: CHEMINS.admin, libelle: 'Aperçu', icone: <LayoutGrid />, fin: true, roles: null },
      {
        vers: '/admin/commandes',
        libelle: 'Commandes',
        icone: <Inbox />,
        fin: false,
        roles: ['ventes', 'logistique'],
        compteur: 'commandes',
      },
      {
        vers: '/admin/rendez-vous',
        libelle: 'Rendez-vous',
        court: 'Agenda',
        icone: <CalendarDays />,
        fin: false,
        roles: ['ventes'],
        compteur: 'rdv',
      },
      {
        vers: '/admin/clientes',
        libelle: 'Clientes',
        icone: <Users />,
        fin: false,
        roles: ['ventes'],
      },
    ],
  },
  {
    titre: 'Pilotage',
    modules: [
      { vers: '/admin/stock', libelle: 'Stock', icone: <Boxes />, fin: false, roles: ['stock'] },
      {
        vers: '/admin/analyse',
        libelle: 'Analyse',
        icone: <ChartLine />,
        fin: false,
        roles: ['ventes', 'stock'],
      },
      { vers: '/admin/catalogue', libelle: 'Catalogue', icone: <Tags />, fin: false, roles: [] },
    ],
  },
]

const SYSTEME: Module = {
  vers: CHEMINS.adminSystemeDesign,
  libelle: 'Système de design',
  icone: <Palette />,
  fin: false,
  roles: null,
}

function autorise(m: Module, role: Role | null) {
  return m.roles === null ? role !== null : aRole(role, m.roles)
}

/** Pastille de compteur : n'appelle la base que si le module est visible pour ce rôle. */
function PastilleCommandes({ actif }: { actif: boolean }) {
  const c = useCompteurs()
  return <Pastille valeur={c.data?.nouvelle ?? 0} actif={actif} />
}
function PastilleRdv({ actif }: { actif: boolean }) {
  const c = useDemandesRdv()
  return <Pastille valeur={c.data ?? 0} actif={actif} />
}
function Pastille({ valeur, actif }: { valeur: number; actif: boolean }) {
  if (valeur <= 0) return null
  return (
    <span
      className={cx(
        'chiffres ml-auto grid min-w-6 place-items-center rounded-full px-1.5 text-[12px] leading-6 font-semibold',
        actif ? 'bg-or text-sur-or' : 'bg-carte-3 text-encre-2',
      )}
    >
      <span className="sr-only">, </span>
      {valeur}
      <span className="sr-only"> à confirmer</span>
    </span>
  )
}

function LienModule({ m, onClick }: { m: Module; onClick?: () => void }) {
  return (
    <NavLink
      to={m.vers}
      end={m.fin}
      {...(onClick ? { onClick } : {})}
      className={({ isActive }) =>
        cx(
          'flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium no-underline transition-colors duration-200 [&>svg]:size-[18px] [&>svg]:shrink-0',
          isActive ? 'bg-encre text-fond' : 'text-encre-2 hover:bg-carte-2 hover:text-encre',
        )
      }
    >
      {({ isActive }) => (
        <>
          {m.icone}
          {m.libelle}
          {m.compteur === 'commandes' && <PastilleCommandes actif={isActive} />}
          {m.compteur === 'rdv' && <PastilleRdv actif={isActive} />}
        </>
      )}
    </NavLink>
  )
}

/** Bascule de thème en deux segments (soleil / lune), l'actif en pastille d'encre. */
function SegmentTheme() {
  const [theme, setTheme] = useState<Theme>(themeActuel)
  const choisir = (t: Theme) => {
    appliquerTheme(t)
    setTheme(t)
  }
  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className="inline-flex items-center gap-0.5 rounded-full bg-carte p-1 shadow-panneau"
    >
      {(
        [
          ['clair', <Sun key="s" />, 'Thème clair'],
          ['sombre', <Moon key="l" />, 'Thème sombre'],
        ] as const
      ).map(([t, icone, libelle]) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          aria-label={libelle}
          title={libelle}
          onClick={() => {
            choisir(t)
          }}
          className={cx(
            'grid size-9 place-items-center rounded-full transition-colors duration-200 [&_svg]:size-4',
            theme === t ? 'bg-encre text-fond' : 'text-encre-3 hover:text-encre',
          )}
        >
          {icone}
        </button>
      ))}
    </div>
  )
}

function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join('')
}

/** Gabarit de l'espace d'administration (rendu uniquement derrière RequireStaff). */
export function LayoutAdmin() {
  const auth = useAuth()
  const { notifier } = useNotifications()
  const naviguer = useNavigate()
  const location = useLocation()
  const [plus, setPlus] = useState(false)
  const maintenant = useMaintenant()
  const profil = auth.statut === 'connecte' ? auth.profil : null
  const role = profil?.role ?? null
  const groupes = GROUPES.map((g) => ({
    ...g,
    modules: g.modules.filter((m) => autorise(m, role)),
  })).filter((g) => g.modules.length > 0)
  const tous = groupes.flatMap((g) => g.modules)
  const onglets = tous.length > 5 ? tous.slice(0, 4) : tous
  const autres = tous.length > 5 ? tous.slice(4) : []
  const autreActif = autres.some((m) => location.pathname.startsWith(m.vers))

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
      <div className="mx-auto flex w-full max-w-[1560px] flex-1 gap-4 p-3 sm:p-4 lg:gap-7 lg:p-5">
        {/* Menu latéral (grand écran) */}
        <aside className="sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-[248px] shrink-0 flex-col gap-4 lg:flex">
          <nav
            aria-label="Modules"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[26px] bg-carte p-4 shadow-panneau"
          >
            <Link to={CHEMINS.admin} className="px-1 pt-1 pb-4 no-underline">
              <Signature />
              <span className="mt-1.5 block pl-[50px] text-[12px] text-encre-3">Espace équipe</span>
            </Link>
            <div className="h-px bg-filet" />
            {groupes.map((g) => (
              <div key={g.titre} className="mt-5 flex flex-col gap-1">
                <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.12em] text-encre-3 uppercase">
                  {g.titre}
                </p>
                {g.modules.map((m) => (
                  <LienModule key={m.vers} m={m} />
                ))}
              </div>
            ))}
            <div className="mt-auto flex flex-col gap-1 pt-6">
              <LienModule m={SYSTEME} />
              <a
                href={import.meta.env.BASE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium text-encre-2 no-underline hover:bg-carte-2 hover:text-encre [&>svg]:size-[18px]"
              >
                <ExternalLink />
                Voir le site
              </a>
            </div>
          </nav>
          {profil && (
            <div className="flex items-center gap-3 rounded-[22px] bg-carte p-3 shadow-panneau">
              <span
                aria-hidden="true"
                className="degrade-or grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-bold text-sur-or"
              >
                {initiales(profil.nom)}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-semibold">{profil.nom}</span>
                <span className="text-[12px] text-encre-3">{LIBELLES_ROLES[profil.role]}</span>
              </span>
              <BoutonIcone libelle="Se déconnecter" onClick={() => void deconnecter()}>
                <LogOut />
              </BoutonIcone>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Barre du haut */}
          <header className="sticky top-0 z-40 -mx-3 mb-2 flex items-center gap-3 bg-fond/85 px-3 py-2 backdrop-blur-md sm:-mx-4 sm:px-4 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
            <Link to={CHEMINS.admin} className="no-underline lg:hidden" aria-label="Aperçu">
              <Signature nom={false} />
            </Link>
            <p className="hidden items-center gap-2 rounded-full bg-carte px-4 py-2.5 text-sm font-medium shadow-panneau sm:inline-flex">
              <span aria-hidden="true" className="size-2 rounded-full bg-or" />
              {initiale(formaterJour(jourSalon(new Date(maintenant))))}
            </p>
            <div className="ml-auto flex items-center gap-2">
              {role !== null && <CentreEquipe role={role} />}
              <SegmentTheme />
              {profil && (
                <span className="flex items-center gap-2.5 rounded-full bg-carte py-1 pr-4 pl-1 shadow-panneau lg:hidden">
                  <span
                    aria-hidden="true"
                    className="degrade-or grid size-9 place-items-center rounded-full text-[12px] font-bold text-sur-or"
                  >
                    {initiales(profil.nom)}
                  </span>
                  <span className="hidden text-[13px] leading-tight sm:block">
                    <span className="block font-semibold">{profil.nom}</span>
                    <span className="text-encre-3">{LIBELLES_ROLES[profil.role]}</span>
                  </span>
                </span>
              )}
              <BoutonIcone
                libelle="Se déconnecter"
                className="lg:hidden"
                onClick={() => void deconnecter()}
              >
                <LogOut />
              </BoutonIcone>
            </div>
          </header>
          <main id="contenu" className="flex-1 pt-4 pb-28 lg:pt-6 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Barre d'onglets (téléphone et tablette) */}
      <nav
        aria-label="Modules"
        className="fixed inset-x-3 bottom-3 z-40 rounded-[24px] bg-carte/95 p-1.5 shadow-flottant backdrop-blur-md lg:hidden"
      >
        <ul className="flex items-stretch justify-around gap-1">
          {onglets.map((m) => (
            <li key={m.vers} className="min-w-0 flex-1">
              <NavLink
                to={m.vers}
                end={m.fin}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] px-1 text-[11px] font-medium no-underline transition-colors [&>svg]:size-5',
                    isActive ? 'bg-encre text-fond' : 'text-encre-2 hover:bg-carte-2',
                  )
                }
              >
                {m.icone}
                <span className="max-w-full truncate">{m.court ?? m.libelle}</span>
              </NavLink>
            </li>
          ))}
          {autres.length > 0 && (
            <li className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  setPlus(true)
                }}
                className={cx(
                  'flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-[18px] px-1 text-[11px] font-medium transition-colors [&>svg]:size-5',
                  autreActif ? 'bg-encre text-fond' : 'text-encre-2 hover:bg-carte-2',
                )}
              >
                <Ellipsis />
                Plus
              </button>
            </li>
          )}
        </ul>
      </nav>
      <Modale
        ouverte={plus}
        forme="tiroir"
        onFermer={() => {
          setPlus(false)
        }}
        titre="Tous les modules"
      >
        <div className="flex flex-col gap-1">
          {[...autres, SYSTEME].map((m) => (
            <LienModule
              key={m.vers}
              m={m}
              onClick={() => {
                setPlus(false)
              }}
            />
          ))}
          <a
            href={import.meta.env.BASE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium text-encre-2 no-underline hover:bg-carte-2 [&>svg]:size-[18px]"
          >
            <ExternalLink />
            Voir le site
          </a>
        </div>
      </Modale>
    </div>
  )
}
