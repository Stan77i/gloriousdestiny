import { useEffect, useState } from 'react'
import { useMouvementReduit } from '@/hooks/useMouvementReduit'
import { cx } from '@/lib/cx'
import { positionDansCadre } from './fond'
import type { Grille } from './projection'

/** Une escale du guide : un point de la carte et ce qu'il y dit (tiré des données réelles). */
export type Escale = { cle: string; p: { x: number; y: number }; parole: string }

/**
 * Le guide de la carte : un petit flacon de colle doré, avec des yeux, qui saute d'une
 * destination à l'autre et raconte ce qui s'y passe, comme dans une conversation. Il arrive
 * dans les deux secondes, change d'escale toutes les 5,5 s, et rejoint aussitôt l'endroit que
 * la cliente touche (`focus`). Tout ce qu'il dit vient des données de la carte.
 * Mouvement réduit : il se pose sans sauter et ne change d'escale qu'au toucher.
 */
export function GuideCarte({
  g,
  escales,
  focus,
  actif,
}: {
  g: Grille
  escales: Escale[]
  focus: string | null
  actif: boolean
}) {
  const reduit = useMouvementReduit()
  const [rang, setRang] = useState(-1)
  const [ecrit, setEcrit] = useState(false)
  const cles = escales.map((e) => e.cle).join('|')

  // Nouvelle vue : le guide repart de la première escale, après un court instant.
  useEffect(() => {
    if (!actif || escales.length === 0) return
    const t = window.setTimeout(() => {
      setRang(0)
    }, 1200)
    return () => {
      window.clearTimeout(t)
      setRang(-1)
    }
  }, [cles, actif, escales.length])

  // Toucher un repère : le guide y saute tout de suite.
  useEffect(() => {
    if (focus === null) return
    const i = escales.findIndex((e) => e.cle === focus)
    if (i < 0) return
    const t = window.setTimeout(() => {
      setRang(i)
    }, 0)
    return () => {
      window.clearTimeout(t)
    }
  }, [focus, escales])

  // Puis il voyage seul, tant que la carte est à l'écran.
  useEffect(() => {
    if (!actif || reduit || rang < 0 || escales.length < 2) return
    const t = window.setTimeout(() => {
      setRang((r) => (r + 1) % escales.length)
    }, 5500)
    return () => {
      window.clearTimeout(t)
    }
  }, [rang, actif, reduit, escales.length])

  // À chaque escale : « en train d'écrire… », puis la phrase.
  useEffect(() => {
    if (rang < 0) return
    const a = window.setTimeout(() => {
      setEcrit(false)
    }, 0)
    const b = window.setTimeout(
      () => {
        setEcrit(true)
      },
      reduit ? 0 : 750,
    )
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [rang, reduit])

  const e = rang >= 0 ? escales[rang] : undefined
  if (!e) return null
  const x = (e.p.x + 0.5) / (g.colonnes + 1)
  const y = (e.p.y + 0.5) / (g.lignes + 1)
  const dessous = y < 0.32

  return (
    <div
      aria-hidden="true"
      className="guide-carte pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full"
      style={positionDansCadre(g, e.p)}
    >
      <div key={e.cle} className="guide-saut relative">
        {/* La bulle : au-dessus du guide (ou dessous près du bord haut), jamais hors du cadre. */}
        <div
          className={cx(
            'guide-bulle absolute w-max max-w-[min(240px,62vw)] rounded-[16px] bg-carte px-3 py-2 text-[13px] leading-snug font-medium text-encre shadow-flottant ring-1 ring-or/30',
            dessous ? 'top-full mt-8' : 'bottom-full mb-2',
            x < 0.3 ? 'left-0' : x > 0.7 ? 'right-0' : 'left-1/2 -translate-x-1/2',
            x < 0.3 ? 'rounded-bl-[4px]' : x > 0.7 ? 'rounded-br-[4px]' : '',
          )}
        >
          {ecrit ? (
            <span className="apparait-fondu block">{e.parole}</span>
          ) : (
            <span className="flex gap-1 py-1">
              <span className="guide-point size-1.5 rounded-full bg-encre-3" />
              <span className="guide-point size-1.5 rounded-full bg-encre-3 [animation-delay:150ms]" />
              <span className="guide-point size-1.5 rounded-full bg-encre-3 [animation-delay:300ms]" />
            </span>
          )}
        </div>
        <Flacon />
      </div>
      {/* Phrase lue par les lecteurs d'écran, sans les animations. */}
      <span className="sr-only">{e.parole}</span>
    </div>
  )
}

/** Le guide : un flacon de colle doré qui cligne des yeux. */
function Flacon() {
  return (
    <svg viewBox="0 0 40 52" className="guide-flacon block h-11 w-auto drop-shadow-md">
      <ellipse cx={20} cy={50} rx={11} ry={2} fill="rgb(0 0 0 / 0.25)" />
      <path d="M15 4h10l2 9H13Z" fill="#d6a756" />
      <rect x={16.5} y={1} width={7} height={4} rx={1.5} fill="#b07a22" />
      <rect
        x={8}
        y={12}
        width={24}
        height={36}
        rx={9}
        fill="#fbf8f2"
        stroke="#d6a756"
        strokeWidth={1.5}
      />
      <rect x={8.8} y={30} width={22.4} height={9} fill="#17140f" />
      <path d="M11 34.5h18" stroke="#d6a756" strokeWidth={1} />
      <g className="guide-yeux">
        <ellipse cx={15.5} cy={22} rx={2} ry={2.6} fill="#17140f" />
        <ellipse cx={24.5} cy={22} rx={2} ry={2.6} fill="#17140f" />
        <circle cx={16.2} cy={21} r={0.7} fill="#fff" />
        <circle cx={25.2} cy={21} r={0.7} fill="#fff" />
      </g>
      <path
        d="M17 26.5q3 2.4 6 0"
        fill="none"
        stroke="#17140f"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <circle cx={12.5} cy={26} r={1.6} fill="#f2b8c6" opacity={0.8} />
      <circle cx={27.5} cy={26} r={1.6} fill="#f2b8c6" opacity={0.8} />
    </svg>
  )
}
