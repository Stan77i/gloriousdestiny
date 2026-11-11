import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, MessageCircle, X } from 'lucide-react'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { Panneau } from '@/components/ui/Panneau'
import { classesBouton } from '@/components/ui/classesBouton'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterJour, initiale } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import {
  listerDemandesPrestations,
  traiterDemandePrestation,
  type DemandePrestation,
  type StatutDemande,
} from '@/services/prestations.service'

const LIBELLES: Record<StatutDemande, string> = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  annulee: 'Annulée',
}

function quand(d: DemandePrestation): string {
  return `${initiale(formaterJour(d.date))} à ${d.heure.replace(':', ' h ')}`
}

/** Message à la cliente, rédigé selon la décision : jamais « confirmé » avant acceptation. */
function lienCliente(d: DemandePrestation): string {
  const message =
    d.statut === 'acceptee'
      ? `Bonjour ${d.nom}, ici Glorious Destiny. Votre demande ${d.reference} (${d.prestation}, ${formaterFcfa(d.prix)}) est acceptée : nous vous attendons le ${formaterJour(d.date)} à ${d.heure.replace(':', ' h ')}. À bientôt !`
      : d.statut === 'refusee'
        ? `Bonjour ${d.nom}, ici Glorious Destiny. Nous ne pouvons pas vous recevoir le ${formaterJour(d.date)} à ${d.heure.replace(':', ' h ')} pour votre demande ${d.reference} (${d.prestation}). Quel autre moment vous conviendrait ?`
        : `Bonjour ${d.nom}, ici Glorious Destiny. Nous avons bien reçu votre demande ${d.reference} (${d.prestation}) pour le ${formaterJour(d.date)} à ${d.heure.replace(':', ' h ')}.`
  return `https://wa.me/${d.telephone.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`
}

/** Demandes reçues depuis la rubrique « Nos prestations » : accepter, refuser, répondre. */
export function DemandesPrestations() {
  const client = useQueryClient()
  const { notifier } = useNotifications()
  const demandes = useQuery({
    queryKey: ['admin', 'demandes-prestations'],
    queryFn: listerDemandesPrestations,
  })
  const traiter = useMutation({
    mutationFn: (v: { id: string; statut: 'acceptee' | 'refusee' }) =>
      traiterDemandePrestation(v.id, v.statut),
    onSuccess: (_, v) => {
      notifier(
        v.statut === 'acceptee'
          ? 'Demande acceptée. Prévenez la cliente sur WhatsApp.'
          : 'Demande refusée. Proposez un autre moment à la cliente.',
        'succes',
      )
      return client.invalidateQueries({ queryKey: ['admin', 'demandes-prestations'] })
    },
    onError: (e) => {
      notifier(versErreurApp(e).message, 'erreur')
    },
  })

  if (demandes.isPending || demandes.isError || demandes.data.length === 0) return null
  const enAttente = demandes.data.filter((d) => d.statut === 'en_attente')
  const traitees = demandes.data.filter((d) => d.statut !== 'en_attente').slice(0, 8)

  return (
    <Panneau
      titre={`Demandes de prestations${enAttente.length > 0 ? ` (${String(enAttente.length)} en attente)` : ''}`}
      sousTitre="Pose frontale, traitement, coloration, montage. La cliente attend votre réponse : acceptez ou refusez, puis prévenez-la sur WhatsApp."
      className={enAttente.length > 0 ? 'bg-sable' : ''}
    >
      <ul className="flex flex-col divide-y divide-filet">
        {[...enAttente, ...traitees].map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                {d.nom} · {d.prestation}
                <Badge
                  ton={
                    d.statut === 'acceptee' ? 'succes' : d.statut === 'en_attente' ? 'or' : 'neutre'
                  }
                >
                  {LIBELLES[d.statut]}
                </Badge>
              </span>
              <span className="block text-[13px] text-encre-3">
                Souhaité le {quand(d)} · {formaterFcfa(d.prix)} · {d.telephone} · {d.reference}
              </span>
              {d.precision && (
                <span className="mt-1 block text-[13px] text-encre-2">« {d.precision} »</span>
              )}
            </span>
            <a
              href={lienCliente(d)}
              target="_blank"
              rel="noopener noreferrer"
              className={classesBouton('secondaire', 'petit', 'no-underline')}
            >
              <MessageCircle aria-hidden="true" />
              WhatsApp
            </a>
            {d.statut === 'en_attente' && (
              <>
                <Bouton
                  taille="petit"
                  icone={<Check />}
                  enCours={traiter.isPending && traiter.variables.id === d.id}
                  onClick={() => {
                    traiter.mutate({ id: d.id, statut: 'acceptee' })
                  }}
                >
                  Accepter
                </Bouton>
                <Bouton
                  taille="petit"
                  variante="fantome"
                  icone={<X />}
                  disabled={traiter.isPending}
                  onClick={() => {
                    traiter.mutate({ id: d.id, statut: 'refusee' })
                  }}
                >
                  Refuser
                </Bouton>
              </>
            )}
          </li>
        ))}
      </ul>
    </Panneau>
  )
}
