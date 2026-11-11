import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { GAMME } from '@/features/catalogue/gamme'
import { PHOTO_LA_GAMME, visuelProduit } from '@/features/catalogue/visuels'
import { useAEcran } from '@/hooks/useAEcran'
import { useMouvementReduit } from '@/hooks/useMouvementReduit'
import { cx } from '@/lib/cx'

/**
 * Carrousel du premier écran : les gammes de la maison, une par diapositive.
 * Transition « rideau » : la nouvelle photo se dévoile de droite à gauche derrière un filet
 * d'or, puis s'approche lentement (zoom doux). Barres de progression par diapositive,
 * bouton pause (WCAG 2.2.2), flèches, glissement au doigt, touches ← →.
 * Pause automatique au survol, au focus, hors écran et onglet caché. Mouvement réduit :
 * aucun défilement automatique, simple fondu entre les photos.
 */

type Diapo = {
  cle: string
  univers: string
  titre: string
  vers: string
  src: string
  srcSet?: string
  alt: string
  position?: string
}

function diapos(): Diapo[] {
  const photo = (slug: string) => GAMME.find((p) => p.slug === slug)?.photo
  const liste: (Diapo | null | undefined)[] = [
    ((p) =>
      p && {
        cle: 'pose',
        univers: 'Pose invisible',
        titre: 'Lace Melting Spray',
        vers: CHEMINS.produit('lace-melting-spray'),
        src: p.grande,
        srcSet: `${p.petite} 800w, ${p.grande} 1600w`,
        alt: p.alt,
        position: 'object-[50%_30%]',
      })(photo('lace-melting-spray')),
    ((p) =>
      p && {
        cle: 'perruques',
        univers: 'Perruques',
        titre: 'Pose, entretien, retrait',
        vers: CHEMINS.perruques,
        src: p.grande,
        srcSet: `${p.petite} 800w, ${p.grande} 1600w`,
        alt: p.alt,
        position: 'object-[30%_40%]',
      })(photo('lace-glue-remover-spray')),
    ((p) =>
      p && {
        cle: 'cils',
        univers: 'Cils',
        titre: 'Lash Extension Kit',
        vers: CHEMINS.cils,
        src: p.grande,
        srcSet: `${p.petite} 800w, ${p.grande} 1024w`,
        alt: p.alt,
      })(visuelProduit('lash-extension-kit').pleine),
    ((p) =>
      p && {
        cle: 'fixer',
        univers: 'Fixation',
        titre: 'Lace Glue',
        vers: CHEMINS.produit('lace-glue'),
        src: p.grande,
        srcSet: `${p.petite} 800w, ${p.grande} 1600w`,
        alt: p.alt,
        position: 'object-[40%_40%]',
      })(photo('lace-glue')),
    ((p) =>
      p && {
        cle: 'coiffage',
        univers: 'Coiffage',
        titre: 'Braid Gel',
        vers: CHEMINS.produit('braid-gel'),
        src: p.grande,
        srcSet: `${p.petite} 800w, ${p.grande} 1600w`,
        alt: p.alt,
        position: 'object-[50%_55%]',
      })(photo('braid-gel')),
    {
      cle: 'gamme',
      univers: 'Le coffret',
      titre: 'La gamme Glorious Destiny',
      vers: CHEMINS.produit('la-gamme'),
      src: PHOTO_LA_GAMME.grande,
      srcSet: `${PHOTO_LA_GAMME.petite} 1000w, ${PHOTO_LA_GAMME.grande} 2000w`,
      alt: PHOTO_LA_GAMME.alt,
      position: 'object-[50%_60%]',
    },
  ]
  return liste.filter((d): d is Diapo => !!d)
}

const DUREE_MS = 6000

function abonnerVisibilite(rappel: () => void) {
  document.addEventListener('visibilitychange', rappel)
  return () => {
    document.removeEventListener('visibilitychange', rappel)
  }
}
function usePageVisible(): boolean {
  return useSyncExternalStore(
    abonnerVisibilite,
    () => document.visibilityState === 'visible',
    () => true,
  )
}

