import { useState } from 'react'
import {
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  CalendarSync,
  Check,
  Lock,
  Send,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  UserCheck,
  UserX,
  X,
} from 'lucide-react'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Bouton, BoutonIcone } from '@/components/ui/Bouton'
import { Squelette } from '@/components/ui/Chargeur'
import { Champ, Saisie, ZoneTexte } from '@/components/ui/Champs'
import { EtatErreur, EtatVide } from '@/components/ui/Etats'
import { Modale } from '@/components/ui/Modale'
import { Panneau, TuileChiffre } from '@/components/ui/Panneau'
import { classesBouton } from '@/components/ui/classesBouton'
import { STATUT_RDV } from '@/domain/libelles'
import {
  useActionRendezVous,
  useAgenda,
  useBlocage,
  useBlocages,
  useCreneauxReport,
  useFermeture,
  useFermetures,
  useRappelEnvoye,
  useRappels,
  useReport,
} from '@/features/rendez-vous/requetes'
import { useMaintenant } from '@/hooks/useMaintenant'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import {
  decalerJour,
  formaterHeure,
  formaterJour,
  instantSalon,
  jourSalon,
  lundiDe,
  minuitSalon,
  initiale,
} from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import type { ActionRdv, Blocage, RdvAgenda } from '@/services/rendezvous.service'

function lienWhatsAppCliente(r: RdvAgenda): string {
  const message = `Bonjour ${r.cliente.nom}, ici Glorious Destiny. Nous confirmons votre rendez-vous ${r.reference} (${r.service}) le ${formaterJour(jourSalon(r.debut))} à ${formaterHeure(r.debut)}. À bientôt au salon !`
  return `https://wa.me/${r.cliente.telephone.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`
}

