import { Meches } from '@/components/marque/Meches'
import { cx } from '@/lib/cx'
import type { Prestation } from '@/services/catalogue.service'
import { universPrestation } from './univers'

/**
 * Cadre photo d'une prestation, format portrait 4:5. Sans photo déposée (en attendant les
 * visuels), un fond propre à l'univers de la prestation, traversé de mèches au fil d'or.
 */
export function PhotoPrestation({
  prestation,
  className,
  tailles = '(min-width: 1024px) 45vw, 100vw',
  fixe = false,
}: {
  prestation: Prestation
  className?: string
  tailles?: string
  /** Sans révélation au défilement (vignettes de l'accueil). */
  fixe?: boolean
}) {
  const u = universPrestation(prestation.slug)
  return (
    <div
      className={cx(
        'presta-cadre relative isolate aspect-[4/5] overflow-hidden bg-encre',
        className,
      )}
    >
      {prestation.photo ? (
        <img
          src={prestation.photo}
          sizes={tailles}
          alt={`${prestation.nom} chez Glorious Destiny`}
          loading="lazy"
          decoding="async"
          className={cx('presta-visuel size-full object-cover', fixe && 'presta-visuel-fixe')}
        />
      ) : (
        <div
          aria-hidden="true"
          className={cx('presta-visuel size-full', fixe && 'presta-visuel-fixe')}
          style={{ background: u.fond }}
        >
          <Meches
            ton={u.nuit ? 'or' : 'clair'}
            className={cx(
              'absolute inset-y-0 left-1/2 h-full w-[70%] -translate-x-1/2',
              u.nuit ? 'opacity-80' : 'opacity-70 mix-blend-multiply',
            )}
          />
        </div>
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 rounded-[20px] border border-or-clair/35"
      />
    </div>
  )
}
