import { useEffect, useState, type CSSProperties } from 'react'
import { useAEcran } from '@/hooks/useAEcran'
import { useMouvementReduit } from '@/hooks/useMouvementReduit'
import { cx } from '@/lib/cx'
import { ETAPES, TEINTES } from './etapes'

/** Angles des cinq médaillons sur le demi-cercle (degrés), de gauche à droite. */
const ANGLES = [170, 130, 90, 50, 10]
const CX = 180
const CY = 196
const R = 146
const POINTS = ANGLES.map((a) => {
  const r = (a * Math.PI) / 180
  return { x: CX + R * Math.cos(r), y: CY - R * Math.sin(r) }
})
const ARC = `M ${String(POINTS[0]?.x)} ${String(POINTS[0]?.y)} A ${String(R)} ${String(R)} 0 0 1 ${String(POINTS[4]?.x)} ${String(POINTS[4]?.y)}`

/**
 * Les cinq étapes d'une prestation en demi-cercle : cinq médaillons de couleur (rose, bleu,
 * violet, pêche, champagne) reliés par un arc d'or. À l'apparition, ils éclosent l'un après
 * l'autre ; puis l'étape active avance seule (l'arc d'or progresse jusqu'à elle) et sa
 * légende s'affiche au centre. Toucher un médaillon le montre et arrête le défilement.
 * Mouvement réduit : tout est affiché d'emblée, sans défilement.
 */
export function ArcEtapes({ slug, photo }: { slug: string; photo?: string | null }) {
  const etapes = ETAPES[slug] ?? []
  const { ref, visible } = useAEcran<HTMLDivElement>()
  const reduit = useMouvementReduit()
  const [vu, setVu] = useState(false)
  const setVuDirect = () => {
    queueMicrotask(() => {
      setVu(true)
    })
  }
  const [actif, setActif] = useState(0)
  const [choisi, setChoisi] = useState(false)

  // Éclosion à la première apparition à l'écran (pas au chargement de la page).
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVuDirect()
      return
    }
    const obs = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          setVu(true)
          obs.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
    }
  }, [ref])

  useEffect(() => {
    if (!vu || !visible || reduit || choisi || etapes.length === 0) return
    const t = window.setInterval(() => {
      setActif((n) => (n + 1) % etapes.length)
    }, 2600)
    return () => {
      window.clearInterval(t)
    }
  }, [vu, visible, reduit, choisi, etapes.length])

  const etape = etapes[actif]
  if (!etape) return null

  return (
    <div ref={ref} className={cx('arc-etapes relative mx-auto w-full max-w-[400px]', vu && 'vu')}>
      <div className="relative aspect-[360/226]">
        <svg viewBox="0 0 360 226" aria-hidden="true" className="absolute inset-0 size-full">
          <path
            d={ARC}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeDasharray="2 6"
            strokeLinecap="round"
            className="text-or/50"
          />
          <path
            d={ARC}
            pathLength={100}
            fill="none"
            strokeWidth={2.4}
            strokeLinecap="round"
            className="arc-progres stroke-or"
            style={{ strokeDasharray: 100, strokeDashoffset: 100 - actif * 25 }}
          />
        </svg>

        {POINTS.map((pt, n) => {
          const e = etapes[n]
          const t = TEINTES[n]
          if (!e || !t) return null
          const estActif = n === actif
          return (
            <button
              key={e.nom}
              type="button"
              aria-pressed={estActif}
              aria-label={`Étape ${String(n + 1)} : ${e.nom}`}
              onClick={() => {
                setActif(n)
                setChoisi(true)
              }}
              style={
                {
                  left: `${String((pt.x / 360) * 100)}%`,
                  top: `${String((pt.y / 226) * 100)}%`,
                  '--i': n,
                  '--halo': t.halo,
                  backgroundColor: t.fond,
                  color: t.trait,
                } as CSSProperties
              }
              className={cx(
                'arc-medaillon absolute grid aspect-square w-[18%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ring-[3px] ring-carte [&_svg]:size-[46%]',
                estActif && 'actif',
              )}
            >
              {e.icone}
              <span
                aria-hidden="true"
                className="chiffres absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-encre text-[10px] font-bold text-fond"
              >
                {n + 1}
              </span>
            </button>
          )
        })}

        {/* Légende de l'étape active, au creux de l'arc. */}
        <div className="absolute inset-x-[19%] bottom-0 flex flex-col items-center text-center">
          {photo && (
            <img
              src={photo}
              alt=""
              className="mb-2 size-14 rounded-full object-cover ring-2 ring-or/60"
            />
          )}
          <div key={actif} className="apparait-fondu" aria-live="polite">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-or-texte uppercase">
              Étape {actif + 1} sur {etapes.length}
            </p>
            <p className="mt-0.5 text-[20px] leading-tight font-semibold text-encre">{etape.nom}</p>
            <p className="mt-1 text-[13px] leading-snug text-encre-2">{etape.texte}</p>
          </div>
        </div>
      </div>
      <ol className="sr-only">
        {etapes.map((e) => (
          <li key={e.nom}>
            {e.nom} : {e.texte}
          </li>
        ))}
      </ol>
    </div>
  )
}