function CarteRdv({
  r,
  lancer,
  enCours,
  annuler,
  reporter,
  maintenant,
}: {
  maintenant: number
  r: RdvAgenda
  lancer: (a: ActionRdv, succes: string) => void
  enCours: boolean
  annuler: (r: RdvAgenda) => void
  reporter: (r: RdvAgenda) => void
}) {
  const actif = r.statut === 'demande' || r.statut === 'confirme'
  const commence = new Date(r.debut).getTime() <= maintenant
  return (
    <li
      className={cx(
        'flex flex-col gap-3 rounded-[22px] p-4 sm:flex-row sm:items-center sm:gap-5',
        r.statut === 'demande' ? 'bg-or/14' : 'bg-carte-2',
        !actif && 'opacity-70',
      )}
    >
      <div className="chiffres flex shrink-0 items-baseline gap-1.5 sm:w-28 sm:flex-col sm:gap-0">
        <span className="text-[21px] font-semibold text-encre">{formaterHeure(r.debut)}</span>
        <span className="text-[13px] text-encre-3">→ {formaterHeure(r.fin)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-encre">
          {r.service}
          <Badge ton={STATUT_RDV[r.statut].ton}>{STATUT_RDV[r.statut].libelle}</Badge>
        </p>
        <p className="mt-0.5 text-[15px] text-encre-2">
          {r.cliente.nom} · <span className="chiffres">{r.cliente.telephone}</span>
        </p>
        <p className="chiffres mt-0.5 text-[13px] text-encre-3">
          {r.reference}
          {r.prix !== null && ` · ${formaterFcfa(r.prix)}`}
          {r.statut === 'demande' &&
            (r.whatsappOuvertLe ? ' · message WhatsApp ouvert' : ' · WhatsApp pas encore ouvert')}
        </p>
        {r.notes && <p className="mt-1.5 text-[13px] text-encre-2">« {r.notes} »</p>}
        {r.motifAnnulation && (
          <p className="mt-1.5 text-[13px] text-encre-3">Motif : {r.motifAnnulation}</p>
        )}
      </div>
      {actif && (
        <div className="flex flex-wrap gap-2">
          <a
            href={lienWhatsAppCliente(r)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Écrire à ${r.cliente.nom} sur WhatsApp`}
            title="WhatsApp"
            className="inline-flex size-11 items-center justify-center rounded-full bg-carte text-encre-2 shadow-[inset_0_0_0_1px_var(--color-filet-fort)] hover:text-encre [&_svg]:size-[18px]"
          >
            <MessageCircle aria-hidden="true" />
          </a>
          {r.statut === 'demande' && !commence && (
            <Bouton
              taille="petit"
              icone={<Check />}
              disabled={enCours}
              onClick={() => {
                lancer({ type: 'confirmer', id: r.id }, `${r.reference} confirmé.`)
              }}
            >
              Confirmer
            </Bouton>
          )}
          {commence ? (
            <>
              <Bouton
                taille="petit"
                variante="secondaire"
                icone={<UserCheck />}
                disabled={enCours}
                onClick={() => {
                  lancer({ type: 'cloturer', id: r.id, issue: 'termine' }, 'Venue enregistrée.')
                }}
              >
                Venue
              </Bouton>
              <Bouton
                taille="petit"
                variante="secondaire"
                icone={<UserX />}
                disabled={enCours}
                onClick={() => {
                  lancer({ type: 'cloturer', id: r.id, issue: 'absent' }, 'Absence enregistrée.')
                }}
              >
                Absente
              </Bouton>
            </>
          ) : (
            <>
              <BoutonIcone
                libelle={`Reporter ${r.reference}`}
                variante="secondaire"
                onClick={() => {
                  reporter(r)
                }}
              >
                <CalendarSync />
              </BoutonIcone>
              <BoutonIcone
                libelle={`Annuler ${r.reference}`}
                variante="fantome"
                onClick={() => {
                  annuler(r)
                }}
              >
                <X />
              </BoutonIcone>
            </>
          )}
        </div>
      )}
    </li>
  )
}

function ModaleAnnulation({
  rdv,
  onFermer,
  lancer,
  enCours,
}: {
  rdv: RdvAgenda
  onFermer: () => void
  lancer: (a: ActionRdv, succes: string) => void
  enCours: boolean
}) {
  const [motif, setMotif] = useState('')
  return (
    <Modale
      ouverte
      onFermer={onFermer}
      titre={`Annuler ${rdv.reference} ?`}
      description={`${rdv.service} de ${rdv.cliente.nom}. Le créneau sera libéré ; prévenez la cliente sur WhatsApp.`}
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Garder
          </Bouton>
          <Bouton
            variante="danger"
            enCours={enCours}
            disabled={motif.trim().length < 3}
            onClick={() => {
              lancer(
                { type: 'annuler', id: rdv.id, motif: motif.trim() },
                `${rdv.reference} annulé.`,
              )
            }}
          >
            Annuler le rendez-vous
          </Bouton>
        </>
      }
    >
      <Champ libelle="Motif" obligatoire aide="Visible par la cliente dans son suivi.">
        {(a) => (
          <ZoneTexte
            {...a}
            value={motif}
            onChange={(e) => {
              setMotif(e.target.value)
            }}
            placeholder="Ex. : salon fermé exceptionnellement, à la demande de la cliente"
          />
        )}
      </Champ>
    </Modale>
  )
}

function ModaleReport({
  rdv,
  aujourdhui,
  onFermer,
}: {
  rdv: RdvAgenda
  aujourdhui: string
  onFermer: () => void
}) {
  const { notifier } = useNotifications()
  const [jour, setJour] = useState(
    jourSalon(rdv.debut) < aujourdhui ? aujourdhui : jourSalon(rdv.debut),
  )
  const [choix, setChoix] = useState<string | null>(null)
  const [motif, setMotif] = useState('')
  const creneaux = useCreneauxReport(rdv.id, jour)
  const report = useReport()
  const libres = (creneaux.data ?? []).filter(
    (c) => new Date(c).getTime() !== new Date(rdv.debut).getTime(),
  )
  return (
    <Modale
      ouverte
      forme="tiroir"
      onFermer={onFermer}
      titre={`Reporter ${rdv.reference}`}
      description={`${rdv.service} de ${rdv.cliente.nom}, prévu ${formaterJour(jourSalon(rdv.debut))} à ${formaterHeure(rdv.debut)}. Seuls les créneaux libres sont proposés.`}
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Garder la date
          </Bouton>
          <Bouton
            enCours={report.isPending}
            disabled={choix === null}
            onClick={() => {
              if (!choix) return
              report.mutate(
                { id: rdv.id, debut: choix, motif: motif.trim() },
                {
                  onSuccess: () => {
                    notifier(
                      `${rdv.reference} déplacé au ${formaterJour(jourSalon(choix))} à ${formaterHeure(choix)}. Prévenez la cliente.`,
                      'succes',
                    )
                    onFermer()
                  },
                },
              )
            }}
          >
            Déplacer
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {report.isError && <Alerte ton="danger" titre={versErreurApp(report.error).message} />}
        <Champ libelle="Nouveau jour" obligatoire>
          {(a) => (
            <Saisie
              {...a}
              type="date"
              min={aujourdhui}
              value={jour}
              onChange={(e) => {
                setJour(e.target.value)
                setChoix(null)
              }}
            />
          )}
        </Champ>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Créneaux libres</legend>
          {creneaux.isPending ? (
            <Squelette className="h-24 w-full" />
          ) : creneaux.isError ? (
            <Alerte ton="danger" titre={versErreurApp(creneaux.error).message} />
          ) : libres.length === 0 ? (
            <p className="text-sm text-encre-3">
              Aucun créneau libre ce jour-là (fermé, complet ou bloqué).
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {libres.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={choix === c}
                  onClick={() => {
                    setChoix(c)
                  }}
                  className={cx(
                    'chiffres min-h-11 rounded-full px-4 text-sm font-semibold transition-colors',
                    choix === c
                      ? 'bg-encre text-fond'
                      : 'bg-carte-2 text-encre shadow-[inset_0_0_0_1px_var(--color-filet)] hover:bg-carte-3',
                  )}
                >
                  {formaterHeure(c)}
                </button>
              ))}
            </div>
          )}
        </fieldset>
        <Champ libelle="Motif" aide="Facultatif, gardé dans l’historique du rendez-vous.">
          {(a) => (
            <Saisie
              {...a}
              value={motif}
              onChange={(e) => {
                setMotif(e.target.value)
              }}
              placeholder="Ex. : à la demande de la cliente"
            />
          )}
        </Champ>
      </div>
    </Modale>
  )
}

function Rappels() {
  const rappels = useRappels()
  const envoye = useRappelEnvoye()
  const { notifier } = useNotifications()
  if (rappels.isPending || rappels.isError || rappels.data.length === 0) return null
  return (
    <Panneau
      titre={`Rappels à envoyer (${String(rappels.data.length)})`}
      sousTitre="Rendez-vous des prochaines 24 h. Le message est prêt : ouvrez WhatsApp, envoyez, puis cochez."
      className="bg-sable"
    >
      <ul className="flex flex-col divide-y divide-filet">
        {rappels.data.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {r.cliente} · {formaterHeure(r.debut)}
              </span>
              <span className="block text-[13px] text-encre-3">
                {r.service} · {initiale(formaterJour(jourSalon(r.debut)))} · {r.reference}
              </span>
            </span>
            <a
              href={`https://wa.me/${r.telephone.replace(/^\+/, '')}?text=${encodeURIComponent(r.message)}`}
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
              enCours={envoye.isPending && envoye.variables === r.id}
              onClick={() => {
                envoye.mutate(r.id, {
                  onSuccess: () => {
                    notifier(`Rappel envoyé à ${r.cliente}.`, 'succes')
                  },
                  onError: (e) => {
                    notifier(versErreurApp(e).message, 'erreur')
                  },
                })
              }}
            >
              Envoyé
            </Bouton>
          </li>
        ))}
      </ul>
    </Panneau>
  )
}

function Blocages({ aujourdhui }: { aujourdhui: string }) {
  const action = useBlocage()
  const { notifier } = useNotifications()
  const [jour, setJour] = useState('')
  const [de, setDe] = useState('12:00')
  const [a, setA] = useState('14:00')
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const valide = jour !== '' && a > de && motif.trim().length >= 3
  return (
    <Panneau
      titre="Bloquer un créneau"
      sousTitre="Pause, formation, rendez-vous pris par téléphone : la plage n’est plus proposée en ligne."
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setErreur(null)
          action.mutate(
            {
              type: 'bloquer',
              debut: instantSalon(jour, de),
              fin: instantSalon(jour, a),
              motif: motif.trim(),
            },
            {
              onSuccess: () => {
                notifier(`Créneau bloqué le ${formaterJour(jour)} de ${de} à ${a}.`, 'succes')
                setMotif('')
              },
              onError: (e2) => {
                setErreur(versErreurApp(e2).message)
              },
            },
          )
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[170px_120px_120px_minmax(0,1fr)_auto] lg:items-end"
      >
        <Champ libelle="Jour" obligatoire>
          {(p) => (
            <Saisie
              {...p}
              type="date"
              min={aujourdhui}
              value={jour}
              onChange={(e) => {
                setJour(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="De" obligatoire>
          {(p) => (
            <Saisie
              {...p}
              type="time"
              step={900}
              value={de}
              onChange={(e) => {
                setDe(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="À" obligatoire>
          {(p) => (
            <Saisie
              {...p}
              type="time"
              step={900}
              value={a}
              onChange={(e) => {
                setA(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="Motif" obligatoire>
          {(p) => (
            <Saisie
              {...p}
              value={motif}
              onChange={(e) => {
                setMotif(e.target.value)
              }}
              placeholder="Ex. : formation de l’équipe"
            />
          )}
        </Champ>
        <Bouton
          type="submit"
          variante="secondaire"
          icone={<Lock />}
          disabled={!valide}
          enCours={action.isPending}
        >
          Bloquer
        </Bouton>
      </form>
      {erreur && <Alerte ton="danger" titre={erreur} className="mt-4" />}
    </Panneau>
  )
}

function LigneBlocage({ b }: { b: Blocage }) {
  const action = useBlocage()
  const { notifier } = useNotifications()
  return (
    <li className="hachures flex flex-wrap items-center gap-3 rounded-[22px] bg-carte-2 p-4">
      <span className="chiffres text-[17px] font-semibold">
        {formaterHeure(b.debut)} → {formaterHeure(b.fin)}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-carte px-3 py-1 text-[13px] font-medium [&_svg]:size-3.5">
        <Lock aria-hidden="true" />
        Bloqué · {b.motif}
      </span>
      <Bouton
        taille="petit"
        variante="fantome"
        className="ml-auto"
        enCours={action.isPending}
        onClick={() => {
          action.mutate(
            { type: 'retirer', id: b.id },
            {
              onSuccess: () => {
                notifier('Créneau débloqué.', 'succes')
              },
            },
          )
        }}
      >
        Débloquer
      </Bouton>
    </li>
  )
}

function Fermetures({ aujourdhui }: { aujourdhui: string }) {
  const fermetures = useFermetures(aujourdhui)
  const action = useFermeture()
  const { notifier } = useNotifications()
  const [date, setDate] = useState('')
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  return (
    <Panneau titre="Jours de fermeture" sousTitre="Aucun créneau n’est proposé ces jours-là.">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setErreur(null)
          action.mutate(
            { type: 'fermer', date, motif },
            {
              onSuccess: () => {
                notifier(`Salon fermé le ${formaterJour(date)}.`, 'succes')
                setDate('')
                setMotif('')
              },
              onError: (e2) => {
                setErreur(versErreurApp(e2).message)
              },
            },
          )
        }}
        className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end"
      >
        <Champ libelle="Date" obligatoire>
          {(a) => (
            <Saisie
              {...a}
              type="date"
              min={aujourdhui}
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="Motif">
          {(a) => (
            <Saisie
              {...a}
              value={motif}
              onChange={(e) => {
                setMotif(e.target.value)
              }}
              placeholder="Ex. : jour férié, formation"
            />
          )}
        </Champ>
        <Bouton
          type="submit"
          variante="secondaire"
          icone={<CalendarOff />}
          disabled={!date}
          enCours={action.isPending}
        >
          Fermer ce jour
        </Bouton>
      </form>
      {erreur && <Alerte ton="danger" titre={erreur} className="mt-4" />}
      <ul className="mt-5 flex flex-col divide-y divide-filet">
        {fermetures.data?.length === 0 && (
          <li className="py-3 text-[13px] text-encre-3">Aucune fermeture prévue.</li>
        )}
        {fermetures.data?.map((f) => (
          <li key={f.date} className="flex items-center justify-between gap-4 py-3 text-[15px]">
            <span>
              <span className="font-semibold">{initiale(formaterJour(f.date))}</span>
              {f.motif && <span className="text-encre-3"> · {f.motif}</span>}
            </span>
            <Bouton
              taille="petit"
              variante="fantome"
              onClick={() => {
                action.mutate(
                  { type: 'rouvrir', date: f.date },
                  {
                    onSuccess: () => {
                      notifier(`Le ${formaterJour(f.date)} est rouvert.`, 'succes')
                    },
                  },
                )
              }}
            >
              Rouvrir
            </Bouton>
          </li>
        ))}
      </ul>
    </Panneau>
  )
}

/** Agenda du salon : la semaine jour par jour, demandes à confirmer, fermetures. */
export function PageAdminRendezVous() {
  useTitreDocument('Rendez-vous')
  const maintenant = useMaintenant()
  const aujourdhui = jourSalon(new Date(maintenant))
  const [lundi, setLundi] = useState(() => lundiDe(aujourdhui))
  const dimancheSuivant = decalerJour(lundi, 7)
  const agenda = useAgenda(minuitSalon(lundi), minuitSalon(dimancheSuivant))
  const action = useActionRendezVous()
  const { notifier } = useNotifications()
  const [aAnnuler, setAAnnuler] = useState<RdvAgenda | null>(null)
  const [aReporter, setAReporter] = useState<RdvAgenda | null>(null)
  const blocages = useBlocages(minuitSalon(lundi), minuitSalon(dimancheSuivant))

  function lancer(a: ActionRdv, succes: string) {
    action.mutate(a, {
      onSuccess: () => {
        notifier(succes, 'succes')
        setAAnnuler(null)
      },
      onError: (e) => {
        notifier(versErreurApp(e).message, 'erreur')
      },
    })
  }

  const rdv = agenda.data ?? []
  const actifs = rdv.filter((r) => r.statut === 'demande' || r.statut === 'confirme')
  const demandes = actifs.filter((r) => r.statut === 'demande').length
  const duJour = actifs.filter((r) => jourSalon(r.debut) === aujourdhui).length
  const jours = Array.from({ length: 7 }, (_, i) => decalerJour(lundi, i))
  const blocs = blocages.data ?? []

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[28px] font-semibold">Rendez-vous</h1>
        <a
          href={`${import.meta.env.BASE_URL}rendez-vous`}
          target="_blank"
          rel="noopener noreferrer"
          className={classesBouton('secondaire', 'normal', 'no-underline')}
        >
          <CalendarClock aria-hidden="true" />
          Voir la page de réservation
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <TuileChiffre
          fond={demandes > 0 ? 'or' : 'carte'}
          libelle="À confirmer"
          valeur={agenda.isPending ? '…' : String(demandes)}
          complement="cette semaine"
          icone={<CalendarClock />}
        />
        <TuileChiffre
          fond="sable"
          libelle="Aujourd’hui"
          valeur={agenda.isPending ? '…' : String(duJour)}
          complement="rendez-vous prévus"
          icone={<CalendarCheck />}
        />
        <TuileChiffre
          libelle="Cette semaine"
          valeur={agenda.isPending ? '…' : String(actifs.length)}
          complement="demandés ou confirmés"
          icone={<CalendarCheck />}
        />
      </div>

      <Rappels />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[19px] font-semibold">Semaine du {formaterJour(lundi)}</p>
        <div className="flex items-center gap-1">
          <BoutonIcone
            libelle="Semaine précédente"
            onClick={() => {
              setLundi((l) => decalerJour(l, -7))
            }}
          >
            <ChevronLeft />
          </BoutonIcone>
          <Bouton
            variante="fantome"
            taille="petit"
            disabled={lundi === lundiDe(aujourdhui)}
            onClick={() => {
              setLundi(lundiDe(aujourdhui))
            }}
          >
            Cette semaine
          </Bouton>
          <BoutonIcone
            libelle="Semaine suivante"
            onClick={() => {
              setLundi((l) => decalerJour(l, 7))
            }}
          >
            <ChevronRight />
          </BoutonIcone>
        </div>
      </div>

      {agenda.isError ? (
        <EtatErreur
          message={versErreurApp(agenda.error).message}
          onReessayer={() => void agenda.refetch()}
        />
      ) : agenda.isPending ? (
        <Squelette className="h-64 w-full rounded-panneau" />
      ) : rdv.length === 0 && blocs.length === 0 ? (
        <div className="rounded-panneau bg-carte shadow-panneau">
          <EtatVide titre="Aucun rendez-vous cette semaine" icone={<CalendarClock />}>
            Les réservations faites sur le site apparaîtront ici, jour par jour.
          </EtatVide>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {jours.map((j) => {
            const duJourListe = rdv.filter((r) => jourSalon(r.debut) === j)
            const blocsDuJour = blocs.filter(
              (b) => jourSalon(b.debut) <= j && jourSalon(b.fin) >= j,
            )
            if (duJourListe.length === 0 && blocsDuJour.length === 0) return null
            return (
              <Panneau
                key={j}
                titre={initiale(formaterJour(j))}
                sousTitre={j === aujourdhui ? 'Aujourd’hui' : undefined}
              >
                <ul className="flex flex-col gap-2">
                  {blocsDuJour.map((b) => (
                    <LigneBlocage key={b.id} b={b} />
                  ))}
                  {duJourListe.map((r) => (
                    <CarteRdv
                      key={r.id}
                      r={r}
                      lancer={lancer}
                      enCours={action.isPending}
                      annuler={setAAnnuler}
                      reporter={setAReporter}
                      maintenant={maintenant}
                    />
                  ))}
                </ul>
              </Panneau>
            )
          })}
        </div>
      )}

      <Blocages aujourdhui={aujourdhui} />
      <Fermetures aujourdhui={aujourdhui} />

      {aReporter && (
        <ModaleReport
          key={aReporter.id}
          rdv={aReporter}
          aujourdhui={aujourdhui}
          onFermer={() => {
            setAReporter(null)
          }}
        />
      )}
      {aAnnuler && (
        <ModaleAnnulation
          rdv={aAnnuler}
          onFermer={() => {
            setAAnnuler(null)
          }}
          lancer={lancer}
          enCours={action.isPending}
        />
      )}
    </section>
  )
}
