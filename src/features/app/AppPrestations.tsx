import { useState } from 'react'
import { Check, Info } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { BadgeArticle } from '@/components/produit/BadgesArticle'
import { Alerte } from '@/components/ui/Alerte'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { OptionsIndicatif } from '@/components/ui/OptionsIndicatif'
import { useDemandePrestation, usePrestations } from '@/features/catalogue/prestations'
import { EnvoiWhatsApp } from '@/features/whatsapp/EnvoiWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { decalerJour, jourSalon } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import {
  longueurAttendue,
  normaliserTelephone,
  PAYS_TELEPHONE,
  type Indicatif,
} from '@/lib/format/telephone'
import { PageIntrouvable } from '@/pages/errors/PageIntrouvable'
import { BarreAction, BoutonRetour } from './elements'
import { classesCta } from './classes'

/** Miroir au fil d'or (en-tête du salon) : se trace à l'apparition. */
function Miroir() {
  return (
    <svg
      viewBox="0 0 64 80"
      aria-hidden="true"
      className="h-20 w-16 shrink-0 text-or-texte"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
    >
      <ellipse className="trace-fil" pathLength={1} cx={32} cy={30} rx={20} ry={24} />
      <path className="trace-fil" pathLength={1} d="M32 54v18M22 74h20" />
      <path className="trace-fil" pathLength={1} d="M24 20c3-5 8-7 13-6" opacity={0.6} />
    </svg>
  )
}

