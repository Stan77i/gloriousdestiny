import { useState } from 'react'
import { Clock3 } from 'lucide-react'
import { Alerte } from '@/components/ui/Alerte'
import { Bouton } from '@/components/ui/Bouton'
import { Champ, Saisie, Selection, ZoneTexte } from '@/components/ui/Champs'
import { Modale } from '@/components/ui/Modale'
import { OptionsIndicatif } from '@/components/ui/OptionsIndicatif'
import { useDemandePrestation } from '@/features/catalogue/prestations'
import { EnvoiWhatsApp } from '@/features/whatsapp/EnvoiWhatsApp'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { decalerJour, formaterJour, jourSalon } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import {
  longueurAttendue,
  normaliserTelephone,
  PAYS_TELEPHONE,
  type Indicatif,
} from '@/lib/format/telephone'
import type { Prestation } from '@/services/catalogue.service'

const HEURE_MIN = '07:00'
const HEURE_MAX = '22:30'

/**
 * Demande de réservation d'une prestation : nom, WhatsApp, date et heure souhaitées, note.
 * Le serveur enregistre la demande « en attente » et rédige le message WhatsApp envoyé au
 * numéro officiel de la boutique. Rien n'est présenté comme confirmé avant l'accord de l'équipe.
 */
export function ReservationPrestation({
  prestation,
  onFermer,
}: {
  prestation: Prestation
  onFermer: () => void
}) {
  const demande = useDemandePrestation()
  const [cle] = useState(() => crypto.randomUUID())
  const [nom, setNom] = useState('')
  const [indicatif, setIndicatif] = useState<Indicatif>('+237')
  const [telephone, setTelephone] = useState('')
  const [date, setDate] = useState('')
  const [heure, setHeure] = useState('')
  const [precision, setPrecision] = useState('')
  const [tentative, setTentative] = useState(false)

  const aujourdhui = jourSalon(new Date())
  const max = decalerJour(aujourdhui, 180)
  const telNormalise = normaliserTelephone(telephone, indicatif)
  const erreurs = {
    nom: nom.trim().length < 2 ? 'Indiquez votre nom.' : undefined,
    telephone: !telNormalise
      ? `Numéro invalide : ${longueurAttendue(indicatif)} attendus après ${indicatif}.`
      : undefined,
    date:
      !date || date < aujourdhui || date > max
        ? 'Choisissez une date, à partir d’aujourd’hui.'
        : undefined,
    heure:
      !heure || heure < HEURE_MIN || heure > HEURE_MAX
        ? 'Choisissez une heure entre 7 h et 22 h 30.'
        : undefined,
  }
  const valide = !Object.values(erreurs).some(Boolean)

  function envoyer() {
    setTentative(true)
    if (!valide || !telNormalise) return
    demande.mutate({
      cleIdempotence: cle,
      service: prestation.slug,
      nom: nom.trim(),
      telephone: telNormalise,
      date,
      heure,
      precision: precision.trim() || undefined,
    })
  }

  const reponse = demande.data
  return (
    <Modale
      ouverte
      forme="tiroir"
      onFermer={onFermer}
      titre={reponse ? 'Demande envoyée' : 'Réserver cette prestation'}
      description={
        reponse
          ? `Référence ${reponse.reference}`
          : 'Indiquez le moment qui vous convient : nous vous confirmons sur WhatsApp.'
      }
      pied={
        reponse ? (
          <Bouton variante="fantome" onClick={onFermer}>
            Fermer
          </Bouton>
        ) : (
          <>
            <Bouton variante="fantome" onClick={onFermer}>
              Annuler
            </Bouton>
            <Bouton variante="or" enCours={demande.isPending} onClick={envoyer}>
              Envoyer ma demande
            </Bouton>
          </>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <div className="zone-nuit flex items-center justify-between gap-4 rounded-[20px] bg-fond px-5 py-4 text-encre">
          <span className="text-[17px] font-semibold">{prestation.nom}</span>
          <span className="chiffres text-[19px] font-semibold whitespace-nowrap text-or">
            {formaterFcfa(prestation.prix)}
          </span>
        </div>

        {reponse ? (
          <>
            <div
              role="status"
              className="flex gap-3 rounded-[20px] border border-or/40 bg-sable px-5 py-4 text-encre [&_svg]:mt-0.5 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-or-texte"
            >
              <Clock3 aria-hidden="true" />
              <p className="text-[15px] leading-relaxed">
                <strong className="font-semibold">En attente de confirmation.</strong> Votre demande
                pour le {formaterJour(date)} à {heure.replace(':', ' h ')} est enregistrée. Le
                rendez-vous sera confirmé par Glorious Destiny sur WhatsApp.
              </p>
            </div>
            <EnvoiWhatsApp
              objet="prestation"
              message={reponse.message_whatsapp}
              dejaOuvert={false}
              onOuverture={() => Promise.resolve()}
            />
          </>
        ) : (
          <>
            {demande.isError && (
              <Alerte ton="danger" titre={versErreurApp(demande.error).message} />
            )}
            <Champ libelle="Nom et prénom" obligatoire erreur={tentative ? erreurs.nom : undefined}>
              {(a) => (
                <Saisie
                  {...a}
                  autoComplete="name"
                  value={nom}
                  onChange={(e) => {
                    setNom(e.target.value)
                  }}
                />
              )}
            </Champ>
            <Champ
              libelle="Numéro WhatsApp"
              obligatoire
              erreur={tentative ? erreurs.telephone : undefined}
              aide="Pour vous confirmer le rendez-vous."
            >
              {(a) => (
                <div className="flex gap-2">
                  <div className="w-[9.5rem] shrink-0">
                    <Selection
                      aria-label="Indicatif"
                      value={indicatif}
                      onChange={(e) => {
                        setIndicatif(e.target.value as Indicatif)
                      }}
                    >
                      <OptionsIndicatif />
                    </Selection>
                  </div>
                  <Saisie
                    {...a}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder={PAYS_TELEPHONE[indicatif].exemple}
                    value={telephone}
                    onChange={(e) => {
                      setTelephone(e.target.value)
                    }}
                  />
                </div>
              )}
            </Champ>
            <div className="grid grid-cols-2 gap-4">
              <Champ
                libelle="Date souhaitée"
                obligatoire
                erreur={tentative ? erreurs.date : undefined}
              >
                {(a) => (
                  <Saisie
                    {...a}
                    type="date"
                    min={aujourdhui}
                    max={max}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value)
                    }}
                  />
                )}
              </Champ>
              <Champ
                libelle="Heure souhaitée"
                obligatoire
                erreur={tentative ? erreurs.heure : undefined}
              >
                {(a) => (
                  <Saisie
                    {...a}
                    type="time"
                    min={HEURE_MIN}
                    max={HEURE_MAX}
                    step={900}
                    value={heure}
                    onChange={(e) => {
                      setHeure(e.target.value)
                    }}
                  />
                )}
              </Champ>
            </div>
            <Champ libelle="Une précision ? (facultatif)">
              {(a) => (
                <ZoneTexte
                  {...a}
                  maxLength={500}
                  value={precision}
                  onChange={(e) => {
                    setPrecision(e.target.value)
                  }}
                  placeholder="Ex. : longueur de la perruque, teinte souhaitée, j’apporte ma perruque…"
                />
              )}
            </Champ>
            <p className="text-[13px] leading-relaxed text-encre-3">
              Votre demande est envoyée à l’équipe et préparée pour WhatsApp. Elle n’est confirmée
              qu’après notre réponse.
            </p>
          </>
        )}
      </div>
    </Modale>
  )
}
