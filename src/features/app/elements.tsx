import { useSyncExternalStore, type ReactNode } from 'react'
import { ArrowLeft, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { appliquerPreference, themeActuel } from '@/features/theme/theme'
import { cx } from '@/lib/cx'

/** Rond de 44 px sur carte, contour interne fin : retour, thème, favori. */
export const ROND =
  'grid size-11 shrink-0 place-items-center rounded-full bg-carte text-encre shadow-[inset_0_0_0_1px_var(--color-filet-fort)] transition-transform duration-200 active:scale-90 [&_svg]:size-5'

/** Retour à l'écran précédent (ou à l'accueil si l'application vient d'être ouverte ici). */
export function BoutonRetour({ vers }: { vers?: string }) {
  const naviguer = useNavigate()
  return (
    <button
      type="button"
      aria-label="Retour"
      className={ROND}
      onClick={() => {
        if (vers) void naviguer(vers)
        else if (window.history.length > 1) void naviguer(-1)
        else void naviguer(CHEMINS.accueil)
      }}
    >
      <ArrowLeft aria-hidden="true" strokeWidth={1.8} />
    </button>
  )
}

function abonnerTheme(f: () => void) {
  window.addEventListener('gd-theme', f)
  return () => {
    window.removeEventListener('gd-theme', f)
  }
}

/** Lune ↔ soleil : le même bouton passe en sombre et revient en clair. */
export function BoutonTheme() {
  const theme = useSyncExternalStore(abonnerTheme, themeActuel, () => 'clair' as const)
  const sombre = theme === 'sombre'
  return (
    <button
      type="button"
      aria-label={sombre ? 'Passer en thème clair' : 'Passer en thème sombre'}
      aria-pressed={sombre}
      className={ROND}
      onClick={() => {
        appliquerPreference(sombre ? 'clair' : 'sombre')
      }}
    >
      {sombre ? (
        <Sun aria-hidden="true" strokeWidth={1.6} />
      ) : (
        <Moon aria-hidden="true" strokeWidth={1.6} />
      )}
    </button>
  )
}

/** Titre d'écran : 34 px, serré ; à droite un détail (nombre d'articles…). */
export function TitreEcran({
  children,
  detail,
  retour = false,
}: {
  children: ReactNode
  detail?: ReactNode
  retour?: boolean
}) {
  return (
    <header className="flex items-center gap-3 pt-3 pb-4">
      {retour && <BoutonRetour />}
      <h1 className="min-w-0 flex-1 text-[34px] leading-[1.05] font-semibold tracking-[-0.035em] text-encre">
        {children}
      </h1>
      {detail && <p className="shrink-0 text-[14px] text-encre-3">{detail}</p>}
    </header>
  )
}

/**
 * Barre d'action fixée en bas (remplace la barre d'onglets) : un bouton de 56 px pleine largeur.
 */
export function BarreAction({ children }: { children: ReactNode }) {
  return (
    <div className="barre-action fixed inset-x-0 bottom-0 z-40 border-t border-filet bg-fond/95 px-4 pt-3 backdrop-blur-md">
      {children}
    </div>
  )
}

/** Pilule de filtre (40 px) : l'active en encre pleine. */
export function Pilule({
  actif,
  onClick,
  children,
}: {
  actif: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={cx(
        'min-h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-colors duration-200',
        actif
          ? 'bg-encre text-fond'
          : 'bg-carte text-encre shadow-[inset_0_0_0_1px_var(--color-filet)]',
      )}
    >
      {children}
    </button>
  )
}
