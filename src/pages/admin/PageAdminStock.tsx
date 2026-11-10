import { useMemo, useState } from 'react'
import {
  BellRing,
  Boxes,
  ClipboardCheck,
  PackagePlus,
  PackageX,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Bouton, BoutonIcone } from '@/components/ui/Bouton'
import { Squelette } from '@/components/ui/Chargeur'
import { Selection } from '@/components/ui/Champs'
import { EtatErreur, EtatVide } from '@/components/ui/Etats'
import { Onglets } from '@/components/ui/Navigation'
import { Panneau, TuileChiffre } from '@/components/ui/Panneau'
import { Tableau, type Colonne } from '@/components/ui/Tableau'
import { STATUT_STOCK, TYPE_MOUVEMENT, signe } from '@/features/stock-admin/libelles'
import {
  ModaleAlertes,
  ModaleFournisseur,
  ModaleInventaire,
  ModalePerte,
  ModaleReception,
} from '@/features/stock-admin/ModalesStock'
import {
  useFournisseurs,
  useMouvements,
  useReceptions,
  useStock,
} from '@/features/stock-admin/requetes'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDate, formaterDateHeure } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import type { Fournisseur, LigneStock, Mouvement, TypeMouvement } from '@/services/stock.service'

type Vue = 'inventaire' | 'mouvements' | 'receptions' | 'fournisseurs'
const VUES: Vue[] = ['inventaire', 'mouvements', 'receptions', 'fournisseurs']

type ModaleOuverte =
  | { type: 'perte' | 'inventaire' | 'alertes'; ligne: LigneStock }
  | { type: 'reception'; initiale?: string }
  | { type: 'fournisseur'; fournisseur: Fournisseur | null }
  | null

const nomArticle = (l: { produit: string; libelle: string }) =>
  l.libelle && l.libelle !== 'Format standard' ? `${l.produit} · ${l.libelle}` : l.produit

