import { MessageCircle } from 'lucide-react'
import {
  classesBouton,
  type TailleBouton,
  type VarianteBouton,
} from '@/components/ui/classesBouton'
import { useParametresPublics } from '@/features/catalogue/requetes'
import { lienWhatsApp } from './lienWhatsApp'

/**
 * Lien vers WhatsApp, à partir des paramètres de la boutique (base de données).
 * Rien n'est affiché tant que le lien n'est pas connu : jamais de lien inventé.
 */
export function BoutonWhatsApp({
  libelle = 'Nous écrire sur WhatsApp',
  message,
  variante = 'secondaire',
  taille = 'normal',
  className,
}: {
  libelle?: string
  message?: string
  variante?: VarianteBouton
  taille?: TailleBouton
  className?: string
}) {
  const parametres = useParametresPublics()
  const lien = lienWhatsApp(parametres.data, message)
  if (!lien) return null
  return (
    <a
      href={lien.url}
      target="_blank"
      rel="noopener noreferrer"
      className={classesBouton(variante, taille, `no-underline ${className ?? ''}`)}
    >
      <MessageCircle aria-hidden="true" />
      {libelle}
    </a>
  )
}
