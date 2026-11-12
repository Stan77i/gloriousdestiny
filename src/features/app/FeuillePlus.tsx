import { useSyncExternalStore, type ReactNode } from 'react'
import { Activity, ChevronRight, MessageCircle, User } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Modale } from '@/components/ui/Modale'
import { usePrestations } from '@/features/catalogue/prestations'
import { useDisponibilites, useParametresPublics, useProduits } from '@/features/catalogue/requetes'
import { appliquerPreference, themeActuel } from '@/features/theme/theme'
import { lienWhatsApp } from '@/features/whatsapp/lienWhatsApp'
import { cx } from '@/lib/cx'
import { statutProduit } from './catalogueApp'

function Rangee({
  icone,
  teinte,
  libelle,
  detail,
  vers,
  href,
  onClick,
}: {
  icone: ReactNode
  teinte: string
  libelle: string
  detail?: string | undefined
  vers?: string
  href?: string | undefined
  onClick: () => void
}) {
  const contenu = (
    <>
      <span
        aria-hidden="true"
        className={`grid size-10 shrink-0 place-items-center rounded-full text-encre [&_svg]:size-[18px] ${teinte}`}
      >
        {icone}
      </span>
      <span className="min-w-0 flex-1 text-[16px] font-semibold text-encre">{libelle}</span>
      {detail ? (
        <span className="shrink-0 text-[13px] text-encre-3">{detail}</span>
      ) : (
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-encre-3" />
      )}
    </>
  )
  const classes =
    'flex min-h-14 w-full items-center gap-3.5 rounded-[18px] text-left no-underline active:bg-carte-2'
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={classes}>
        {contenu}
      </a>
    )
  return (
    <Link to={vers ?? CHEMINS.accueil} onClick={onClick} className={classes}>
      {contenu}
    </Link>
  )
}

function abonnerTheme(f: () => void) {
  window.addEventListener('gd-theme', f)
  return () => {
    window.removeEventListener('gd-theme', f)
  }
}

/** Thème en deux segments : Clair / Sombre. */
function ThemeSegments() {
  const theme = useSyncExternalStore(abonnerTheme, themeActuel, () => 'clair' as const)
  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className="flex rounded-full p-1 shadow-[inset_0_0_0_1px_var(--color-filet-fort)]"
    >
      {(['clair', 'sombre'] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => {
            appliquerPreference(t)
          }}
          className={cx(
            'min-h-10 rounded-full px-5 text-[15px] font-semibold capitalize transition-colors',
            theme === t ? 'bg-encre text-fond' : 'text-encre-2',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/** Feuille « Plus » (maquette) : compte, suivi, perruques, salon, WhatsApp, thème. */
export function FeuillePlus({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  const parametres = useParametresPublics()
  const prestations = usePrestations()
  const produits = useProduits()
  const perruques = (produits.data ?? []).filter((p) => p.type === 'perruque')
  const dispo = useDisponibilites(perruques.flatMap((p) => p.variantes.map((v) => v.id)))
  const rupture =
    produits.data !== undefined &&
    (perruques.length === 0 ||
      (dispo.data !== undefined &&
        perruques.every((p) => statutProduit(p, dispo.data) === 'epuise')))
  const whatsapp = lienWhatsApp(parametres.data, 'Bonjour Glorious Destiny,')?.url

  return (
    <Modale ouverte={ouverte} onFermer={onFermer} titre="Plus" forme="feuille" sansEntete>
      <div className="flex flex-col gap-1 px-2 pb-2">
        <span aria-hidden="true" className="mx-auto mb-3 h-[5px] w-10 rounded-full bg-filet-fort" />
        <Rangee
          icone={<User strokeWidth={1.6} />}
          teinte="bg-or-doux"
          libelle="Mon compte"
          detail="Sur ce téléphone"
          vers={CHEMINS.compte}
          onClick={onFermer}
        />
        <Rangee
          icone={<Activity strokeWidth={1.6} />}
          teinte="bg-sauge"
          libelle="Suivre ma commande"
          vers={CHEMINS.suivi}
          onClick={onFermer}
        />
        <Rangee
          icone={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M6 21V11a6 6 0 0 1 12 0v10M9 21V12a3 3 0 0 1 6 0v9" />
            </svg>
          }
          teinte="bg-rose"
          libelle="Perruques"
          detail={rupture ? 'Rupture' : undefined}
          vers={CHEMINS.perruques}
          onClick={onFermer}
        />
        <Rangee
          icone={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <ellipse cx={12} cy={9} rx={5} ry={6} />
              <path d="M12 15v6M9 21h6" />
            </svg>
          }
          teinte="bg-sable"
          libelle="Le salon"
          detail={prestations.data ? `${String(prestations.data.length)} prestations` : undefined}
          vers={CHEMINS.prestations}
          onClick={onFermer}
        />
        <Rangee
          icone={<MessageCircle strokeWidth={1.6} />}
          teinte="bg-carte-2"
          libelle="Écrire sur WhatsApp"
          href={whatsapp}
          vers={CHEMINS.contact}
          onClick={onFermer}
        />
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-filet pt-4">
          <span className="text-[16px] font-semibold text-encre">Thème</span>
          <ThemeSegments />
        </div>
      </div>
    </Modale>
  )
}
