import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { BoutonIcone } from '@/components/ui/Bouton'
import { appliquerTheme, themeActuel, type Theme } from './theme'

/** Bascule clair / sombre. Le libellé annonce l'action, pas l'état. */
export function BoutonTheme({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(themeActuel)
  const suivant: Theme = theme === 'sombre' ? 'clair' : 'sombre'
  return (
    <BoutonIcone
      libelle={suivant === 'sombre' ? 'Passer en thème sombre' : 'Passer en thème clair'}
      {...(className ? { className } : {})}
      onClick={() => {
        appliquerTheme(suivant)
        setTheme(suivant)
      }}
    >
      {theme === 'sombre' ? <Sun /> : <Moon />}
    </BoutonIcone>
  )
}