function Chargement() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }, (_, i) => (
        <Squelette key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

/** Barre de remplissage disponible / seuil : lisible d'un coup d'œil, doublée du chiffre. */
function Jauge({ ligne }: { ligne: LigneStock }) {
  const reference = Math.max(ligne.seuilAlerte * 3, ligne.physique, 1)
  const part = Math.min(100, (ligne.disponible / reference) * 100)
  const seuil = Math.min(100, (ligne.seuilAlerte / reference) * 100)
  return (
    <span aria-hidden="true" className="relative mt-1.5 block h-1 w-24 rounded-full bg-carte-3">
      <span
        className={cx(
          'absolute inset-y-0 left-0 rounded-full',
          ligne.statut === 'disponible'
            ? 'bg-succes'
            : ligne.statut === 'epuise'
              ? 'bg-danger'
              : 'bg-alerte',
        )}
        style={{ width: `${String(part)}%` }}
      />
      <span
        className="absolute -inset-y-0.5 w-px bg-encre-3"
        style={{ left: `${String(seuil)}%` }}
      />
    </span>
  )
}

function VueInventaire({
  stock,
  ouvrir,
}: {
  stock: LigneStock[]
  ouvrir: (m: ModaleOuverte) => void
}) {
  const [filtre, setFiltre] = useState<'tous' | 'alertes'>('tous')
  const bas = stock.filter((l) => l.statut === 'bientot_epuise').length
  const epuises = stock.filter((l) => l.statut === 'epuise').length
  const unites = stock.reduce((s, l) => s + l.disponible, 0)
  const reserves = stock.reduce((s, l) => s + l.reserve, 0)
  const lignes = filtre === 'alertes' ? stock.filter((l) => l.statut !== 'disponible') : stock

  const colonnes: Colonne<LigneStock>[] = [
    {
      id: 'article',
      entete: 'Article',
      cellule: (l) => (
        <span>
          <span className="block text-encre">{nomArticle(l)}</span>
          <span className="chiffres text-[13px] font-normal text-encre-3">
            {l.sku}
            {!l.publie && ' · non publié'}
          </span>
        </span>
      ),
    },
    {
      id: 'statut',
      entete: 'État',
      cellule: (l) => (
        <Badge ton={STATUT_STOCK[l.statut].ton}>{STATUT_STOCK[l.statut].libelle}</Badge>
      ),
    },
    {
      id: 'disponible',
      entete: 'Disponible',
      numerique: true,
      cellule: (l) => (
        <span className="inline-flex flex-col items-start sm:items-end">
          <span className="text-[17px] font-semibold text-encre">{l.disponible}</span>
          <Jauge ligne={l} />
        </span>
      ),
    },
    { id: 'reserve', entete: 'Réservé', numerique: true, cellule: (l) => l.reserve },
    { id: 'physique', entete: 'En rayon', numerique: true, cellule: (l) => l.physique },
    {
      id: 'seuil',
      entete: 'Seuil',
      numerique: true,
      secondaire: true,
      cellule: (l) => l.seuilAlerte,
    },
    {
      id: 'actions',
      entete: 'Actions',
      numerique: true,
      pleineLargeur: true,
      cellule: (l) => (
        <span className="flex gap-1 sm:justify-end">
          <BoutonIcone
            libelle={`Réception de ${l.produit}`}
            variante="fantome"
            onClick={() => {
              ouvrir({ type: 'reception', initiale: l.varianteId })
            }}
          >
            <PackagePlus />
          </BoutonIcone>
          <BoutonIcone
            libelle={`Perte sur ${l.produit}`}
            variante="fantome"
            disabled={l.physique - l.reserve <= 0}
            onClick={() => {
              ouvrir({ type: 'perte', ligne: l })
            }}
          >
            <Trash2 />
          </BoutonIcone>
          <BoutonIcone
            libelle={`Inventaire de ${l.produit}`}
            variante="fantome"
            onClick={() => {
              ouvrir({ type: 'inventaire', ligne: l })
            }}
          >
            <ClipboardCheck />
          </BoutonIcone>
          <BoutonIcone
            libelle={`Alertes de ${l.produit}`}
            variante="fantome"
            onClick={() => {
              ouvrir({ type: 'alertes', ligne: l })
            }}
          >
            <BellRing />
          </BoutonIcone>
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TuileChiffre
          fond="menthe"
          libelle="Unités disponibles"
          valeur={String(unites)}
          complement={`${String(reserves)} réservée(s)`}
          icone={<Boxes />}
        />
        <TuileChiffre
          libelle="Références"
          valeur={String(stock.length)}
          icone={<ClipboardCheck />}
        />
        <TuileChiffre
          fond={bas > 0 ? 'sable' : 'carte'}
          libelle="Stock bas"
          valeur={String(bas)}
          complement="sous le seuil"
          icone={<TriangleAlert />}
        />
        <TuileChiffre
          fond={epuises > 0 ? 'rose' : 'carte'}
          libelle="Épuisées"
          valeur={String(epuises)}
          complement="plus vendables"
          icone={<PackageX />}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Filtrer les articles">
          {(
            [
              ['tous', 'Tous les articles'],
              ['alertes', `À réapprovisionner (${String(bas + epuises)})`],
            ] as const
          ).map(([v, libelle]) => (
            <button
              key={v}
              type="button"
              aria-pressed={filtre === v}
              onClick={() => {
                setFiltre(v)
              }}
              className={cx(
                'inline-flex min-h-10 items-center rounded-full border px-4 text-sm whitespace-nowrap transition-colors',
                filtre === v
                  ? 'border-encre-2 bg-carte-3 text-encre'
                  : 'border-filet-fort text-encre-2 hover:text-encre',
              )}
            >
              {libelle}
            </button>
          ))}
        </div>
        <Bouton
          icone={<PackagePlus />}
          onClick={() => {
            ouvrir({ type: 'reception' })
          }}
        >
          Nouvelle réception
        </Bouton>
      </div>

      <Tableau
        legende="Stock par article"
        colonnes={colonnes}
        lignes={lignes}
        cle={(l) => l.varianteId}
        vide={
          <div className="rounded-panneau border border-filet bg-carte">
            <EtatVide
              titre={filtre === 'alertes' ? 'Aucun article à réapprovisionner' : 'Aucun article'}
            >
              {filtre === 'alertes'
                ? 'Tous les articles sont au-dessus de leur seuil d’alerte.'
                : undefined}
            </EtatVide>
          </div>
        }
      />
      <p className="text-[13px] text-encre-3">
        Disponible = en rayon − réservé pour des commandes en cours. Le trait sur la jauge marque le
        seuil d’alerte.
      </p>
    </div>
  )
}

const TYPES_FILTRABLES: TypeMouvement[] = [
  'entree',
  'reservation',
  'annulation_reservation',
  'vente',
  'retour',
  'perte',
  'correction',
]

function Delta({ valeur }: { valeur: number }) {
  return (
    <span
      className={cx(
        'chiffres',
        valeur > 0 ? 'text-succes' : valeur < 0 ? 'text-danger' : 'text-encre-3',
      )}
    >
      {signe(valeur)}
    </span>
  )
}

function VueMouvements({ stock }: { stock: LigneStock[] }) {
  const [params, setParams] = useSearchParams()
  const varianteId = params.get('article')
  const brut = params.get('type')
  const type = TYPES_FILTRABLES.includes(brut as TypeMouvement) ? (brut as TypeMouvement) : null
  const mouvements = useMouvements({ varianteId, type })

  function maj(cle: string, valeur: string) {
    const suivants = new URLSearchParams(params)
    if (valeur) suivants.set(cle, valeur)
    else suivants.delete(cle)
    setParams(suivants, { replace: true })
  }

  const colonnes: Colonne<Mouvement>[] = [
    {
      id: 'article',
      entete: 'Article',
      cellule: (m) => (
        <span>
          <span className="block text-encre">{nomArticle(m)}</span>
          <span className="text-[13px] font-normal text-encre-3">{formaterDateHeure(m.le)}</span>
        </span>
      ),
    },
    {
      id: 'type',
      entete: 'Opération',
      cellule: (m) => (
        <Badge ton={TYPE_MOUVEMENT[m.type].ton}>{TYPE_MOUVEMENT[m.type].libelle}</Badge>
      ),
    },
    {
      id: 'physique',
      entete: 'En rayon',
      numerique: true,
      cellule: (m) => <Delta valeur={m.deltaPhysique} />,
    },
    {
      id: 'reserve',
      entete: 'Réservé',
      numerique: true,
      cellule: (m) => <Delta valeur={m.deltaReserve} />,
    },
    {
      id: 'origine',
      entete: 'Origine',
      cellule: (m) => (
        <span className="text-[13px]">
          {m.referenceType === 'commande' && m.referenceId ? (
            <Link
              to={`/admin/commandes/${m.referenceId}`}
              className="chiffres text-or-texte hover:text-or"
            >
              {m.commande ?? 'Commande'}
            </Link>
          ) : m.referenceType === 'reception' ? (
            'Réception'
          ) : m.motif ? null : (
            '—'
          )}
          {m.motif && (
            <span className={cx('block text-encre-3', m.referenceType && 'mt-0.5')}>{m.motif}</span>
          )}
        </span>
      ),
    },
    {
      id: 'auteur',
      entete: 'Par',
      secondaire: true,
      cellule: (m) => (
        <span className="text-[13px]">
          {m.auteur ?? (m.referenceType === 'commande' ? 'Site' : 'Système')}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <Selection
          aria-label="Filtrer par article"
          value={varianteId ?? ''}
          onChange={(e) => {
            maj('article', e.target.value)
          }}
        >
          <option value="">Tous les articles</option>
          {stock.map((l) => (
            <option key={l.varianteId} value={l.varianteId}>
              {nomArticle(l)}
            </option>
          ))}
        </Selection>
        <Selection
          aria-label="Filtrer par opération"
          value={type ?? ''}
          onChange={(e) => {
            maj('type', e.target.value)
          }}
        >
          <option value="">Toutes les opérations</option>
          {TYPES_FILTRABLES.map((t) => (
            <option key={t} value={t}>
              {TYPE_MOUVEMENT[t].libelle}
            </option>
          ))}
        </Selection>
      </div>
      {mouvements.isError ? (
        <EtatErreur
          message={versErreurApp(mouvements.error).message}
          onReessayer={() => void mouvements.refetch()}
        />
      ) : mouvements.isPending ? (
        <Chargement />
      ) : (
        <Tableau
          legende="Journal des mouvements de stock"
          colonnes={colonnes}
          lignes={mouvements.data}
          cle={(m) => String(m.id)}
          vide={
            <div className="rounded-panneau border border-filet bg-carte">
              <EtatVide titre="Aucun mouvement">
                Aucune opération ne correspond à ces filtres.
              </EtatVide>
            </div>
          }
        />
      )}
      <p className="text-[13px] text-encre-3">
        Le journal est inaltérable : chaque quantité modifiée y laisse une ligne. Les 150 dernières
        opérations sont affichées.
      </p>
    </div>
  )
}

function VueReceptions({ ouvrir }: { ouvrir: (m: ModaleOuverte) => void }) {
  const receptions = useReceptions()
  if (receptions.isError) {
    return (
      <EtatErreur
        message={versErreurApp(receptions.error).message}
        onReessayer={() => void receptions.refetch()}
      />
    )
  }
  if (receptions.isPending) return <Chargement />
  return (
    <div className="flex flex-col gap-5">
      <Bouton
        icone={<PackagePlus />}
        className="self-start"
        onClick={() => {
          ouvrir({ type: 'reception' })
        }}
      >
        Nouvelle réception
      </Bouton>
      {receptions.data.length === 0 ? (
        <div className="rounded-panneau border border-filet bg-carte">
          <EtatVide titre="Aucune réception enregistrée">
            Chaque livraison d’un fournisseur s’enregistre ici : le stock augmente et la trace
            reste.
          </EtatVide>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {receptions.data.map((r) => {
            const unites = r.lignes.reduce((s, l) => s + l.quantite, 0)
            const cout = r.lignes.every((l) => l.coutUnitaire !== null)
              ? r.lignes.reduce((s, l) => s + l.quantite * (l.coutUnitaire ?? 0), 0)
              : null
            return (
              <li key={r.id}>
                <Panneau
                  titre={r.fournisseur ?? 'Fournisseur non précisé'}
                  sousTitre={[
                    formaterDate(r.date),
                    r.referenceFournisseur && `BL ${r.referenceFournisseur}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  action={<span className="chiffres text-[15px] font-semibold">{unites} u.</span>}
                >
                  <ul className="flex flex-col gap-1.5 text-sm text-encre-2">
                    {r.lignes.map((l, i) => (
                      <li key={i} className="flex justify-between gap-4">
                        <span>{l.produit}</span>
                        <span className="chiffres">
                          × {l.quantite}
                          {l.coutUnitaire !== null && (
                            <span className="text-encre-3"> · {formaterFcfa(l.coutUnitaire)}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {cout !== null && (
                    <p className="mt-3 border-t border-filet pt-3 text-right text-[13px] text-encre-3">
                      Coût total <span className="chiffres text-encre">{formaterFcfa(cout)}</span>
                    </p>
                  )}
                </Panneau>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function VueFournisseurs({ ouvrir }: { ouvrir: (m: ModaleOuverte) => void }) {
  const fournisseurs = useFournisseurs()
  if (fournisseurs.isError) {
    return (
      <EtatErreur
        message={versErreurApp(fournisseurs.error).message}
        onReessayer={() => void fournisseurs.refetch()}
      />
    )
  }
  if (fournisseurs.isPending) return <Chargement />
  const colonnes: Colonne<Fournisseur>[] = [
    { id: 'nom', entete: 'Fournisseur', cellule: (f) => f.nom },
    {
      id: 'telephone',
      entete: 'Téléphone',
      cellule: (f) => <span className="chiffres">{f.telephone ?? '—'}</span>,
    },
    { id: 'ville', entete: 'Ville', cellule: (f) => f.ville ?? '—' },
    {
      id: 'notes',
      entete: 'Notes',
      secondaire: true,
      cellule: (f) => <span className="text-[13px]">{f.notes ?? '—'}</span>,
    },
    {
      id: 'modifier',
      entete: 'Modifier',
      cellule: (f) => (
        <span className="flex sm:justify-end">
          <BoutonIcone
            libelle={`Modifier ${f.nom}`}
            variante="fantome"
            onClick={() => {
              ouvrir({ type: 'fournisseur', fournisseur: f })
            }}
          >
            <Pencil />
          </BoutonIcone>
        </span>
      ),
    },
  ]
  return (
    <div className="flex flex-col gap-5">
      <Bouton
        variante="secondaire"
        icone={<Plus />}
        className="self-start"
        onClick={() => {
          ouvrir({ type: 'fournisseur', fournisseur: null })
        }}
      >
        Ajouter un fournisseur
      </Bouton>
      <Tableau
        legende="Fournisseurs"
        colonnes={colonnes}
        lignes={fournisseurs.data}
        cle={(f) => f.id}
        vide={
          <div className="rounded-panneau border border-filet bg-carte">
            <EtatVide titre="Aucun fournisseur">
              Ajoutez vos fournisseurs pour les retrouver lors des réceptions.
            </EtatVide>
          </div>
        }
      />
    </div>
  )
}

/** Module stock : inventaire en temps réel, journal, réceptions, fournisseurs. */
export function PageAdminStock() {
  useTitreDocument('Stock')
  const [params, setParams] = useSearchParams()
  const brut = params.get('vue')
  const vue: Vue = VUES.includes(brut as Vue) ? (brut as Vue) : 'inventaire'
  const stock = useStock()
  const [modale, setModale] = useState<ModaleOuverte>(null)
  const fermer = () => {
    setModale(null)
  }
  const alertes = useMemo(
    () => stock.data?.filter((l) => l.statut !== 'disponible').length,
    [stock.data],
  )

  const onglets = [
    { id: 'inventaire', libelle: 'Inventaire', ...(alertes ? { compteur: alertes } : {}) },
    { id: 'mouvements', libelle: 'Mouvements' },
    { id: 'receptions', libelle: 'Réceptions' },
    { id: 'fournisseurs', libelle: 'Fournisseurs' },
  ]

  const contenu = stock.isError ? (
    <EtatErreur
      message={versErreurApp(stock.error).message}
      onReessayer={() => void stock.refetch()}
    />
  ) : stock.isPending ? (
    <Chargement />
  ) : vue === 'inventaire' ? (
    <VueInventaire stock={stock.data} ouvrir={setModale} />
  ) : vue === 'mouvements' ? (
    <VueMouvements stock={stock.data} />
  ) : vue === 'receptions' ? (
    <VueReceptions ouvrir={setModale} />
  ) : (
    <VueFournisseurs ouvrir={setModale} />
  )

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold">Stock</h1>
      <Onglets
        libelle="Vues du stock"
        onglets={onglets}
        actif={vue}
        onChoisir={(id) => {
          setParams(id === 'inventaire' ? {} : { vue: id }, { replace: true })
        }}
        panneau={contenu}
      />

      {modale?.type === 'perte' && <ModalePerte ligne={modale.ligne} onFermer={fermer} />}
      {modale?.type === 'inventaire' && <ModaleInventaire ligne={modale.ligne} onFermer={fermer} />}
      {modale?.type === 'alertes' && <ModaleAlertes ligne={modale.ligne} onFermer={fermer} />}
      {modale?.type === 'reception' && stock.data && (
        <ModaleReception
          stock={stock.data}
          {...(modale.initiale ? { initiale: modale.initiale } : {})}
          onFermer={fermer}
        />
      )}
      {modale?.type === 'fournisseur' && (
        <ModaleFournisseur fournisseur={modale.fournisseur} onFermer={fermer} />
      )}
    </section>
  )
}
