import { Interrupteur } from '@/components/ui/Champs'
import { cx } from '@/lib/cx'
import { jouer, vibrer } from './sons'
import { useReglages } from './useSonsDuSite'

/** Réglages du site : sons et vibrations (gardés sur cet appareil). */
export function ReglagesSite({ className }: { className?: string }) {
  const r = useReglages()
  return (
    <fieldset className={cx('flex flex-col gap-1', className)}>
      <legend className="mb-1 text-[13px] font-semibold tracking-[0.08em] text-encre-3 uppercase">
        Réglages
      </legend>
      <Interrupteur
        libelle="Sons du site"
        checked={r.sons}
        onChange={(e) => {
          r.changer({ sons: e.target.checked })
          if (e.target.checked) jouer('bascule')
        }}
      />
      <Interrupteur
        libelle="Vibrations (téléphone)"
        checked={r.vibrations}
        onChange={(e) => {
          r.changer({ vibrations: e.target.checked })
          if (e.target.checked) vibrer(20)
        }}
      />
    </fieldset>
  )
}
