import { useDeferredValue, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { Squelette } from '@/components/ui/Chargeur'
import { Saisie, ZoneTexte } from '@/components/ui/Champs'
import { EtatChargement, EtatErreur, EtatVide } from '@/components/ui/Etats'
import { Panneau, TuileChiffre } from '@/components/ui/Panneau'
import { Tableau, type Colonne } from '@/components/ui/Tableau'
import { STATUT_COMMANDE } from '@/domain/libelles'
import {
  useAnnoterCliente,
  useCliente,
  useClientes,
  useCommandesCliente,
} from '@/features/commandes-admin/requetes'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDate, formaterDateHeure } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import { PageIntrouvable } from '@/pages/errors/PageIntrouvable'
import type { ClienteListe } from '@/services/clientes.service'
import type { CommandeListe } from '@/services/commandes.service'

const COLONNES: Colonne<ClienteListe>[] = [
  {
    id: 'nom',
    entete: 'Cliente',
    cellule: (c) => (
      <Link
        to={`/admin/clientes/${c.id}`}
        className="text-ivoire no-underline after:absolute after:inset-0 hover:text-or-clair"
      >
        {c.nom}
      </Link>
    ),
  },
  {
    id: 'tel',
    entete: 'Téléphone',
    cellule: (c) => <span className="chiffres">{c.telephone}</span>,
  },
  {
    id: 'depuis',
    entete: 'Cliente depuis',
    cellule: (c) => formaterDate(c.creeLe),
    secondaire: true,
  },
  {
    id: 'commandes',
    entete: 'Commandes',
    cellule: (c) => (
      <span className="inline-flex items-center gap-2">
        <span className="chiffres">{c.nbCommandes}</span>
        {c.nbCommandes >= 2 && <Badge ton="or">Fidèle</Badge>}
      </span>
    ),
    numerique: true,
  },
  {
    id: 'total',
    entete: 'Total livré',
    cellule: (c) => formaterFcfa(c.totalLivre),
    numerique: true,
  },
]

/** Liste des clientes (recherche par nom ou téléphone). */
export function PageAdminClientes() {
  useTitreDocument('Clientes')
  const [params, setParams] = useSearchParams()
  const recherche = params.get('q') ?? ''
  const clientes = useClientes(useDeferredValue(recherche))

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[28px] font-semibold">Clientes</h1>
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Rechercher une cliente</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ivoire-3"
          />
          <Saisie
            type="search"
            placeholder="Nom ou téléphone"
            value={recherche}
            onChange={(e) => {
              setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })
            }}
            className="pl-10"
          />
        </label>
      </div>
      {clientes.isError ? (
        <EtatErreur
          message={versErreurApp(clientes.error).message}
          onReessayer={() => void clientes.refetch()}
        />
      ) : clientes.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Squelette key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <Tableau
          legende="Clientes"
          colonnes={COLONNES}
          lignes={clientes.data}
          cle={(c) => c.id}
          vide={
            <div className="rounded-panneau border border-filet bg-surface-1">
              <EtatVide
                titre={recherche ? 'Aucune cliente trouvée' : 'Aucune cliente pour le moment'}
              >
                {recherche
                  ? undefined
                  : 'Chaque commande du site crée ou complète la fiche de la cliente.'}
              </EtatVide>
            </div>
          }
        />
      )}
    </section>
  )
}

const COLONNES_COMMANDES: Colonne<CommandeListe>[] = [
  {
    id: 'ref',
    entete: 'Référence',
    cellule: (c) => (
      <Link
        to={`/admin/commandes/${c.id}`}
        className="chiffres text-ivoire no-underline after:absolute after:inset-0 hover:text-or-clair"
      >
        {c.reference}
      </Link>
    ),
  },
  { id: 'date', entete: 'Date', cellule: (c) => formaterDateHeure(c.creeLe) },
  {
    id: 'statut',
    entete: 'Statut',
    cellule: (c) => (
      <Badge ton={STATUT_COMMANDE[c.statut].ton}>{STATUT_COMMANDE[c.statut].libelle}</Badge>
    ),
  },
  { id: 'total', entete: 'Total', cellule: (c) => formaterFcfa(c.total), numerique: true },
]

/** Fiche cliente : chiffres, adresses, commandes, notes. */
export function PageAdminCliente() {
  const { id = '' } = useParams()
  const cliente = useCliente(id)
  const commandes = useCommandesCliente(id)
  const annoter = useAnnoterCliente(id)
  const { notifier } = useNotifications()
  const [notes, setNotes] = useState<string | null>(null)
  useTitreDocument(cliente.data?.nom ?? 'Cliente')

  if (cliente.isPending) return <EtatChargement />
  if (cliente.isError) {
    return (
      <EtatErreur
        message={versErreurApp(cliente.error).message}
        onReessayer={() => void cliente.refetch()}
      />
    )
  }
  if (!cliente.data) return <PageIntrouvable />
  const c = cliente.data

  return (
    <section className="flex flex-col gap-6">
      <Link
        to="/admin/clientes"
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-ivoire-3 no-underline hover:text-ivoire [&_svg]:size-4"
      >
        <ArrowLeft aria-hidden="true" />
        Clientes
      </Link>
      <header>
        <h1 className="text-[28px] font-semibold">{c.nom}</h1>
        <p className="chiffres mt-1 text-ivoire-2">
          {c.telephone}
          {c.email ? ` · ${c.email}` : ''}
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <TuileChiffre
          libelle="Commandes"
          valeur={String(c.nbCommandes)}
          complement="hors annulées"
        />
        <TuileChiffre libelle="Total livré" valeur={formaterFcfa(c.totalLivre)} />
        <TuileChiffre libelle="Cliente depuis" valeur={formaterDate(c.creeLe)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panneau titre="Commandes" corpsClassName="p-0 sm:p-0 pt-0 sm:pt-0">
          {commandes.data ? (
            <Tableau
              legende={`Commandes de ${c.nom}`}
              colonnes={COLONNES_COMMANDES}
              lignes={commandes.data}
              cle={(x) => x.id}
            />
          ) : (
            <EtatChargement />
          )}
        </Panneau>
        <div className="flex flex-col gap-4">
          <Panneau titre="Adresses">
            <ul className="flex flex-col gap-3 text-sm">
              {c.adresses.map((a) => (
                <li key={a.id}>
                  <p>{[a.adresse, a.quartier, a.ville].filter(Boolean).join(', ')}</p>
                  <p className="text-[13px] text-ivoire-3">{a.pointDeRepere}</p>
                </li>
              ))}
            </ul>
          </Panneau>
          <Panneau titre="Notes internes" sousTitre="Préférences, informations utiles">
            <ZoneTexte
              aria-label="Notes internes sur la cliente"
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
                enCours={annoter.isPending}
                onClick={() => {
                  annoter.mutate(notes, {
                    onSuccess: () => {
                      setNotes(null)
                      notifier('Notes enregistrées.', 'succes')
                    },
                    onError: (e) => {
                      notifier(versErreurApp(e).message, 'erreur')
                    },
                  })
                }}
              >
                Enregistrer les notes
              </Bouton>
            )}
          </Panneau>
        </div>
      </div>
    </section>
  )
}
