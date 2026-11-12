import type { ReactNode } from 'react'
import { useAffichage } from '@/features/app/mode'
import { LayoutApp } from './LayoutApp'
import { LayoutPublic } from './LayoutPublic'

/** Téléphone : l'application ; ordinateur : le site (détection automatique, voir mode.ts). */
export function LayoutAdaptatif() {
  return useAffichage() === 'app' ? <LayoutApp /> : <LayoutPublic />
}

/** Écran à deux versions : celle du site, et celle redessinée pour l'application. */
export function Adaptatif({ site, app }: { site: ReactNode; app: ReactNode }) {
  return <>{useAffichage() === 'app' ? app : site}</>
}
