import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/**
 * Ouverture d'un univers (Perruques, Cils…) : grande photo, titre affiche en deux temps,
 * motif animé propre à l'univers. `nuit` : scène sombre (cils) ; sinon teinte de l'univers.
 */
export function HeroUnivers({
  titre,
  accent,
  intro,
  actions,
  image,
  decor,
  nuit = false,
  fond = 'bg-rose',
}: {
  titre: string
  accent: string
  intro: string
  actions: ReactNode
  image: { src: string; srcSet?: string; alt: string; position?: string } | null
  decor?: ReactNode
  nuit?: boolean
  fond?: string
}) {
  return (
    <section
      className={cx(
        'relative isolate mt-4 overflow-hidden rounded-panneau',
        nuit ? 'zone-nuit bg-fond text-encre' : fond,
      )}
    >
      <div className="grid lg:min-h-[560px] lg:grid-cols-[1fr_1.05fr]">
        <div className="relative z-10 flex flex-col justify-center gap-6 p-7 sm:p-10 lg:p-14">
          {decor}
          <h1 className="titre-affiche text-[52px] leading-[0.98] text-encre sm:text-[76px]">
            {titre}
            <br />
            <span className={nuit ? 'text-or' : 'text-or-texte'}>{accent}</span>
          </h1>
          <p className="max-w-md text-[17px] leading-relaxed text-encre-2">{intro}</p>
          <div className="flex flex-wrap gap-3">{actions}</div>
        </div>
        {image && (
          <div
            className={cx('relative min-h-[340px] sm:min-h-[420px]', nuit && 'm-3 sm:m-5 lg:ml-0')}
          >
            <img
              src={image.src}
              srcSet={image.srcSet}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt={image.alt}
              fetchPriority="high"
              className={cx(
                'absolute inset-0 size-full object-cover',
                nuit && 'rounded-[24px] shadow-[0_24px_60px_-28px_rgb(214_167_86/0.45)]',
                image.position,
              )}
            />
            {!nuit && (
              <span
                aria-hidden="true"
                className="absolute inset-0 hidden bg-[linear-gradient(90deg,var(--gd-rose)_0%,transparent_22%)] lg:block"
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
