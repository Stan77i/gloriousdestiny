import { useState } from 'react'
import { ArrowLeft, Check, MessageCircle, PackageCheck, Truck, Wallet, X } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { EtatChargement, EtatErreur } from '@/components/ui/Etats'
import { Champ, Saisie, Selection, ZoneTexte } from '@/components/ui/Champs'
import { Modale } from '@/components/ui/Modale'
import { Panneau } from '@/components/ui/Panneau'
import { classesBouton } from '@/components/ui/classesBouton'
import {
  EVENEMENT_COMMANDE,
  MODE_PAIEMENT,
  STATUT_COMMANDE,
  STATUT_LIVRAISON,
  STATUT_PAIEMENT,
} from '@/domain/libelles'
import { aRole } from '@/domain/roles'
import { useAuth } from '@/features/auth/useAuth'
import {
  useActionCommande,
  useCommande,
  useMessageWhatsapp,
} from '@/features/commandes-admin/requetes'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDateHeure } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import { PageIntrouvable } from '@/pages/errors/PageIntrouvable'
import type { DetailCommande } from '@/services/commandes.service'

/** Lien WhatsApp vers la cliente, message de confirmation pré-rempli (numéro connu). */
function lienCliente(c: DetailCommande): string {
  const message = `Bonjour ${c.cliente.nom}, ici Glorious Destiny. Nous avons bien reçu votre commande ${c.reference} (${formaterFcfa(c.total)}). Nous vous contactons pour confirmer la livraison à ${c.ville}.`
  return `https://wa.me/${c.cliente.telephone.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`
}

function ModaleAnnulation({
  ouverte,
  onFermer,
  onValider,
  enCours,
}: {
  ouverte: boolean
  onFermer: () => void
  onValider: (motif: string) => void
  enCours: boolean
}) {
  const [motif, setMotif] = useState('')
  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre="Annuler la commande ?"
      description="Le stock réservé sera libéré. La commande et son historique sont conservés."
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Garder la commande
          </Bouton>
          <Bouton
            variante="danger"
            enCours={enCours}
            disabled={motif.trim().length < 3}
            onClick={() => {
              onValider(motif.trim())
            }}
          >
            Annuler la commande
          </Bouton>
        </>
      }
    >
      <Champ libelle="Motif" obligatoire aide="Visible dans l’historique de la commande.">
        {(a) => (
          <ZoneTexte
            {...a}
            value={motif}
            onChange={(e) => {
              setMotif(e.target.value)
            }}
            placeholder="Ex. : la cliente ne répond pas depuis 48 h"
          />
        )}
      </Champ>
    </Modale>
  )
}

function ModalePaiement({
  ouverte,
  total,
  onFermer,
  onValider,
  enCours,
}: {
  ouverte: boolean
  total: number
  onFermer: () => void
  onValider: (p: { mode: 'especes' | 'mobile_money'; montant: number; reference?: string }) => void
  enCours: boolean
}) {
  const [mode, setMode] = useState<'especes' | 'mobile_money'>('especes')
  const [montant, setMontant] = useState(String(total))
  const [reference, setReference] = useState('')
  const valeur = Number.parseInt(montant.replace(/\s/g, ''), 10)
  const valide =
    Number.isInteger(valeur) && valeur > 0 && (mode === 'especes' || reference.trim().length > 0)
  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre="Enregistrer le paiement"
      description="Encaissement à la livraison."
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton
            enCours={enCours}
            disabled={!valide}
            onClick={() => {
              onValider({
                mode,
                montant: valeur,
                ...(mode === 'mobile_money' ? { reference: reference.trim() } : {}),
              })
            }}
          >
            Enregistrer
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Champ libelle="Mode de paiement" obligatoire>
          {(a) => (
            <Selection
              {...a}
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as 'especes' | 'mobile_money')
              }}
            >
              <option value="especes">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
            </Selection>
          )}
        </Champ>
        <Champ
          libelle="Montant encaissé (FCFA)"
          obligatoire
          aide={`Total de la commande : ${formaterFcfa(total)}`}
        >
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={montant}
              onChange={(e) => {
                setMontant(e.target.value)
              }}
            />
          )}
        </Champ>
        {mode === 'mobile_money' && (
          <Champ
            libelle="Référence de la transaction"
            obligatoire
            aide="Numéro reçu par SMS (Orange Money, MTN MoMo…)."
          >
            {(a) => (
              <Saisie
                {...a}
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value)
                }}
              />
            )}
          </Champ>
        )}
      </div>
    </Modale>
  )
}

