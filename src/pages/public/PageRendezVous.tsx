import { useMemo, useState } from 'react'
import { CalendarCheck, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Alerte } from '@/components/ui/Alerte'
import { Bouton, BoutonIcone } from '@/components/ui/Bouton'
import { Squelette } from '@/components/ui/Chargeur'
import { Champ, Saisie, Selection, ZoneTexte } from '@/components/ui/Champs'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { EtatErreur } from '@/components/ui/Etats'
import { useParametresPublics, useServices } from '@/features/catalogue/requetes'
import { moment, regrouperParJour } from '@/features/rendez-vous/creneaux'
import { cleReservation, memoriserRendezVous } from '@/features/rendez-vous/memoire'
import { useCreneaux, useReservation } from '@/features/rendez-vous/requetes'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { decalerJour, formaterHeure, formaterJour, jourSalon, initiale } from '@/lib/format/date'
import { formaterDuree } from '@/lib/format/duree'
import { formaterFcfa } from '@/lib/format/montant'
import { normaliserTelephone, type Indicatif } from '@/lib/format/telephone'

/** Jours affichés par page de calendrier (le serveur accepte 31 jours par appel). */
const JOURS_PAR_PAGE = 14
/** Horizon de réservation (paramètre serveur `horizon_reservation_jours`). */
const PAGES_MAX = 4

function Etape({
  numero,
  titre,
  children,
}: {
  numero: number
  titre: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={`etape-${String(numero)}`} className="flex flex-col gap-4">
      <h2
        id={`etape-${String(numero)}`}
        className="flex items-center gap-3 text-[21px] font-semibold text-encre"
      >
        <span
          aria-hidden="true"
          className="chiffres grid size-9 shrink-0 place-items-center rounded-full bg-encre text-[15px] text-fond"
        >
          {numero}
        </span>
        {titre}
      </h2>
      {children}
    </section>
  )
}

function classeChoix(actif: boolean, desactive = false) {
  return cx(
    'rounded-[18px] text-left transition-[background-color,box-shadow,color] duration-300 ease-(--ease-sortie)',
    actif
      ? 'bg-encre text-fond shadow-panneau'
      : desactive
        ? 'cursor-not-allowed bg-carte/50 text-encre-3'
        : 'bg-carte text-encre shadow-panneau hover:bg-carte-2',
  )
}

