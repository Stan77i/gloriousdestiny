import { useState } from 'react'
import { CalendarPlus, CalendarX, Clock, MapPin } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { EtatChargement, EtatErreur } from '@/components/ui/Etats'
import { Champ, Saisie } from '@/components/ui/Champs'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { Modale } from '@/components/ui/Modale'
import { classesBouton } from '@/components/ui/classesBouton'
import { STATUT_RDV } from '@/domain/libelles'
import { useParametresPublics } from '@/features/catalogue/requetes'
import { fichierAgenda } from '@/features/rendez-vous/agenda'
import { memoriserRendezVous, telephoneRendezVous } from '@/features/rendez-vous/memoire'
import { useAnnulationCliente, useSuiviRendezVous } from '@/features/rendez-vous/requetes'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { EnvoiWhatsApp } from '@/features/whatsapp/EnvoiWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDuree } from '@/lib/format/duree'
import { formaterHeure, formaterJour, jourSalon, initiale } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import { normaliserTelephoneLibre } from '@/lib/format/telephone'
import { signalerOuvertureWhatsappRdv, type ResumeRdv } from '@/services/rendezvous.service'

function Detail({ r, nouveau, telephone }: { r: ResumeRdv; nouveau: boolean; telephone: string }) {
  const parametres = useParametresPublics()
  const annulation = useAnnulationCliente(r.reference, telephone)
  const [confirmer, setConfirmer] = useState(false)
  const actif = r.statut === 'demande' || r.statut === 'confirme'
  const lieu = parametres.data?.ville_salon ?? null
  const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(
    fichierAgenda({
      reference: r.reference,
      debut: r.debut,
      fin: r.fin,
      prestation: r.service.nom,
      lieu,
    }),
  )}`

  return (
    <div className="grid gap-10 pb-16 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-8">
        {nouveau && r.statut === 'demande' && (
          <Alerte ton="succes" titre={`Créneau réservé : ${r.reference}`}>
            Il est bloqué pour vous. Envoyez le message ci-dessous : l’équipe vous confirme le
            rendez-vous sur WhatsApp.
          </Alerte>
        )}
        {r.statut === 'confirme' && (
          <Alerte ton="succes" titre="Votre rendez-vous est confirmé.">
            Nous vous attendons au salon. Pensez à arriver quelques minutes en avance.
          </Alerte>
        )}
        {r.statut === 'annule' && (
          <Alerte ton="info" titre="Ce rendez-vous est annulé.">
            {r.motif_annulation ?? 'Le créneau a été libéré.'}{' '}
            <Link to={CHEMINS.reserver(r.service.slug)}>Choisir un autre créneau</Link>
          </Alerte>
        )}
        {r.statut === 'demande' && (
          <EnvoiWhatsApp
            objet="rendez-vous"
            message={r.message_whatsapp}
            dejaOuvert={r.message_whatsapp_ouvert_at !== null}
            onOuverture={() => signalerOuvertureWhatsappRdv(r.reference, telephone)}
          />
        )}

        <section
          aria-labelledby="titre-rdv"
          className="flex flex-col gap-5 rounded-panneau bg-sable p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="titre-rdv" className="text-[21px] font-semibold">
              {r.service.nom}
            </h2>
            <Badge ton={STATUT_RDV[r.statut].ton}>{STATUT_RDV[r.statut].libelle}</Badge>
          </div>
          <p className="titre-affiche text-[34px] sm:text-[44px]">
            {initiale(formaterJour(jourSalon(r.debut)))}
            <br />
            <span className="chiffres">à {formaterHeure(r.debut)}</span>
          </p>
          <ul className="flex flex-wrap gap-2 text-[15px]">
            <li className="inline-flex items-center gap-2 rounded-full bg-carte px-4 py-2 [&_svg]:size-4">
              <Clock aria-hidden="true" />
              {formaterDuree(r.service.duree_minutes)}
            </li>
            <li className="chiffres inline-flex items-center rounded-full bg-carte px-4 py-2 font-semibold text-or-texte">
              {formaterFcfa(r.service.prix_fcfa)}
            </li>
            {lieu && (
              <li className="inline-flex items-center gap-2 rounded-full bg-carte px-4 py-2 [&_svg]:size-4">
                <MapPin aria-hidden="true" />
                {lieu}
              </li>
            )}
          </ul>
          {actif && (
            <a
              href={ics}
              download={`rendez-vous-${r.reference}.ics`}
              className={classesBouton('secondaire', 'normal', 'self-start no-underline')}
            >
              <CalendarPlus aria-hidden="true" />
              Ajouter à mon agenda
            </a>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-4 self-start rounded-panneau bg-carte p-6 shadow-panneau">
        <h2 className="text-[17px] font-semibold">Besoin de changer ?</h2>
        {r.annulable ? (
          <>
            <p className="text-[15px] leading-relaxed text-encre-2">
              Vous pouvez annuler en ligne jusqu’à 3 heures avant. Le créneau sera libéré pour une
              autre cliente.
            </p>
            <Bouton
              variante="danger"
              icone={<CalendarX />}
              onClick={() => {
                setConfirmer(true)
              }}
            >
              Annuler le rendez-vous
            </Bouton>
          </>
        ) : actif ? (
          <p className="text-[15px] leading-relaxed text-encre-2">
            Votre rendez-vous approche : pour l’annuler ou le déplacer, écrivez-nous sur WhatsApp.
          </p>
        ) : null}
        <BoutonWhatsApp
          variante="secondaire"
          libelle="Écrire au salon"
          message={`Bonjour, je vous écris au sujet de mon rendez-vous ${r.reference}.`}
        />
        <p className="text-[13px] text-encre-3">
          Référence <span className="chiffres font-semibold text-encre">{r.reference}</span>
        </p>
      </aside>

      <Modale
        ouverte={confirmer}
        onFermer={() => {
          setConfirmer(false)
        }}
        titre="Annuler ce rendez-vous ?"
        description="Le créneau sera libéré. Vous pourrez en réserver un autre à tout moment."
        pied={
          <>
            <Bouton
              variante="fantome"
              onClick={() => {
                setConfirmer(false)
              }}
            >
              Garder mon rendez-vous
            </Bouton>
            <Bouton
              variante="danger"
              enCours={annulation.isPending}
              onClick={() => {
                annulation.mutate(undefined, {
                  onSuccess: () => {
                    setConfirmer(false)
                  },
                })
              }}
            >
              Annuler le rendez-vous
            </Bouton>
          </>
        }
      >
        {annulation.isError && (
          <Alerte ton="danger" titre={versErreurApp(annulation.error).message} />
        )}
      </Modale>
    </div>
  )
}

/** Confirmation (juste après la réservation) et suivi d'un rendez-vous par référence + téléphone. */
export function PageSuiviRendezVous() {
  const { reference = '' } = useParams()
  const ref = reference.toUpperCase()
  const location = useLocation()
  const nouveau = (location.state as { nouveau?: boolean } | null)?.nouveau === true
  const [telephone, setTelephone] = useState<string | null>(() => telephoneRendezVous(ref))
  const [saisie, setSaisie] = useState('')
  const [erreurSaisie, setErreurSaisie] = useState<string | null>(null)
  const suivi = useSuiviRendezVous(ref, telephone)
  useTitreDocument(`Rendez-vous ${ref}`)

  function rechercher() {
    const tel = normaliserTelephoneLibre(saisie)
    if (!tel) {
      setErreurSaisie('Numéro invalide. Indiquez le numéro utilisé pour la réservation.')
      return
    }
    setErreurSaisie(null)
    memoriserRendezVous(ref, tel)
    setTelephone(tel)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
      <EnTetePage
        titre={nouveau ? 'C’est réservé !' : 'Votre rendez-vous'}
        intro={
          <>
            Référence <span className="chiffres font-semibold text-encre">{ref}</span>
          </>
        }
      />
      {telephone === null || (suivi.isSuccess && suivi.data === null) ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            rechercher()
          }}
          className="flex max-w-md flex-col gap-4 pb-16"
        >
          {suivi.isSuccess && suivi.data === null && (
            <Alerte ton="alerte" titre="Aucun rendez-vous ne correspond à ce numéro." />
          )}
          <Champ
            libelle="Téléphone utilisé pour la réservation"
            erreur={erreurSaisie ?? undefined}
            aide="Par sécurité, la référence seule ne suffit pas."
          >
            {(a) => (
              <Saisie
                {...a}
                type="tel"
                inputMode="tel"
                value={saisie}
                onChange={(e) => {
                  setSaisie(e.target.value)
                }}
                placeholder="6 90 00 00 00"
              />
            )}
          </Champ>
          <Bouton type="submit" className="self-start">
            Voir mon rendez-vous
          </Bouton>
        </form>
      ) : suivi.isPending ? (
        <EtatChargement libelle="Chargement du rendez-vous…" />
      ) : suivi.isError ? (
        <EtatErreur
          message={versErreurApp(suivi.error).message}
          onReessayer={() => void suivi.refetch()}
        />
      ) : suivi.data ? (
        <Detail r={suivi.data} nouveau={nouveau} telephone={telephone} />
      ) : null}
    </div>
  )
}