export function CarrouselGammes({ className }: { className?: string }) {
  const [liste] = useState(diapos)
  const [actif, setActif] = useState(0)
  const [precedent, setPrecedent] = useState<number | null>(null)
  // Chaque passage (même vers la même diapositive) relance la barre de progression.
  const [tour, setTour] = useState(0)
  const [enPause, setEnPause] = useState(false)
  const [survol, setSurvol] = useState(false)
  const reduit = useMouvementReduit()
  const pageVisible = usePageVisible()
  const { ref, visible } = useAEcran<HTMLElement>()
  const depart = useRef<number | null>(null)
  const glisse = useRef(false)

  const aller = useCallback(
    (i: number) => {
      const n = liste.length
      const cible = ((i % n) + n) % n
      if (cible !== actif) setPrecedent(actif)
      setActif(cible)
      setTour((t) => t + 1)
    },
    [liste.length, actif],
  )

  // Retire la diapositive précédente une fois le rideau passé.
  useEffect(() => {
    if (precedent === null) return
    const id = window.setTimeout(() => {
      setPrecedent(null)
    }, 1300)
    return () => {
      window.clearTimeout(id)
    }
  }, [precedent, tour])

  const lecture = !reduit && !enPause && !survol && visible && pageVisible
  const d = liste[actif]
  if (!d) return null

  return (
    <section
      ref={ref}
      aria-roledescription="carrousel"
      aria-label="Nos gammes"
      className={cx('carrousel relative overflow-hidden rounded-panneau bg-encre', className)}
      onMouseEnter={() => {
        setSurvol(true)
      }}
      onMouseLeave={() => {
        setSurvol(false)
      }}
      onFocus={() => {
        setSurvol(true)
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setSurvol(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') aller(actif + 1)
        if (e.key === 'ArrowLeft') aller(actif - 1)
      }}
      onPointerDown={(e) => {
        depart.current = e.clientX
      }}
      onPointerUp={(e) => {
        if (depart.current === null) return
        const dx = e.clientX - depart.current
        depart.current = null
        glisse.current = Math.abs(dx) > 45
        if (glisse.current) aller(actif + (dx < 0 ? 1 : -1))
      }}
      onClickCapture={(e) => {
        // Un glissement n'ouvre pas le lien sous le doigt.
        if (glisse.current) {
          e.preventDefault()
          glisse.current = false
        }
      }}
    >
      {liste.map((s, i) => {
        const estActif = i === actif
        const estPrecedent = i === precedent
        return (
          <div
            key={s.cle}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${String(i + 1)} sur ${String(liste.length)} : ${s.univers}, ${s.titre}`}
            aria-hidden={!estActif}
            inert={!estActif}
            className={cx(
              'diapo absolute inset-0',
              estActif && (reduit ? 'diapo-fondu' : 'diapo-entre'),
              estPrecedent && 'diapo-sort',
              !estActif && !estPrecedent && 'invisible',
            )}
            // Relance l'entrée à chaque passage.
            {...(estActif ? { 'data-tour': tour } : {})}
          >
            <img
              key={estActif ? `${s.cle}-${String(tour)}` : s.cle}
              src={s.src}
              srcSet={s.srcSet}
              sizes="(min-width: 1024px) 45vw, 100vw"
              alt={s.alt}
              draggable={false}
              {...(i === 0 ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
              className={cx(
                'absolute inset-0 size-full object-cover select-none',
                estActif && !reduit && 'diapo-zoom',
                s.position,
              )}
            />
            {estActif && !reduit && (
              <span aria-hidden="true" key={tour} className="diapo-filet">
                <span />
              </span>
            )}
          </div>
        )
      })}

      {/* Voiles haut et bas : lisibilité des barres et des commandes sur une photo claire. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(180deg,rgb(15_15_14/0.42),transparent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-40 bg-[linear-gradient(180deg,transparent,rgb(15_15_14/0.55))]"
      />

      {/* Progression : une barre par diapositive, cliquable. */}
      <div
        className="absolute inset-x-4 top-4 z-10 flex gap-1.5 sm:inset-x-5 sm:top-5"
        role="tablist"
        aria-label="Choisir une gamme"
      >
        {liste.map((s, i) => (
          <button
            key={s.cle}
            type="button"
            role="tab"
            aria-selected={i === actif}
            aria-label={`${s.univers} : ${s.titre}`}
            onClick={() => {
              aller(i)
            }}
            className="group relative h-6 flex-1 cursor-pointer"
          >
            <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-[#fffaf0]/35 transition-colors group-hover:bg-[#fffaf0]/55">
              <span
                key={i === actif ? tour : 'fixe'}
                className={cx(
                  'absolute inset-0 origin-left rounded-full bg-or',
                  i < actif && 'scale-x-100',
                  i > actif && 'scale-x-0',
                  i === actif && (reduit ? 'scale-x-100' : 'carrousel-progression'),
                )}
                style={
                  i === actif && !reduit
                    ? {
                        animationDuration: `${String(DUREE_MS)}ms`,
                        animationPlayState: lecture ? 'running' : 'paused',
                      }
                    : undefined
                }
                onAnimationEnd={
                  i === actif && !reduit
                    ? () => {
                        aller(actif + 1)
                      }
                    : undefined
                }
              />
            </span>
          </button>
        ))}
      </div>

      {/* Légende : l'univers et le produit, un lien direct. */}
      <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-2 sm:inset-x-4 sm:bottom-4">
        <Link
          key={`legende-${String(tour)}`}
          to={d.vers}
          className="carrousel-legende flex min-w-0 flex-1 items-center justify-between gap-3 rounded-full bg-carte/90 py-1.5 pr-1.5 pl-5 no-underline shadow-flottant backdrop-blur-md"
        >
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-semibold tracking-[0.12em] text-or-texte uppercase">
              {d.univers}
            </span>
            <span className="block truncate text-[15px] font-semibold text-encre">{d.titre}</span>
          </span>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-encre text-fond [&_svg]:size-4">
            <ArrowRight aria-hidden="true" />
          </span>
        </Link>
        <div className="flex shrink-0 gap-1 rounded-full bg-carte/90 p-1 shadow-flottant backdrop-blur-md [&_svg]:size-4">
          <button
            type="button"
            aria-label="Gamme précédente"
            onClick={() => {
              aller(actif - 1)
            }}
            className="hidden size-10 place-items-center rounded-full text-encre hover:bg-carte-2 sm:grid"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          {!reduit && (
            <button
              type="button"
              aria-label={enPause ? 'Reprendre le défilement' : 'Mettre le défilement en pause'}
              aria-pressed={enPause}
              onClick={() => {
                setEnPause((x) => !x)
              }}
              className="grid size-10 place-items-center rounded-full text-encre hover:bg-carte-2"
            >
              {enPause ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </button>
          )}
          <button
            type="button"
            aria-label="Gamme suivante"
            onClick={() => {
              aller(actif + 1)
            }}
            className="grid size-10 place-items-center rounded-full text-encre hover:bg-carte-2"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live={lecture ? 'off' : 'polite'}>
        {`${d.univers} : ${d.titre}`}
      </p>
    </section>
  )
}
