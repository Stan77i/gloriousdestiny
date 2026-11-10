import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Check, CircleCheck } from 'lucide-react'
import { useLocation, useParams } from 'react-router'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { EtatChargement, EtatErreur } from '@/components/ui/Etats'
import { Champ, Saisie } from '@/components/ui/Champs'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { ETAPES_COMMANDE, STATUT_COMMANDE, STATUT_LIVRAISON } from '@/domain/libelles'
import { telephoneMemorise } from '@/features/commande/cleCommande'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDateHeure } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import { normaliserTelephone } from '@/lib/format/telephone'
import { suivreCommande, type ResumeCommande } from '@/services/commandes.service'

function Frise({ statut }: { statut: ResumeCommande['statut'] }) {
  if (statut === 'annulee' || statut === 'retournee') {
    return <Badge ton={STATUT_COMMANDE[statut].ton}>{STATUT_COMMANDE[statut].libelle}</Badge>
  }
  const atteinte = ETAPES_COMMANDE.findIndex((e) => e.statut === statut)
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Avancement de la commande">
      {ETAPES_COMMANDE.map((e, i) => {
        const fait = i <= atteinte
        return (
          <li
            key={e.statut}
            aria-current={i === atteinte ? 'step' : undefined}
            className="flex flex-col gap-2"
          >
            <span className={cx('h-1 rounded-full', fait ? 'bg-or' : 'bg-surface-3')} />
            <span
              className={cx(
                'flex items-center gap-1 text-[13px]',
                fait ? 'text-ivoire' : 'text-ivoire-3',
              )}
            >
              {fait && <Check aria-hidden="true" className="size-3.5 text-or" />}
              {e.libelle}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Detail({ c, nouvelle }: { c: ResumeCommande; nouvelle: boolean }) {
  return (
    <div className="grid gap-10 pb-10 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-8">
        {nouvelle && (
          <Alerte ton="succes" titre={`Commande ${c.reference} enregistrée`}>
            Notre équipe vous contacte pour la confirmer et convenir de la livraison. Gardez votre
            référence : elle permet de suivre votre commande ici.
          </Alerte>
        )}
        <section aria-labelledby="titre-avancement" className="flex flex-col gap-4">
          <h2 id="titre-avancement" className="text-[19px] font-semibold">
            Avancement
          </h2>
          <Frise statut={c.statut} />
          <p className="text-[13px] text-ivoire-3">
            Commandée le {formaterDateHeure(c.created_at)}
          </p>
        </section>
        <section aria-labelledby="titre-articles">
          <h2 id="titre-articles" className="mb-3 text-[19px] font-semibold">
            Articles
          </h2>
          <ul className="divide-y divide-filet border-y border-filet">
            {c.lignes.map((l) => (
              <li key={l.variante_id} className="flex justify-between gap-4 py-4 text-[15px]">
                <span>
                  {l.nom} <span className="chiffres text-ivoire-3">× {l.quantite}</span>
                </span>
                <span className="chiffres">{formaterFcfa(l.total_fcfa)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between text-[17px] font-semibold">
            <span>Total</span>
            <span className="chiffres text-or-clair">{formaterFcfa(c.total_fcfa)}</span>
          </p>
        </section>
      </div>
      <aside className="flex flex-col gap-5 self-start rounded-panneau border border-filet bg-surface-1 p-6">
        <h2 className="text-[17px] font-semibold">Livraison</h2>
        {c.livraison && (
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-ivoire-3">Adresse</dt>
              <dd className="mt-0.5 text-ivoire-2">
                {[c.livraison.adresse, c.livraison.quartier, c.livraison.ville]
                  .filter(Boolean)
                  .join(', ')}
              </dd>
            </div>
            <div>
              <dt className="text-ivoire-3">Point de repère</dt>
              <dd className="mt-0.5 text-ivoire-2">{c.livraison.point_de_repere}</dd>
            </div>
            <div>
              <dt className="text-ivoire-3">État</dt>
              <dd className="mt-0.5 text-ivoire-2">
                {STATUT_LIVRAISON[c.livraison.statut as keyof typeof STATUT_LIVRAISON]}
              </dd>
            </div>
          </dl>
        )}
        <p className="text-[13px] leading-relaxed text-ivoire-3">
          Paiement à la livraison, en espèces ou par Mobile Money.
        </p>
        <BoutonWhatsApp
          libelle="Une question sur ma commande"
          message={`Bonjour, je vous écris au sujet de ma commande ${c.reference}.`}
          className="w-full"
        />
        <p className="text-[13px] text-ivoire-3">Indiquez votre référence {c.reference}.</p>
      </aside>
    </div>
  )
}

/** Confirmation (juste après la commande) et suivi d'une commande par référence + téléphone. */
export function PageSuiviCommande() {
  const { reference = '' } = useParams()
  const ref = reference.toUpperCase()
  const location = useLocation()
  const nouvelle = (location.state as { nouvelle?: boolean } | null)?.nouvelle === true
  const [telephone, setTelephone] = useState<string | null>(() => telephoneMemorise(ref))
  const [saisie, setSaisie] = useState('')
  const [erreurSaisie, setErreurSaisie] = useState<string | null>(null)
  useTitreDocument(`Commande ${ref}`)

  const suivi = useQuery({
    queryKey: ['suivi', ref, telephone],
    queryFn: () => suivreCommande(ref, telephone ?? ''),
    enabled: telephone !== null,
  })

  function rechercher() {
    const tel = normaliserTelephone(saisie, '+237') ?? normaliserTelephone(saisie, '+225')
    if (!tel) {
      setErreurSaisie('Numéro invalide. Indiquez le numéro utilisé pour la commande.')
      return
    }
    setErreurSaisie(null)
    setTelephone(tel)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
      <EnTetePage
        titre={nouvelle ? 'Merci !' : 'Suivi de commande'}
        intro={
          <>
            Référence <span className="chiffres font-semibold text-ivoire">{ref}</span>
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
          className="flex max-w-md flex-col gap-4 pb-10"
        >
          {suivi.isSuccess && suivi.data === null && (
            <Alerte ton="alerte" titre="Aucune commande ne correspond à ce numéro." />
          )}
          <Champ
            libelle="Téléphone utilisé pour la commande"
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
              />
            )}
          </Champ>
          <Bouton type="submit" icone={<CircleCheck />} className="self-start">
            Voir ma commande
          </Bouton>
        </form>
      ) : suivi.isPending ? (
        <EtatChargement libelle="Recherche de la commande…" />
      ) : suivi.isError ? (
        <EtatErreur
          message={versErreurApp(suivi.error).message}
          onReessayer={() => void suivi.refetch()}
        />
      ) : suivi.data ? (
        <Detail c={suivi.data} nouvelle={nouvelle} />
      ) : null}
    </div>
  )
}
