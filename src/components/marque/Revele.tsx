import type { ReactNode } from 'react'
import { useRevele } from '@/hooks/useRevele'
import { cx } from '@/lib/cx'

/** Bloc révélé au défilement (fondu et légère montée). `vedette` : entrée plus ample. */
export function Revele({
  children,
  indice = 0,
  vedette = false,
  className,
}: {
  children: ReactNode
  indice?: number
  vedette?: boolean
  className?: string
}) {
  const ref = useRevele(indice)
  return (
    <div ref={ref} className={cx(vedette && 'revele-vedette', className)}>
      {children}
    </div>
  )
}