/** Prestations de l'application : en-tête sable, une carte par prestation. */
export function AppPrestations() {
  useTitreDocument('Prestations')
  const prestations = usePrestations()
  return (
    <div className="pt-1">
      <header className="flex items-start gap-3 rounded-[28px] bg-sable p-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-[34px] leading-none font-semibold tracking-[-0.035em] text-encre">
            Nos prestations
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-encre-2">
            Au salon, sur demande. Vous proposez un moment, l’équipe confirme sur WhatsApp.
          </p>
        </div>
        <Miroir />
      </header>
      {prestations.isError ? (
        <div className="mt-6">
          <EtatErreur
            message={versErreurApp(prestations.error).message}
            onReessayer={() => void prestations.refetch()}
          />
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {prestations.isPending
            ? Array.from({ length: 4 }, (_, i) => (
                <li key={i}>
                  <Squelette className="h-24 w-full rounded-[28px]" />
                </li>
              ))
            : prestations.data.map((p, i) => (
                <li
                  key={p.id}
                  className="relative flex items-start gap-3.5 rounded-[28px] bg-carte p-4 shadow-panneau transition-transform active:scale-[0.985]"
                >
                  <span className="chiffres grid size-[52px] shrink-0 place-items-center rounded-full bg-sable text-[15px] font-bold text-encre">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[17px] font-semibold text-encre">
                      <Link
                        to={CHEMINS.prestation(p.slug)}
                        className="no-underline after:absolute after:inset-0 after:content-['']"
                      >
                        {p.nom}
                      </Link>
                    </h2>
                    {p.description && (
                      <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-encre-3">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="chiffres text-[15px] font-semibold text-or-texte">
                        {formaterFcfa(p.prix)}
                      </span>
                      {p.badges.coupDeCoeur && <BadgeArticle type="coup-de-coeur" indice={0} />}
                      {p.badges.tresDemandee && <BadgeArticle type="tres-demandee" indice={1} />}
                    </div>
                  </div>
                </li>
              ))}
        </ul>
      )}
    </div>
  )
}

const HEURES = Array.from({ length: 13 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`)

function joursProposes(): { jour: string; court: string; numero: string }[] {
  const demain = decalerJour(jourSalon(new Date()), 1)
  return Array.from({ length: 10 }, (_, i) => {
    const jour = decalerJour(demain, i)
    const d = new Date(`${jour}T12:00:00`)
    return {
      jour,
      court: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
      numero: String(d.getDate()),
    }
  })
}

/** Demande de prestation : jour, heure, coordonnées ; l'équipe confirme sur WhatsApp. */
export function AppDemandePrestation() {
  const { slug = '' } = useParams()
  const prestations = usePrestations()
  const demande = useDemandePrestation()
  const [cle] = useState(() => crypto.randomUUID())
  const [jours] = useState(joursProposes)
  const [date, setDate] = useState('')
  const [heure, setHeure] = useState('')
  const [nom, setNom] = useState('')
  const [indicatif, setIndicatif] = useState<Indicatif>('+237')
  const [telephone, setTelephone] = useState('')
  const [precision, setPrecision] = useState('')
  const [tentative, setTentative] = useState(false)
  const prestation = prestations.data?.find((p) => p.slug === slug)
  useTitreDocument(prestation?.nom)

  if (prestations.isPending) return <Squelette className="mt-16 h-48 w-full rounded-[28px]" />
  if (prestations.isError)
    return (
      <div className="pt-16">
        <EtatErreur
          message={versErreurApp(prestations.error).message}
          onReessayer={() => void prestations.refetch()}
        />
      </div>
    )
  if (!prestation) return <PageIntrouvable />

  const tel = normaliserTelephone(telephone, indicatif)
  const erreurs = {
    jour: !date ? 'Choisissez un jour.' : undefined,
    heure: !heure ? 'Choisissez une heure.' : undefined,
    nom: nom.trim().length < 2 ? 'Indiquez votre nom.' : undefined,
    telephone: !tel
      ? `Numéro invalide : ${longueurAttendue(indicatif)} attendus après ${indicatif}.`
      : undefined,
  }
  const valide = !Object.values(erreurs).some(Boolean)
  const reponse = demande.data

  if (reponse) {
    return (
      <div className="pt-1">
        <section className="rounded-[28px] bg-menthe p-6 text-sur-menthe">
          <span className="grid size-14 place-items-center rounded-full bg-sur-menthe text-menthe">
            <Check aria-hidden="true" className="coche-trace size-7" strokeWidth={2.2} />
          </span>
          <h1 className="mt-4 text-[28px] leading-tight font-semibold tracking-[-0.03em]">
            Demande envoyée
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed">
            {prestation.nom}, le{' '}
            {new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}{' '}
            à {heure.replace(':', ' h ')}. Le rendez-vous sera confirmé par l’équipe sur WhatsApp.
          </p>
          <p className="chiffres mt-4 inline-block rounded-full bg-carte/60 px-3.5 py-1.5 text-[14px] font-semibold">
            {reponse.reference}
          </p>
        </section>
        <div className="mt-4">
          <EnvoiWhatsApp
            objet="prestation"
            message={reponse.message_whatsapp}
            dejaOuvert={false}
            onOuverture={() => Promise.resolve()}
          />
        </div>
        <Link to={CHEMINS.prestations} className={`${classesCta('encre')} mt-4 min-h-12`}>
          Retour aux prestations
        </Link>
      </div>
    )
  }

  const erreur = (m: string | undefined) =>
    tentative && m ? <p className="mt-1.5 text-[13px] font-semibold text-danger">{m}</p> : null
  const champ =
    'min-h-12 w-full rounded-full bg-carte px-4 text-[16px] text-encre shadow-[inset_0_0_0_1px_var(--color-filet-champ)] outline-none focus:shadow-[inset_0_0_0_2px_var(--color-encre)]'

  return (
    <div className="pt-1">
      <header className="pb-3">
        <BoutonRetour vers={CHEMINS.prestations} />
      </header>
      <section className="rounded-[28px] bg-sable p-5">
        <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.035em] text-encre">
          {prestation.nom}
        </h1>
        <p className="chiffres mt-1 text-[21px] font-semibold text-or-texte">
          {formaterFcfa(prestation.prix)}
        </p>
        {prestation.description && (
          <p className="mt-2 text-[14px] leading-relaxed text-encre-2">{prestation.description}</p>
        )}
      </section>

      <fieldset className="mt-5">
        <legend className="mb-2 text-[15px] font-semibold text-encre">Jour</legend>
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1">
          {jours.map((j) => (
            <button
              key={j.jour}
              type="button"
              aria-pressed={date === j.jour}
              onClick={() => {
                setDate(date === j.jour ? '' : j.jour)
              }}
              className={cx(
                'flex h-[72px] w-[58px] shrink-0 flex-col items-center justify-center rounded-[22px] transition-colors',
                date === j.jour
                  ? 'bg-encre text-fond'
                  : 'bg-carte text-encre shadow-[inset_0_0_0_1px_var(--color-filet)]',
              )}
            >
              <span className="text-[12px] capitalize opacity-75">{j.court}</span>
              <span className="chiffres text-[19px] font-semibold">{j.numero}</span>
            </button>
          ))}
        </div>
        {erreur(erreurs.jour)}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-[15px] font-semibold text-encre">Heure</legend>
        <div className="grid grid-cols-4 gap-2">
          {HEURES.map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={heure === h}
              onClick={() => {
                setHeure(heure === h ? '' : h)
              }}
              className={cx(
                'chiffres min-h-11 rounded-full text-[14px] font-semibold transition-colors',
                heure === h
                  ? 'bg-encre text-fond'
                  : 'bg-carte text-encre shadow-[inset_0_0_0_1px_var(--color-filet)]',
              )}
            >
              {h}
            </button>
          ))}
        </div>
        {erreur(erreurs.heure)}
      </fieldset>

      <div className="mt-5 flex flex-col gap-3">
        <div>
          <input
            aria-label="Nom et prénom"
            placeholder="Nom et prénom"
            autoComplete="name"
            value={nom}
            onChange={(e) => {
              setNom(e.target.value)
            }}
            className={champ}
          />
          {erreur(erreurs.nom)}
        </div>
        <div>
          <div className="flex gap-2">
            <select
              aria-label="Indicatif"
              value={indicatif}
              onChange={(e) => {
                setIndicatif(e.target.value as Indicatif)
              }}
              className={cx(champ, 'w-[7.5rem] shrink-0 font-semibold')}
            >
              <OptionsIndicatif />
            </select>
            <input
              aria-label="Numéro WhatsApp"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={`WhatsApp · ${PAYS_TELEPHONE[indicatif].exemple}`}
              value={telephone}
              onChange={(e) => {
                setTelephone(e.target.value)
              }}
              className={champ}
            />
          </div>
          {erreur(erreurs.telephone)}
        </div>
        <textarea
          aria-label="Une précision (facultatif)"
          placeholder="Une précision ? (facultatif)"
          maxLength={500}
          rows={3}
          value={precision}
          onChange={(e) => {
            setPrecision(e.target.value)
          }}
          className={cx(champ, 'rounded-[22px] py-3')}
        />
      </div>

      <p className="mt-4 flex gap-2.5 rounded-[22px] bg-carte-2 p-4 text-[14px] leading-relaxed text-encre-2">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-or-texte" />
        C’est une demande : le rendez-vous n’est confirmé qu’après la réponse de l’équipe sur
        WhatsApp.
      </p>
      {demande.isError && (
        <div className="mt-3">
          <Alerte ton="danger" titre={versErreurApp(demande.error).message} />
        </div>
      )}

      <BarreAction>
        <button
          type="button"
          disabled={demande.isPending}
          className={classesCta('or')}
          onClick={() => {
            setTentative(true)
            if (!valide || !tel) return
            demande.mutate({
              cleIdempotence: cle,
              service: prestation.slug,
              nom: nom.trim(),
              telephone: tel,
              date,
              heure,
              precision: precision.trim() || undefined,
            })
          }}
        >
          {demande.isPending ? 'Envoi…' : 'Envoyer ma demande'}
        </button>
      </BarreAction>
    </div>
  )
}