/** Prise de rendez-vous en ligne : prestation, jour, heure, coordonnées. Le créneau est tenu dès l'envoi. */
export function PageRendezVous() {
  useTitreDocument('Rendez-vous')
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const services = useServices()
  const parametres = useParametresPublics()
  const reservation = useReservation()

  const serviceSlug = params.get('service')
  const service = services.data?.find((s) => s.slug === serviceSlug) ?? null
  const [page, setPage] = useState(0)
  const [jour, setJour] = useState<string | null>(null)
  const [creneau, setCreneau] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [indicatif, setIndicatif] = useState<Indicatif>('+237')
  const [telephone, setTelephone] = useState('')
  const [notes, setNotes] = useState('')
  const [tentative, setTentative] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const aujourdhui = jourSalon(new Date())
  const du = decalerJour(aujourdhui, page * JOURS_PAR_PAGE)
  const au = decalerJour(du, JOURS_PAR_PAGE - 1)
  const creneaux = useCreneaux(service?.id ?? null, du, au)
  const jours = useMemo(
    () => regrouperParJour(creneaux.data ?? [], du, JOURS_PAR_PAGE),
    [creneaux.data, du],
  )
  const creneauxDuJour = jours.find((j) => j.jour === jour)?.creneaux ?? []
  // Un créneau choisi qui disparaît (pris entre-temps) est retiré de la sélection.
  const creneauValide = creneau !== null && creneauxDuJour.includes(creneau) ? creneau : null

  const telNormalise = normaliserTelephone(telephone, indicatif)
  const erreurNom = tentative && nom.trim().length < 2 ? 'Indiquez votre nom.' : undefined
  const erreurTel =
    tentative && !telNormalise
      ? `Numéro invalide : ${indicatif === '+237' ? '9' : '10'} chiffres attendus après ${indicatif}.`
      : undefined

  function choisirService(slug: string) {
    setParams({ service: slug }, { replace: true })
    setJour(null)
    setCreneau(null)
    setPage(0)
  }

  function reserver() {
    setTentative(true)
    setErreur(null)
    if (!service || !creneauValide || nom.trim().length < 2 || !telNormalise) return
    reservation.mutate(
      {
        cleIdempotence: cleReservation(service.id, creneauValide),
        serviceId: service.id,
        debut: creneauValide,
        cliente: { nom: nom.trim(), telephone: telNormalise },
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (r) => {
          memoriserRendezVous(r.reference, telNormalise)
          void naviguer(CHEMINS.suiviRendezVous(r.reference), { state: { nouveau: true } })
        },
        onError: (e) => {
          const err = versErreurApp(e)
          setErreur(err.message)
          if (err.code === 'creneau_indisponible') setCreneau(null)
        },
      },
    )
  }

  const pret = service !== null && creneauValide !== null

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
      <EnTetePage
        teinte="sable"
        titre="Rendez-vous"
        intro="Choisissez votre prestation et votre créneau : il vous est réservé aussitôt, puis l’équipe vous le confirme sur WhatsApp."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 pb-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        {/* min-w-0 : la rangée de jours défile dans sa colonne au lieu d’élargir la page. */}
        <div className="flex min-w-0 flex-col gap-12">
          <Etape numero={1} titre="La prestation">
            {services.isError ? (
              <EtatErreur
                message={versErreurApp(services.error).message}
                onReessayer={() => void services.refetch()}
              />
            ) : services.isPending ? (
              <Squelette className="h-28 w-full rounded-panneau" />
            ) : (
              <div role="radiogroup" aria-label="Prestation" className="grid gap-2 sm:grid-cols-3">
                {services.data.map((s) => {
                  const actif = s.slug === serviceSlug
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      onClick={() => {
                        choisirService(s.slug)
                      }}
                      className={cx(classeChoix(actif), 'flex flex-col gap-1 p-4')}
                    >
                      <span className="text-[17px] font-semibold">{s.nom}</span>
                      <span className={cx('text-[13px]', actif ? 'text-fond/75' : 'text-encre-3')}>
                        {formaterDuree(s.dureeMinutes)}
                      </span>
                      <span
                        className={cx(
                          'mt-2 text-[15px] font-semibold',
                          actif ? 'text-or' : 'text-or-texte',
                        )}
                      >
                        {formaterFcfa(s.prix)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </Etape>

          <Etape numero={2} titre="Le jour et l’heure">
            {!service ? (
              <p className="text-[15px] text-encre-3">Choisissez d’abord une prestation.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold text-encre-2">
                    {formaterJour(du, 'court')} – {formaterJour(au, 'court')}
                  </p>
                  <div className="flex gap-1">
                    <BoutonIcone
                      libelle="Jours précédents"
                      disabled={page === 0}
                      onClick={() => {
                        setPage((p) => p - 1)
                        setJour(null)
                      }}
                    >
                      <ChevronLeft />
                    </BoutonIcone>
                    <BoutonIcone
                      libelle="Jours suivants"
                      disabled={page >= PAGES_MAX - 1}
                      onClick={() => {
                        setPage((p) => p + 1)
                        setJour(null)
                      }}
                    >
                      <ChevronRight />
                    </BoutonIcone>
                  </div>
                </div>

                {creneaux.isError ? (
                  <EtatErreur
                    message={versErreurApp(creneaux.error).message}
                    onReessayer={() => void creneaux.refetch()}
                  />
                ) : (
                  <ul
                    aria-label="Jours"
                    className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0"
                  >
                    {jours.map((j) => {
                      const libre = j.creneaux.length > 0
                      const actif = j.jour === jour
                      const [nomJour, numero, mois] = formaterJour(j.jour, 'court').split(' ')
                      return (
                        <li key={j.jour} className="shrink-0 snap-start">
                          <button
                            type="button"
                            aria-pressed={actif}
                            disabled={!libre || creneaux.isPending}
                            aria-label={`${formaterJour(j.jour)}, ${libre ? `${String(j.creneaux.length)} créneaux` : 'indisponible'}`}
                            onClick={() => {
                              setJour(j.jour)
                              setCreneau(null)
                            }}
                            className={cx(
                              classeChoix(actif, !libre),
                              'flex w-[72px] flex-col items-center gap-0.5 py-3 sm:w-full',
                            )}
                          >
                            <span className="text-[13px] capitalize">{nomJour}</span>
                            <span className="chiffres text-[21px] font-semibold">{numero}</span>
                            <span className="text-[11px]">
                              {creneaux.isPending ? '…' : libre ? mois : '—'}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {jour && creneauxDuJour.length > 0 && (
                  <div className="flex flex-col gap-4 rounded-panneau bg-carte p-5 shadow-panneau">
                    <p className="text-[15px] font-semibold">{initiale(formaterJour(jour))}</p>
                    {(['matin', 'apres-midi'] as const).map((m) => {
                      const liste = creneauxDuJour.filter((c) => moment(c) === m)
                      if (liste.length === 0) return null
                      return (
                        <div key={m}>
                          <p className="mb-2 text-[13px] text-encre-3">
                            {m === 'matin' ? 'Matin' : 'Après-midi'}
                          </p>
                          <div
                            role="radiogroup"
                            aria-label={
                              m === 'matin' ? 'Heures du matin' : 'Heures de l’après-midi'
                            }
                            className="flex flex-wrap gap-2"
                          >
                            {liste.map((c) => {
                              const actif = c === creneauValide
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  role="radio"
                                  aria-checked={actif}
                                  onClick={() => {
                                    setCreneau(c)
                                    setErreur(null)
                                  }}
                                  className={cx(
                                    'chiffres min-h-11 min-w-20 rounded-full px-4 text-[15px] font-semibold transition-colors duration-300',
                                    actif
                                      ? 'bg-encre text-fond'
                                      : 'bg-carte-2 text-encre hover:bg-carte-3',
                                  )}
                                >
                                  {formaterHeure(c)}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {!creneaux.isPending && jours.every((j) => j.creneaux.length === 0) && (
                  <Alerte ton="info" titre="Aucun créneau libre sur ces deux semaines.">
                    Regardez les jours suivants, ou écrivez-nous : nous trouverons un moment.
                  </Alerte>
                )}
              </>
            )}
          </Etape>

          <Etape numero={3} titre="Vos coordonnées">
            <div className="grid gap-5 sm:grid-cols-2">
              <Champ libelle="Nom et prénom" obligatoire erreur={erreurNom}>
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
                libelle="Téléphone WhatsApp"
                obligatoire
                erreur={erreurTel}
                aide="Pour vous confirmer le rendez-vous."
              >
                {(a) => (
                  <div className="flex gap-2">
                    <div className="w-[7.5rem] shrink-0">
                      <Selection
                        aria-label="Indicatif"
                        value={indicatif}
                        onChange={(e) => {
                          setIndicatif(e.target.value as Indicatif)
                        }}
                      >
                        <option value="+237">+237</option>
                        <option value="+225">+225</option>
                      </Selection>
                    </div>
                    <Saisie
                      {...a}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder={indicatif === '+237' ? '6 90 00 00 00' : '07 00 00 00 00'}
                      value={telephone}
                      onChange={(e) => {
                        setTelephone(e.target.value)
                      }}
                    />
                  </div>
                )}
              </Champ>
              <Champ libelle="Une précision ? (facultatif)" className="sm:col-span-2">
                {(a) => (
                  <ZoneTexte
                    {...a}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value)
                    }}
                    placeholder="Ex. : j’apporte ma perruque, première pose de cils…"
                  />
                )}
              </Champ>
            </div>
          </Etape>
        </div>

        {/* Récapitulatif et validation */}
        <aside className="flex flex-col gap-5 self-start rounded-panneau bg-carte p-6 shadow-panneau lg:sticky lg:top-24">
          <h2 className="text-[19px] font-semibold">Votre rendez-vous</h2>
          <dl className="flex flex-col gap-3 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-encre-3">Prestation</dt>
              <dd className="text-right font-semibold">{service?.nom ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-encre-3">Quand</dt>
              <dd className="text-right font-semibold">
                {creneauValide && jour ? (
                  <>
                    {initiale(formaterJour(jour))} à {formaterHeure(creneauValide)}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            {service && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-encre-3">Durée</dt>
                  <dd>{formaterDuree(service.dureeMinutes)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-filet pt-3 text-[17px]">
                  <dt className="font-semibold">Prix</dt>
                  <dd className="chiffres font-semibold text-or-texte">
                    {formaterFcfa(service.prix)}
                  </dd>
                </div>
              </>
            )}
          </dl>
          <p className="text-[13px] text-encre-3">
            Réglé au salon, en espèces ou par Mobile Money.
          </p>
          {erreur && <Alerte ton="danger" titre={erreur} />}
          {tentative && !pret && (
            <p role="alert" className="text-[13px] text-alerte">
              Choisissez une prestation, un jour et une heure.
            </p>
          )}
          <Bouton
            taille="grand"
            icone={<CalendarCheck />}
            enCours={reservation.isPending}
            onClick={reserver}
            className="w-full"
          >
            Réserver ce créneau
          </Bouton>
          <ul className="flex flex-col gap-2 border-t border-filet pt-4 text-[13px] text-encre-3 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-or-texte">
            {parametres.data?.ville_salon && (
              <li className="flex gap-2">
                <MapPin aria-hidden="true" />
                Salon à {parametres.data.ville_salon}
              </li>
            )}
            {parametres.data?.horaires_salon && (
              <li className="flex gap-2">
                <Clock aria-hidden="true" />
                {parametres.data.horaires_salon}
              </li>
            )}
          </ul>
          <BoutonWhatsApp
            variante="fantome"
            taille="petit"
            libelle="Une question avant de réserver ?"
            message="Bonjour, j’ai une question avant de prendre rendez-vous."
            className="self-start"
          />
        </aside>
      </div>
    </div>
  )
}
