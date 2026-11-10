import { CalendarClock, MapPin } from 'lucide-react'
import { Alerte } from '@/components/ui/Alerte'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { ListeServices } from '@/features/catalogue/ListeServices'
import { useParametresPublics } from '@/features/catalogue/requetes'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'

/**
 * Prise de rendez-vous. Phase 4 : les prestations, le salon et la réservation par WhatsApp.
 * Le calendrier en ligne (créneaux en temps réel, confirmation) arrive en Phase 9.
 */
export function PageRendezVous() {
  useTitreDocument('Rendez-vous')
  const parametres = useParametresPublics()

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-10">
      <EnTetePage
        titre="Rendez-vous"
        intro="Choisissez votre prestation, puis réservez votre créneau avec nous sur WhatsApp."
        actions={
          <BoutonWhatsApp
            variante="principal"
            taille="grand"
            libelle="Réserver sur WhatsApp"
            message="Bonjour, je souhaite prendre rendez-vous au salon."
          />
        }
      />
      <Alerte ton="info" titre="Réservation en ligne bientôt disponible" className="mb-10">
        Le choix du créneau directement sur le site arrive prochainement. D’ici là, l’équipe vous
        confirme votre rendez-vous sur WhatsApp.
      </Alerte>

      <div className="grid gap-12 pb-10 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="titre-prestations">
          <h2 id="titre-prestations" className="titre-affiche mb-6 text-[28px] text-ivoire">
            Les prestations
          </h2>
          <ListeServices />
        </section>
        <aside
          aria-labelledby="titre-infos-salon"
          className="flex flex-col gap-5 self-start rounded-panneau border border-filet bg-surface-1 p-6"
        >
          <h2 id="titre-infos-salon" className="text-[17px] font-semibold">
            Le salon
          </h2>
          {parametres.data?.ville_salon && (
            <p className="flex gap-3 text-sm text-ivoire-2 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-or">
              <MapPin aria-hidden="true" />
              {parametres.data.ville_salon}
            </p>
          )}
          {parametres.data?.horaires_salon && (
            <p className="flex gap-3 text-sm text-ivoire-2 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-or">
              <CalendarClock aria-hidden="true" />
              {parametres.data.horaires_salon}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
