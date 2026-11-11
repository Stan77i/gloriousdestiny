import { cx } from '@/lib/cx'
import type { Prestation } from '@/services/catalogue.service'
import { IllustrationPrestation } from './IllustrationPrestation'
import { universPrestation } from './univers'

/**
 * Cadre photo d'une prestation, format portrait 4:5. Sans photo déposée (en attendant les
 * photos), une illustration au trait d'or propre à la prestation.
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
          className="grid size-full place-items-center p-[8%]"
          style={{ background: u.fond }}
        >
          <IllustrationPrestation
            slug={prestation.slug}
            nuit={u.nuit}
            className="presta-illustration size-full"
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
