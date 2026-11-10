import { Minus, Plus } from 'lucide-react'

/** Sélecteur de quantité : boutons de 44 px, valeur annoncée aux lecteurs d'écran. */
export function SelecteurQuantite({
  valeur,
  onChange,
  min = 1,
  max,
  libelle,
}: {
  valeur: number
  onChange: (valeur: number) => void
  min?: number
  max: number
  libelle: string
}) {
  const bouton =
    'grid size-11 place-items-center rounded-full text-ivoire-2 transition-colors hover:bg-surface-3 hover:text-ivoire disabled:opacity-35 [&_svg]:size-4'
  return (
    <div
      role="group"
      aria-label={libelle}
      className="inline-flex items-center rounded-full border border-filet-fort bg-surface-2"
    >
      <button
        type="button"
        className={bouton}
        aria-label="Diminuer la quantité"
        disabled={valeur <= min}
        onClick={() => {
          onChange(valeur - 1)
        }}
      >
        <Minus />
      </button>
      <output aria-live="polite" className="chiffres w-8 text-center text-[15px] font-semibold">
        {valeur}
      </output>
      <button
        type="button"
        className={bouton}
        aria-label="Augmenter la quantité"
        disabled={valeur >= max}
        onClick={() => {
          onChange(valeur + 1)
        }}
      >
        <Plus />
      </button>
    </div>
  )
}
