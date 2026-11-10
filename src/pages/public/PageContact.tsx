import { Banknote, CalendarClock, MapPin, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { useParametresPublics } from '@/features/catalogue/requetes'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'

function Ligne({
  icone,
  titre,
  children,
}: {
  icone: ReactNode
  titre: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[20px_1fr] gap-x-4 border-t border-filet py-6 [&_svg]:size-5 [&_svg]:text-or">
      <dt className="contents">
        <span aria-hidden="true" className="row-span-2 mt-0.5">
          {icone}
        </span>
        <span className="font-semibold text-encre">{titre}</span>
      </dt>
      <dd className="col-start-2 mt-1 text-[15px] leading-relaxed text-encre-2">{children}</dd>
    </div>
  )
}

/** Contact : WhatsApp d'abord, puis les informations pratiques réelles. */
export function PageContact() {
  useTitreDocument('Contact')
  const parametres = useParametresPublics()
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <EnTetePage
        titre="Contact"
        intro="Une question sur un produit, une perruque, une commande ? Écrivez-nous sur WhatsApp, l’équipe vous répond."
        actions={<BoutonWhatsApp variante="principal" taille="grand" />}
      />
      <dl className="pb-10">
        {parametres.data?.ville_salon && (
          <Ligne icone={<MapPin />} titre="Le salon">
            {parametres.data.ville_salon}
          </Ligne>
        )}
        {parametres.data?.horaires_salon && (
          <Ligne icone={<CalendarClock />} titre="Horaires">
            {parametres.data.horaires_salon}
          </Ligne>
        )}
        <Ligne icone={<Truck />} titre="Livraison">
          Douala, Yaoundé, Garoua et Abidjan.
        </Ligne>
        <Ligne icone={<Banknote />} titre="Paiement">
          À la livraison, en espèces ou par Mobile Money.
        </Ligne>
      </dl>
    </div>
  )
}
