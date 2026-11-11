import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cx } from '@/lib/cx'
import { appliquerPreference, lirePreference, type PreferenceTheme } from './theme'

const CHOIX: { id: PreferenceTheme; libelle: string; icone: typeof Sun }[] = [
  { id: 'systeme', libelle: 'Thème de l’appareil', icone: Monitor },
  { id: 'clair', libelle: 'Thème clair', icone: Sun },
  { id: 'sombre', libelle: 'Thème sombre', icone: Moon },
]

/** Choix du thème en trois segments : appareil, clair, sombre. L'actif en pastille d'encre. */
export function SelecteurTheme({ className }: { className?: string }) {
  const [pref, setPref] = useState<PreferenceTheme>(lirePreference)
  useEffect(() => {
    const relire = () => {
      setPref(lirePreference())
    }
    window.addEventListener('gd-theme', relire)
    return () => {
      window.removeEventListener('gd-theme', relire)
    }
  }, [])
  return (
    <div
      role="radiogroup"
      aria-label="Thème d’affichage"
      className={cx(
        'inline-flex items-center gap-0.5 rounded-full bg-carte p-1 shadow-panneau',
        className,
      )}
    >
      {CHOIX.map(({ id, libelle, icone: Icone }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={pref === id}
          aria-label={libelle}
          title={libelle}
          onClick={() => {
            appliquerPreference(id)
            setPref(id)
          }}
          className={cx(
            'grid size-9 place-items-center rounded-full transition-colors duration-200 [&_svg]:size-4',
            pref === id ? 'bg-encre text-fond' : 'text-encre-3 hover:text-encre',
          )}
        >
          <Icone aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
