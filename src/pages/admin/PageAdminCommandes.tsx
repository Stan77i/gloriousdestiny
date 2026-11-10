import { useDeferredValue } from 'react'
import { Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Badge, Compteur } from '@/components/ui/Badge'
import { Squelette } from '@/components/ui/Chargeur'
import { Saisie } from '@/components/ui/Champs'
import { EtatErreur, EtatVide } from '@/components/ui/Etats'
import { Tableau, type Colonne } from '@/components/ui/Tableau'
import { STATUT_COMMANDE, STATUT_PAIEMENT } from '@/domain/libelles'
import { useCommandes, useCompteurs } from '@/features/commandes-admin/requetes'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDateHeure } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import {
  STATUTS_SUIVIS,
  type CommandeListe,
  type StatutCommande,
} from '@/services/commandes.service'

const ONGLETS: { valeur: StatutCommande | null; libelle: string }[] = [
  { valeur: 'nouvelle', libelle: 'À confirmer' },
  { valeur: 'confirmee', libelle: 'Confirmées' },
  { valeur: 'expediee', libelle: 'Expédiées' },
  { valeur: 'livree', libelle: 'Livrées' },
  { valeur: 'annulee', libelle: 'Annulées' },
  { valeur: null, libelle: 'Toutes' },
]

const COLONNES: Colonne<CommandeListe>[] = [
  {
    id: 'reference',
    entete: 'Référence',
    cellule: (c) => (
      <Link
        to={`/admin/commandes/${c.id}`}
        className="chiffres text-encre no-underline after:absolute after:inset-0 hover:text-or-texte"
      >
        {c.reference}
      </Link>
    ),
  },
  {
    id: 'cliente',
    entete: 'Cliente',
    cellule: (c) => (
      <span>
        <span className="block text-encre">{c.cliente.nom}</span>
        <span className="chiffres text-[13px] text-encre-3">{c.cliente.telephone}</span>
      </span>
    ),
  },
  { id: 'ville', entete: 'Ville', cellule: (c) => c.ville, secondaire: true },
  {
    id: 'date',
    entete: 'Reçue',
    cellule: (c) => <span className="text-[13px]">{formaterDateHeure(c.creeLe)}</span>,
    secondaire: true,
  },
  {
    id: 'statut',
    entete: 'Statut',
    cellule: (c) => (
      <span className="flex flex-wrap gap-1.5">
        <Badge ton={STATUT_COMMANDE[c.statut].ton}>{STATUT_COMMANDE[c.statut].libelle}</Badge>
        {c.statutPaiement === 'paye' && (
          <Badge ton={STATUT_PAIEMENT.paye.ton}>{STATUT_PAIEMENT.paye.libelle}</Badge>
        )}
      </span>
    ),
  },
  { id: 'total', entete: 'Total', cellule: (c) => formaterFcfa(c.total), numerique: true },
]

/** File des commandes : onglets par statut (« À confirmer » d'abord), recherche. */
export function PageAdminCommandes() {
  useTitreDocument('Commandes')
  const [params, setParams] = useSearchParams()
  const brut = params.get('statut')
  const statut: StatutCommande | null =
    brut === 'toutes'
      ? null
      : (STATUTS_SUIVIS as string[]).includes(brut ?? '')
        ? (brut as StatutCommande)
        : 'nouvelle'
  const recherche = params.get('q') ?? ''
  const rechercheDifferee = useDeferredValue(recherche)
  const commandes = useCommandes({
    statut: rechercheDifferee ? null : statut,
    recherche: rechercheDifferee,
  })
  const compteurs = useCompteurs()

  function maj(cle: string, valeur: string | null) {
    const suivants = new URLSearchParams(params)
    if (valeur === null || valeur === '') suivants.delete(cle)
    else suivants.set(cle, valeur)
    setParams(suivants, { replace: true })
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[28px] font-semibold">Commandes</h1>
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Rechercher une commande</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-encre-3"
          />
          <Saisie
            type="search"
            placeholder="Référence, nom ou téléphone"
            value={recherche}
            onChange={(e) => {
              maj('q', e.target.value)
            }}
            className="pl-10"
          />
        </label>
      </div>

      {!recherche && (
        <nav aria-label="Statuts" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {ONGLETS.map((o) => {
              const actif = o.valeur === statut
              const nombre = o.valeur ? compteurs.data?.[o.valeur] : undefined
              return (
                <li key={o.libelle}>
                  <button
                    type="button"
                    aria-current={actif ? 'page' : undefined}
                    onClick={() => {
                      maj('statut', o.valeur ?? 'toutes')
                    }}
                    className={cx(
                      'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap transition-colors',
                      actif
                        ? 'border-encre bg-encre text-fond'
                        : 'border-transparent bg-carte text-encre-2 hover:text-encre',
                    )}
                  >
                    {o.libelle}
                    {nombre !== undefined && <Compteur valeur={nombre} actif={actif} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      {commandes.isError ? (
        <EtatErreur
          message={versErreurApp(commandes.error).message}
          onReessayer={() => void commandes.refetch()}
        />
      ) : commandes.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Squelette key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <Tableau
          legende="Commandes"
          colonnes={COLONNES}
          lignes={commandes.data}
          cle={(c) => c.id}
          vide={
            <div className="rounded-panneau border border-filet bg-carte">
              <EtatVide
                titre={recherche ? 'Aucune commande trouvée' : 'Aucune commande dans cette file'}
              >
                {statut === 'nouvelle' && !recherche
                  ? 'Les nouvelles commandes du site apparaîtront ici.'
                  : undefined}
              </EtatVide>
            </div>
          }
        />
      )}
    </section>
  )
}
