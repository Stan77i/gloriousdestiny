import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { CompteARebours } from '@/components/produit/CompteARebours'
import type { Produit } from '@/services/catalogue.service'
import { prochaineFin } from './offres'

const CLE = 'gd-barre-offre-fermee'

function dejaFermee(fin: string): boolean {
  try {
    return sessionStorage.getItem(CLE) === fin
  } catch {
    return false
  }
}

/**
 * Petite barre fixe en bas d'écran : rappelle l'offre réelle qui finit le plus tôt, avec le
 * même compte à rebours que la section. Elle n'apparaît qu'après le premier écran, s'efface
 * quand la section des offres est visible, et se ferme (pour la session).
 */
export function BarreOffre({
  produits,
  onTermine,
}: {
  produits: Produit[] | undefined
  onTermine: () => void
}) {
  const offre = prochaineFin(produits)
  const [fermee, setFermee] = useState(false)
  const [apresPremierEcran, setApresPremierEcran] = useState(false)
  const [sectionVisible, setSectionVisible] = useState(false)

  useEffect(() => {
    const f = () => {
      setApresPremierEcran(window.scrollY > window.innerHeight * 0.8)
    }
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => {
      window.removeEventListener('scroll', f)
    }
  }, [])
  useEffect(() => {
    const section = document.getElementById('offres')
    if (!section || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver((e) => {
      setSectionVisible(e.some((x) => x.isIntersecting))
    })
    obs.observe(section)
    return () => {
      obs.disconnect()
    }
  }, [offre?.fin])

  if (!offre || fermee || dejaFermee(offre.fin)) return null
  const montree = apresPremierEcran && !sectionVisible
  return (
    <aside
      aria-label="Offre en cours"
      className={
        'zone-nuit fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl items-center gap-3 rounded-[22px] bg-fond/95 px-4 py-2.5 text-encre shadow-flottant backdrop-blur-md transition-[opacity,transform] duration-500 ease-(--ease-sortie) sm:bottom-5 sm:px-5 ' +
        (montree ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0')
      }
    >
      <a
        href="#offres"
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 no-underline"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold tracking-[0.14em] text-or uppercase">
            {offre.libelle ?? 'Offre spéciale'} · −{offre.reduction} %
          </span>
          <span className="block truncate text-[14px] font-semibold">{offre.nom}</span>
        </span>
        <CompteARebours fin={offre.fin} compact onTermine={onTermine} />
      </a>
      <button
        type="button"
        aria-label="Fermer l’offre"
        onClick={() => {
          setFermee(true)
          try {
            sessionStorage.setItem(CLE, offre.fin)
          } catch {
            // Stockage indisponible : la barre reste fermée jusqu'au rechargement.
          }
        }}
        className="grid size-10 shrink-0 place-items-center rounded-full text-encre-2 hover:bg-carte [&_svg]:size-4"
      >
        <X aria-hidden="true" />
      </button>
    </aside>
  )
}