function PanneauWhatsApp({ id, ouvertLe }: { id: string; ouvertLe: string | null }) {
  const message = useMessageWhatsapp(id)
  return (
    <Panneau
      titre="Message WhatsApp"
      sousTitre={
        ouvertLe
          ? `Ouvert par la cliente le ${formaterDateHeure(ouvertLe)}`
          : 'Pas encore ouvert par la cliente'
      }
    >
      {message.data ? (
        <details className="group">
          <summary className="cursor-pointer text-sm text-or-clair hover:text-or">
            Voir le message reçu
          </summary>
          <pre className="mt-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-ivoire-2">
            {message.data}
          </pre>
        </details>
      ) : message.isError ? (
        <p className="text-sm text-ivoire-3">{versErreurApp(message.error).message}</p>
      ) : (
        <p className="text-sm text-ivoire-3">Chargement…</p>
      )}
    </Panneau>
  )
}

/** Détail d'une commande : articles, cliente, livraison, paiement, historique, actions. */
export function PageAdminCommande() {
  const { id = '' } = useParams()
  const commande = useCommande(id)
  const action = useActionCommande(id)
  const auth = useAuth()
  const { notifier } = useNotifications()
  const role = auth.statut === 'connecte' ? (auth.profil?.role ?? null) : null
  const [modale, setModale] = useState<'annulation' | 'paiement' | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  useTitreDocument(commande.data?.reference ?? 'Commande')

  if (commande.isPending) return <EtatChargement libelle="Chargement de la commande…" />
  if (commande.isError) {
    return (
      <EtatErreur
        message={versErreurApp(commande.error).message}
        onReessayer={() => void commande.refetch()}
      />
    )
  }
  if (!commande.data) return <PageIntrouvable />
  const c = commande.data

  function lancer(a: Parameters<typeof action.mutate>[0], succes: string) {
    action.mutate(a, {
      onSuccess: () => {
        notifier(succes, 'succes')
        setModale(null)
      },
      onError: (e) => {
        notifier(versErreurApp(e).message, 'erreur')
      },
    })
  }

  const ventes = aRole(role, ['ventes'])
  const logistique = aRole(role, ['logistique', 'ventes'])
  const encaissable =
    ['confirmee', 'expediee', 'livree'].includes(c.statut) && c.statutPaiement === 'non_paye'

  return (
    <section className="flex flex-col gap-6">
      <Link
        to="/admin/commandes"
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-ivoire-3 no-underline hover:text-ivoire [&_svg]:size-4"
      >
        <ArrowLeft aria-hidden="true" />
        Commandes
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="chiffres text-[28px] font-semibold">{c.reference}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge ton={STATUT_COMMANDE[c.statut].ton}>{STATUT_COMMANDE[c.statut].libelle}</Badge>
            <Badge ton={STATUT_PAIEMENT[c.statutPaiement].ton}>
              {STATUT_PAIEMENT[c.statutPaiement].libelle}
            </Badge>
            <span className="text-[13px] text-ivoire-3">
              Reçue le {formaterDateHeure(c.creeLe)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.statut === 'nouvelle' && ventes && (
            <Bouton
              icone={<Check />}
              enCours={action.isPending}
              onClick={() => {
                lancer({ type: 'confirmer' }, `${c.reference} confirmée.`)
              }}
            >
              Confirmer
            </Bouton>
          )}
          {c.statut === 'confirmee' && logistique && (
            <Bouton
              icone={<Truck />}
              enCours={action.isPending}
              onClick={() => {
                lancer({ type: 'expedier' }, `${c.reference} expédiée. Stock mis à jour.`)
              }}
            >
              Marquer expédiée
            </Bouton>
          )}
          {c.statut === 'expediee' && logistique && (
            <Bouton
              icone={<PackageCheck />}
              enCours={action.isPending}
              onClick={() => {
                lancer({ type: 'livrer' }, `${c.reference} livrée.`)
              }}
            >
              Marquer livrée
            </Bouton>
          )}
          {encaissable && logistique && (
            <Bouton
              variante="secondaire"
              icone={<Wallet />}
              onClick={() => {
                setModale('paiement')
              }}
            >
              Encaisser
            </Bouton>
          )}
          {(c.statut === 'nouvelle' || c.statut === 'confirmee') && ventes && (
            <Bouton
              variante="danger"
              icone={<X />}
              onClick={() => {
                setModale('annulation')
              }}
            >
              Annuler
            </Bouton>
          )}
        </div>
      </header>

      {c.statut === 'nouvelle' && c.expireLe && (
        <Alerte ton="alerte" titre="À confirmer avec la cliente">
          Sans confirmation, la commande expire le {formaterDateHeure(c.expireLe)} et le stock
          réservé est libéré.
        </Alerte>
      )}
      {c.statut === 'annulee' && c.motifAnnulation && (
        <Alerte ton="info" titre="Commande annulée">
          {c.motifAnnulation}
        </Alerte>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <Panneau titre="Articles" corpsClassName="p-0 sm:p-0">
            <ul className="divide-y divide-filet">
              {c.lignes.map((l) => (
                <li
                  key={l.id}
                  className="flex justify-between gap-4 px-5 py-3.5 text-[15px] sm:px-6"
                >
                  <span>
                    {l.nom} <span className="chiffres text-ivoire-3">× {l.quantite}</span>
                    <span className="chiffres block text-[13px] text-ivoire-3">
                      {formaterFcfa(l.prixUnitaire)} l’unité
                    </span>
                  </span>
                  <span className="chiffres">{formaterFcfa(l.total)}</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1.5 border-t border-filet px-5 py-4 text-sm sm:px-6">
              <div className="flex justify-between">
                <dt className="text-ivoire-3">Sous-total</dt>
                <dd className="chiffres">{formaterFcfa(c.sousTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ivoire-3">Livraison</dt>
                <dd className="chiffres">{formaterFcfa(c.fraisLivraison)}</dd>
              </div>
              <div className="flex justify-between text-[17px] font-semibold">
                <dt>Total</dt>
                <dd className="chiffres text-or-clair">
                  {formaterFcfa(c.total)}{' '}
                  <span className="text-[13px] font-normal text-ivoire-3">{c.devise}</span>
                </dd>
              </div>
            </dl>
          </Panneau>

          <Panneau titre="Historique">
            <ol className="flex flex-col gap-4">
              {c.historique.map((h) => (
                <li key={h.id} className="grid grid-cols-[12px_1fr] gap-3">
                  <span aria-hidden="true" className="mt-1.5 size-2 rounded-full bg-or" />
                  <div>
                    <p className="text-sm font-semibold">
                      {EVENEMENT_COMMANDE[h.evenement] ?? h.evenement}
                    </p>
                    <p className="text-[13px] text-ivoire-3">{formaterDateHeure(h.le)}</p>
                    {h.motif && <p className="mt-1 text-[13px] text-ivoire-2">{h.motif}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Panneau>
        </div>

        <div className="flex flex-col gap-4">
          <Panneau
            titre="Cliente"
            action={
              <a
                href={lienCliente(c)}
                target="_blank"
                rel="noopener noreferrer"
                className={classesBouton('secondaire', 'petit', 'no-underline')}
              >
                <MessageCircle aria-hidden="true" />
                WhatsApp
              </a>
            }
          >
            <p className="text-[17px] font-semibold">
              <Link
                to={`/admin/clientes/${c.cliente.id}`}
                className="text-ivoire no-underline hover:text-or-clair"
              >
                {c.cliente.nom}
              </Link>
            </p>
            <p className="chiffres mt-1 text-sm text-ivoire-2">{c.cliente.telephone}</p>
          </Panneau>

          <PanneauWhatsApp id={c.id} ouvertLe={c.whatsappOuvertLe} />

          <Panneau
            titre="Livraison"
            sousTitre={
              c.livraison
                ? STATUT_LIVRAISON[c.livraison.statut as keyof typeof STATUT_LIVRAISON]
                : undefined
            }
          >
            {c.livraison && (
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-ivoire-3">Adresse</dt>
                  <dd className="mt-0.5">
                    {[c.livraison.adresse, c.livraison.quartier, c.ville]
                      .filter(Boolean)
                      .join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-ivoire-3">Point de repère</dt>
                  <dd className="mt-0.5">{c.livraison.pointDeRepere}</dd>
                </div>
                {c.livraison.expedieeLe && (
                  <div>
                    <dt className="text-ivoire-3">Expédiée</dt>
                    <dd className="mt-0.5">{formaterDateHeure(c.livraison.expedieeLe)}</dd>
                  </div>
                )}
                {c.livraison.livreeLe && (
                  <div>
                    <dt className="text-ivoire-3">Livrée</dt>
                    <dd className="mt-0.5">{formaterDateHeure(c.livraison.livreeLe)}</dd>
                  </div>
                )}
              </dl>
            )}
          </Panneau>

          {c.statutPaiement === 'paye' && c.modePaiement && (
            <Panneau titre="Paiement">
              <p className="text-sm">
                {MODE_PAIEMENT[c.modePaiement]} ·{' '}
                <span className="chiffres">{formaterFcfa(c.montantEncaisse ?? 0)}</span>
              </p>
              {c.referencePaiement && (
                <p className="chiffres mt-1 text-[13px] text-ivoire-3">
                  Réf. {c.referencePaiement}
                </p>
              )}
              {c.payeLe && (
                <p className="mt-1 text-[13px] text-ivoire-3">{formaterDateHeure(c.payeLe)}</p>
              )}
            </Panneau>
          )}

          <Panneau titre="Notes internes" sousTitre="Visibles par l’équipe uniquement">
            <ZoneTexte
              aria-label="Notes internes"
              value={notes ?? c.notesInternes ?? ''}
              onChange={(e) => {
                setNotes(e.target.value)
              }}
            />
            {notes !== null && notes !== (c.notesInternes ?? '') && (
              <Bouton
                taille="petit"
                variante="secondaire"
                className="mt-3"
                enCours={action.isPending}
                onClick={() => {
                  action.mutate(
                    { type: 'annoter', notes },
                    {
                      onSuccess: () => {
                        setNotes(null)
                        notifier('Notes enregistrées.', 'succes')
                      },
                      onError: (e) => {
                        notifier(versErreurApp(e).message, 'erreur')
                      },
                    },
                  )
                }}
              >
                Enregistrer les notes
              </Bouton>
            )}
          </Panneau>
        </div>
      </div>

      <ModaleAnnulation
        ouverte={modale === 'annulation'}
        onFermer={() => {
          setModale(null)
        }}
        enCours={action.isPending}
        onValider={(motif) => {
          lancer({ type: 'annuler', motif }, `${c.reference} annulée. Stock libéré.`)
        }}
      />
      <ModalePaiement
        ouverte={modale === 'paiement'}
        total={c.total}
        onFermer={() => {
          setModale(null)
        }}
        enCours={action.isPending}
        onValider={(p) => {
          lancer({ type: 'encaisser', ...p }, 'Paiement enregistré.')
        }}
      />
    </section>
  )
}
