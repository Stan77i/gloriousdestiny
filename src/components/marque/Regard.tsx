import { useEffect, useRef } from 'react'
import { useAEcran } from '@/hooks/useAEcran'
import { cx } from '@/lib/cx'

/**
 * Regard : un œil au fil d'or, signature des cils.
 * 1. À l'apparition, la paupière se trace et les cils poussent un à un, plus longs vers
 *    l'extérieur (effet cat eye).
 * 2. Puis il vit : la paupière supérieure descend et se replie sur la paupière inférieure
 *    (les cils basculent vers le bas, comme un vrai clignement), l'iris s'efface, et tout se
 *    rouvre plus lentement qu'il ne s'est fermé. Intervalles irréguliers (2,4 à 6,5 s), parfois
 *    un double clignement, et de temps en temps le regard glisse sur le côté puis revient.
 * Hors écran ou onglet caché : rien ne tourne. Mouvement réduit : regard fixe, déjà dessiné.
 */

// Cils : point d'ancrage sur la paupière (x, y), direction (degrés), longueur.
const CILS = Array.from({ length: 21 }, (_, i) => {
  const t = i / 20
  // Paupière supérieure : courbe de (40, 120) à (360, 112), sommet vers (200, 52).
  const x = 40 + t * 320
  const y = 120 - Math.sin(t * Math.PI) * 66 - t * 8
  const angle = -150 + t * 120
  const longueur = 26 + t * 34 + Math.sin(t * Math.PI) * 10
  return { x, y, angle, longueur, delai: 0.55 + i * 0.045 }
})

// Pli de la paupière : y ≈ 118 aux coins. Fermée, la paupière supérieure se retourne sur
// l'inférieure (sommet de 52 à ≈ 160) : scaleY négatif autour de ce pli.
const FERMEE = 'scaleY(-0.62)'

export function Regard({ className }: { className?: string }) {
  const { ref, visible } = useAEcran<SVGSVGElement>()
  const haut = useRef<SVGGElement>(null)
  const iris = useRef<SVGGElement>(null)

  useEffect(() => {
    const paupiere = haut.current
    const oeil = iris.current
    if (!visible || !paupiere || !oeil) return
    // Sans Web Animations (navigateur ancien, environnement de test) : regard fixe.
    if (typeof paupiere.animate !== 'function' || typeof paupiere.getAnimations !== 'function')
      return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let minuteur: number | undefined
    let compte = 0
    let arrete = false

    const cligner = (ensuite: () => void) => {
      // Fermeture rapide (≈ 110 ms), très court maintien, ouverture plus lente (≈ 210 ms).
      const options = { duration: 360, easing: 'linear' }
      paupiere.animate(
        [
          { transform: 'scaleY(1)', easing: 'cubic-bezier(0.55, 0, 0.9, 0.4)' },
          { transform: FERMEE, offset: 0.3 },
          { transform: FERMEE, offset: 0.42, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
          { transform: 'scaleY(1)' },
        ],
        options,
      )
      const a = oeil.animate(
        [
          { transform: 'scaleY(1)' },
          { transform: 'scaleY(0.04)', offset: 0.22 },
          { transform: 'scaleY(0.04)', offset: 0.48 },
          { transform: 'scaleY(1)' },
        ],
        options,
      )
      a.onfinish = ensuite
    }

    const regarder = () => {
      // Le regard glisse légèrement, s'attarde, puis revient au centre.
      const dx = Math.random() < 0.5 ? -9 : 8
      oeil.animate(
        [
          { translate: '0 0' },
          { translate: `${String(dx)}px 1px`, offset: 0.2 },
          { translate: `${String(dx)}px 1px`, offset: 0.75 },
          { translate: '0 0' },
        ],
        { duration: 2600, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' },
      )
    }

    const suivant = () => {
      if (arrete) return
      const attente = 2400 + Math.random() * 4100
      minuteur = window.setTimeout(() => {
        compte += 1
        cligner(() => {
          // Un clignement sur six est double, comme souvent dans la réalité.
          if (Math.random() < 0.17) {
            minuteur = window.setTimeout(() => {
              cligner(suivant)
            }, 140)
          } else {
            if (compte % 3 === 0) regarder()
            suivant()
          }
        })
      }, attente)
    }
    // Premier clignement après le dessin des cils.
    minuteur = window.setTimeout(suivant, 1600)
    return () => {
      arrete = true
      window.clearTimeout(minuteur)
      paupiere.getAnimations().forEach((x) => {
        x.cancel()
      })
      oeil.getAnimations().forEach((x) => {
        x.cancel()
      })
    }
  }, [visible])

  return (
    <svg ref={ref} aria-hidden="true" viewBox="0 0 400 220" className={cx('regard', className)}>
      <g fill="none" stroke="var(--gd-or)" strokeLinecap="round">
        {/* Paupière inférieure : fixe. */}
        <path
          d="M52 124 C 130 178, 290 176, 352 116"
          strokeWidth={1.4}
          opacity={0.7}
          pathLength={1}
          className="regard-trace"
          style={{ animationDelay: '0.2s' }}
        />
        {/* Iris : s'efface au clignement, glisse quand le regard se déplace. */}
        <g ref={iris} className="regard-iris-groupe">
          <circle
            cx={200}
            cy={112}
            r={34}
            strokeWidth={1.4}
            opacity={0.75}
            className="regard-iris"
          />
          <circle
            cx={200}
            cy={112}
            r={13}
            fill="var(--gd-or)"
            stroke="none"
            className="regard-iris"
          />
          <circle
            cx={208}
            cy={104}
            r={4}
            fill="var(--gd-or-clair)"
            stroke="none"
            className="regard-iris"
          />
        </g>
        {/* Paupière supérieure et cils : se referment ensemble. */}
        <g ref={haut} className="regard-haut">
          <path
            d="M40 120 C 110 40, 290 30, 360 112"
            strokeWidth={4}
            pathLength={1}
            className="regard-trace"
          />
          {CILS.map((c) => (
            <line
              key={c.x}
              x1={c.x}
              y1={c.y}
              x2={c.x + Math.cos((c.angle * Math.PI) / 180) * c.longueur}
              y2={c.y + Math.sin((c.angle * Math.PI) / 180) * c.longueur}
              strokeWidth={1.6}
              pathLength={1}
              className="regard-cil"
              style={{ animationDelay: `${c.delai.toFixed(2)}s` }}
            />
          ))}
        </g>
      </g>
    </svg>
  )
}
