import { MessageCircle, Send } from 'lucide-react'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Bouton } from '@/components/ui/Bouton'
import { Panneau } from '@/components/ui/Panneau'
import { classesBouton } from '@/components/ui/classesBouton'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDate } from '@/lib/format/date'
import { useAlertePrevenue, useAlertesAPrevenir } from './requetes'

/**
 * Clientes qui ont demandé à être prévenues et dont l'article est revenu en stock. Le message
 * WhatsApp est rédigé par la base à partir de la fiche produit ; l'équipe l'envoie, puis coche.
 */
export function AlertesAPrevenir() {
  const alertes = useAlertesAPrevenir()
  const prevenue = useAlertePrevenue()
  const { notifier } = useNotifications()
  if (alertes.isPending || alertes.isError || alertes.data.length === 0) return null
  return (
    <Panneau
      titre={`Clientes à prévenir : retour en stock (${String(alertes.data.length)})`}
      sousTitre="Elles ont demandé à être prévenues et ont donné leur accord. Le message est prêt."
      className="bg-sauge"
    >
      <ul className="flex flex-col divide-y divide-filet">
        {alertes.data.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {a.nom} · {a.produit}
              </span>
              <span className="chiffres block text-[13px] text-encre-3">
                {a.telephone} · demandé le {formaterDate(a.demande_le)} · {a.disponible} en stock
              </span>
            </span>
            <a
              href={`https://wa.me/${a.telephone.replace(/^\+/, '')}?text=${encodeURIComponent(a.message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={classesBouton('secondaire', 'petit', 'no-underline')}
            >
              <MessageCircle aria-hidden="true" />
              Ouvrir WhatsApp
            </a>
            <Bouton
              taille="petit"
              icone={<Send />}
              enCours={prevenue.isPending && prevenue.variables === a.id}
              onClick={() => {
                prevenue.mutate(a.id, {
                  onSuccess: () => {
                    notifier(`${a.nom} est prévenue.`, 'succes')
                  },
                  onError: (e) => {
                    notifier(versErreurApp(e).message, 'erreur')
                  },
                })
              }}
            >
              Prévenue
            </Bouton>
          </li>
        ))}
      </ul>
    </Panneau>
  )
}
