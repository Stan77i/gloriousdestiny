import { useEffect, useState } from 'react'
import { ClipboardCheck, Lock, LockOpen, PackagePlus, Trash2 } from 'lucide-react'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { CaseACocher, Champ, Saisie, Selection, ZoneTexte } from '@/components/ui/Champs'
import { Modale } from '@/components/ui/Modale'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDateHeure } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import type { LigneStock } from '@/services/stock.service'
import { TYPE_MOUVEMENT, signe } from './libelles'
import {
  useCategories,
  useDeverrouillages,
  useMouvements,
  useOperationStock,
  useReglages,
  useStock,
} from './requetes'

const entier = (v: string) => {
  const n = Number.parseInt(v.replace(/\s/g, ''), 10)
  return Number.isInteger(n) ? n : null
}

/** Baisse qui demande une confirmation (même règle que le serveur, qui fait foi). */
function baisseImportante(quantite: number, physique: number): boolean {
  return quantite >= 10 || quantite * 2 > physique
}

/** Horloge qui avance chaque seconde tant que `actif` (compte à rebours affiché). */
function useMaintenant(actif: boolean): number {
  const [maintenant, setMaintenant] = useState(() => Date.now())
  useEffect(() => {
    if (!actif) return
    const id = window.setInterval(() => {
      setMaintenant(Date.now())
    }, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [actif])
  return maintenant
}

function minutesSecondes(s: number): string {
  const m = Math.floor(s / 60)
  return `${String(m)} min ${String(s % 60).padStart(2, '0')} s`
}

export type ActionsFiche = {
  reception: (varianteId: string) => void
  inventaire: (ligne: LigneStock) => void
  perte: (ligne: LigneStock) => void
}

/**
 * Fiche d'un article : quantités, verrou (calculé par le serveur), modification directe de la
 * quantité, réglages de l'article, nouveau format et historique. Les quantités ne changent
 * jamais sans mouvement ; le serveur refuse toute modification manuelle hors fenêtre.
 */
export function FicheArticle({
  varianteId,
  onFermer,
  actions,
}: {
  varianteId: string
  onFermer: () => void
  actions: ActionsFiche
}) {
  const stock = useStock()
  const ligne = stock.data?.find((l) => l.varianteId === varianteId)
  if (!ligne) return null
  return (
    <Modale
      ouverte
      forme="tiroir"
      onFermer={onFermer}
      titre={
        ligne.libelle !== 'Format standard' ? `${ligne.produit} · ${ligne.libelle}` : ligne.produit
      }
      description={`${ligne.categorie} · ${ligne.sku}${ligne.publie ? '' : ' · non publié'}`}
    >
      <div className="flex flex-col gap-6">
        <Quantites ligne={ligne} />
        <Verrou ligne={ligne} luLe={stock.dataUpdatedAt} onExpire={() => void stock.refetch()} />
        <Ajustement ligne={ligne} actions={actions} />
        <Article ligne={ligne} />
        <NouveauFormat ligne={ligne} />
        <Historique varianteId={ligne.varianteId} />
        <HistoriqueReglages varianteId={ligne.varianteId} />
      </div>
    </Modale>
  )
}

function Quantites({ ligne }: { ligne: LigneStock }) {
  const cases: [string, number, string?][] = [
    ['En rayon', ligne.physique, 'stock physique'],
    ['Réservé', ligne.reserve, 'commandes en cours'],
    ['Disponible', ligne.disponible, 'à la vente'],
    ['Vendus', ligne.vendus, `${String(ligne.vendus30j)} sur 30 jours`],
  ]
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cases.map(([l, n, c]) => (
        <div key={l} className="rounded-[16px] bg-carte-2 px-3 py-2.5">
          <dt className="text-[12px] text-encre-3">{l}</dt>
          <dd
            className={cx(
              'chiffres text-[22px] font-semibold',
              l === 'Disponible' && ligne.statut !== 'disponible' && 'text-danger',
            )}
          >
            {n}
          </dd>
          {c && <dd className="text-[11px] text-encre-3">{c}</dd>}
        </div>
      ))}
    </dl>
  )
}

function Verrou({
  ligne,
  luLe,
  onExpire,
}: {
  ligne: LigneStock
  luLe: number
  onExpire: () => void
}) {
  const ouverte = !ligne.verrouille && ligne.modifieLe !== null
  const maintenant = useMaintenant(ouverte)
  // Jamais plus que la valeur du serveur (l'horloge locale peut retarder d'un battement).
  const restant = Math.max(
    0,
    Math.min(
      ligne.secondesRestantes,
      ligne.secondesRestantes - Math.floor((maintenant - luLe) / 1000),
    ),
  )
  const operation = useOperationStock()
  const { notifier } = useNotifications()
  const [demande, setDemande] = useState(false)
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  // Fin de la fenêtre : on relit l'état du serveur (qui fait foi) au lieu de deviner.
  useEffect(() => {
    if (ouverte && restant === 0) onExpire()
  }, [ouverte, restant, onExpire])

  return (
    <section
      aria-labelledby="titre-verrou"
      className={cx(
        'rounded-[18px] border p-4',
        ligne.verrouille ? 'border-filet-fort bg-carte-2' : 'border-or/40 bg-or-doux',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="titre-verrou" className="flex items-center gap-2 font-semibold [&_svg]:size-4">
          {ligne.verrouille ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
          {ligne.verrouille ? 'Verrouillé' : 'Modifiable'}
        </h3>
        {ouverte && (
          <span className="chiffres text-[13px] font-semibold text-or-texte" aria-live="polite">
            Verrouillage dans {minutesSecondes(restant)}
          </span>
        )}
      </div>
      <dl className="mt-2 grid gap-1 text-[13px] text-encre-2 sm:grid-cols-2">
        <div>
          <dt className="inline text-encre-3">Dernière modification : </dt>
          <dd className="inline">
            {ligne.modifieLe ? formaterDateHeure(ligne.modifieLe) : 'aucune modification manuelle'}
          </dd>
        </div>
        <div>
          <dt className="inline text-encre-3">Modifié par : </dt>
          <dd className="inline">{ligne.modifiePar ?? '—'}</dd>
        </div>
      </dl>
      {ligne.verrouille && !demande && (
        <div className="mt-3">
          <p className="mb-2 text-[13px] text-encre-2">
            La dernière modification date de plus de 5 minutes : la quantité est en lecture seule
            pour éviter les modifications accidentelles.
          </p>
          <Bouton
            variante="secondaire"
            taille="petit"
            icone={<LockOpen />}
            onClick={() => {
              setDemande(true)
            }}
          >
            Déverrouiller pour modification
          </Bouton>
        </div>
      )}
      {ligne.verrouille && demande && (
        <div className="mt-3 flex flex-col gap-3">
          <Champ
            libelle="Motif de la correction"
            obligatoire
            aide="Il sera conservé dans l’historique."
          >
            {(a) => (
              <ZoneTexte
                {...a}
                rows={2}
                maxLength={300}
                value={motif}
                onChange={(e) => {
                  setMotif(e.target.value)
                }}
                placeholder="Ex. erreur de saisie sur la réception de ce matin"
              />
            )}
          </Champ>
          {erreur && <Alerte ton="danger" titre={erreur} />}
          <div className="flex flex-wrap gap-2">
            <Bouton
              taille="petit"
              enCours={operation.isPending}
              disabled={motif.trim().length < 3}
              onClick={() => {
                setErreur(null)
                operation.mutate(
                  { type: 'deverrouiller', varianteId: ligne.varianteId, motif: motif.trim() },
                  {
                    onSuccess: () => {
                      notifier('Article déverrouillé pour 5 minutes.', 'succes')
                      setDemande(false)
                      setMotif('')
                    },
                    onError: (e) => {
                      setErreur(versErreurApp(e).message)
                    },
                  },
                )
              }}
            >
              Confirmer le déverrouillage
            </Bouton>
            <Bouton
              taille="petit"
              variante="fantome"
              onClick={() => {
                setDemande(false)
              }}
            >
              Annuler
            </Bouton>
          </div>
        </div>
      )}
    </section>
  )
}

function Ajustement({ ligne, actions }: { ligne: LigneStock; actions: ActionsFiche }) {
  const [sens, setSens] = useState<'ajouter' | 'retirer'>('ajouter')
  const [quantite, setQuantite] = useState('')
  const [motif, setMotif] = useState('')
  const [confirme, setConfirme] = useState(false)
  const [cle, setCle] = useState(() => `ajust-${crypto.randomUUID()}`)
  const [erreur, setErreur] = useState<string | null>(null)
  const operation = useOperationStock()
  const { notifier } = useNotifications()
  const q = entier(quantite)
  const delta = q === null ? null : sens === 'ajouter' ? q : -q
  const apres = delta === null ? null : ligne.physique + delta
  const negatif = apres !== null && apres < 0
  const sousReserve = apres !== null && !negatif && apres < ligne.reserve
  const importante =
    sens === 'retirer' && q !== null && q > 0 && baisseImportante(q, ligne.physique)
  const valide =
    q !== null &&
    q > 0 &&
    !negatif &&
    !sousReserve &&
    motif.trim().length >= 3 &&
    (!importante || confirme) &&
    !ligne.verrouille

  return (
    <section aria-labelledby="titre-ajustement" className="flex flex-col gap-4">
      <h3 id="titre-ajustement" className="text-[17px] font-semibold">
        Modifier la quantité
      </h3>
      <fieldset disabled={ligne.verrouille} className="flex flex-col gap-4 disabled:opacity-55">
        <legend className="sr-only">Ajouter ou retirer des unités</legend>
        <div role="radiogroup" aria-label="Sens" className="flex gap-2">
          {(
            [
              ['ajouter', 'Ajouter'],
              ['retirer', 'Retirer'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={sens === v}
              onClick={() => {
                setSens(v)
                setConfirme(false)
              }}
              className={cx(
                'min-h-11 flex-1 rounded-full border text-sm font-semibold transition-colors',
                sens === v
                  ? 'border-encre bg-encre text-fond'
                  : 'border-filet-fort text-encre-2 hover:text-encre',
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <Champ libelle="Quantité" obligatoire>
            {(a) => (
              <Saisie
                {...a}
                inputMode="numeric"
                value={quantite}
                onChange={(e) => {
                  setQuantite(e.target.value)
                  setConfirme(false)
                }}
                placeholder="0"
              />
            )}
          </Champ>
          <Champ libelle="Motif" obligatoire>
            {(a) => (
              <Saisie
                {...a}
                maxLength={300}
                value={motif}
                onChange={(e) => {
                  setMotif(e.target.value)
                }}
                placeholder={
                  sens === 'ajouter' ? 'Ex. carton oublié retrouvé' : 'Ex. erreur de saisie'
                }
              />
            )}
          </Champ>
        </div>
        {apres !== null && q !== null && q > 0 && (
          <p className="chiffres text-sm text-encre-2" aria-live="polite">
            En rayon : <strong className="text-encre">{ligne.physique}</strong> →{' '}
            <strong className={negatif ? 'text-danger' : 'text-encre'}>{apres}</strong>
            {!negatif && ` · disponible ensuite : ${String(Math.max(0, apres - ligne.reserve))}`}
          </p>
        )}
        {negatif && (
          <Alerte ton="danger" titre="Le stock deviendrait négatif">
            Il n’y a que {ligne.physique} unité(s) en rayon.
          </Alerte>
        )}
        {sousReserve && (
          <Alerte ton="danger" titre="Sous les réservations">
            {ligne.reserve} unité(s) sont réservées par des commandes en cours : le stock ne peut
            pas descendre en dessous.
          </Alerte>
        )}
        {importante && !negatif && !sousReserve && (
          <Alerte ton="alerte" titre="Baisse importante">
            <CaseACocher
              libelle={`Je confirme le retrait de ${String(q)} unité(s) sur ${String(ligne.physique)}.`}
              checked={confirme}
              onChange={(e) => {
                setConfirme(e.target.checked)
              }}
            />
          </Alerte>
        )}
        {erreur && <Alerte ton="danger" titre={erreur} />}
        <div className="flex flex-wrap gap-2">
          <Bouton
            variante="or"
            enCours={operation.isPending}
            disabled={!valide}
            onClick={() => {
              if (delta === null) return
              setErreur(null)
              operation.mutate(
                {
                  type: 'ajuster',
                  varianteId: ligne.varianteId,
                  delta,
                  motif: motif.trim(),
                  cle,
                  confirme,
                },
                {
                  onSuccess: () => {
                    notifier(`Stock mis à jour : ${String(apres)} en rayon.`, 'succes')
                    setQuantite('')
                    setMotif('')
                    setConfirme(false)
                    setCle(`ajust-${crypto.randomUUID()}`)
                  },
                  onError: (e) => {
                    setErreur(versErreurApp(e).message)
                  },
                },
              )
            }}
          >
            Enregistrer
          </Bouton>
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2 border-t border-filet pt-4">
        <Bouton
          variante="secondaire"
          taille="petit"
          icone={<PackagePlus />}
          onClick={() => {
            actions.reception(ligne.varianteId)
          }}
        >
          Réception de marchandises
        </Bouton>
        <Bouton
          variante="secondaire"
          taille="petit"
          icone={<ClipboardCheck />}
          disabled={ligne.verrouille}
          onClick={() => {
            actions.inventaire(ligne)
          }}
        >
          Comptage
        </Bouton>
        <Bouton
          variante="secondaire"
          taille="petit"
          icone={<Trash2 />}
          disabled={ligne.verrouille || ligne.physique - ligne.reserve <= 0}
          onClick={() => {
            actions.perte(ligne)
          }}
        >
          Perte ou casse
        </Bouton>
      </div>
      <p className="text-[12px] text-encre-3">
        Une réception s’ajoute au stock existant : 15 en rayon + 20 reçues = 35, sans rien
        recalculer. Elle n’est jamais bloquée par le verrou.
      </p>
    </section>
  )
}

function Article({ ligne }: { ligne: LigneStock }) {
  const categories = useCategories()
  const operation = useOperationStock()
  const { notifier } = useNotifications()
  const [nom, setNom] = useState(ligne.produit)
  const [categorie, setCategorie] = useState(ligne.categorieId)
  const [nouvelle, setNouvelle] = useState('')
  const [unite, setUnite] = useState(ligne.libelle)
  const [seuil, setSeuil] = useState(String(ligne.seuilAlerte))
  const [erreur, setErreur] = useState<string | null>(null)
  const s = entier(seuil)
  const nouvelleCat = categorie === '__nouvelle'
  const valide =
    nom.trim().length >= 2 &&
    unite.trim().length >= 1 &&
    s !== null &&
    s >= 0 &&
    (!nouvelleCat || nouvelle.trim().length >= 2)

  return (
    <section
      aria-labelledby="titre-article"
      className="flex flex-col gap-4 border-t border-filet pt-5"
    >
      <h3 id="titre-article" className="text-[17px] font-semibold">
        Article
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Nom du produit" obligatoire>
          {(a) => (
            <Saisie
              {...a}
              maxLength={160}
              value={nom}
              onChange={(e) => {
                setNom(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="Catégorie" obligatoire>
          {(a) => (
            <Selection
              {...a}
              value={categorie}
              onChange={(e) => {
                setCategorie(e.target.value)
              }}
            >
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
              <option value="__nouvelle">+ Nouvelle catégorie…</option>
            </Selection>
          )}
        </Champ>
        {nouvelleCat && (
          <Champ libelle="Nom de la nouvelle catégorie" obligatoire>
            {(a) => (
              <Saisie
                {...a}
                maxLength={80}
                value={nouvelle}
                onChange={(e) => {
                  setNouvelle(e.target.value)
                }}
              />
            )}
          </Champ>
        )}
        <Champ libelle="Unité de vente" aide="Ex. 38 ml, Pièce, Lot de 2">
          {(a) => (
            <Saisie
              {...a}
              maxLength={120}
              value={unite}
              onChange={(e) => {
                setUnite(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ
          libelle="Seuil d’alerte (stock faible)"
          aide="Alerte quand le disponible atteint ce nombre."
        >
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={seuil}
              onChange={(e) => {
                setSeuil(e.target.value)
              }}
            />
          )}
        </Champ>
      </div>
      {erreur && <Alerte ton="danger" titre={erreur} />}
      <div>
        <Bouton
          variante="secondaire"
          enCours={operation.isPending}
          disabled={!valide}
          onClick={() => {
            if (s === null) return
            setErreur(null)
            operation.mutate(
              {
                type: 'article',
                varianteId: ligne.varianteId,
                nom: nom.trim(),
                categorieId: nouvelleCat ? null : categorie,
                nouvelleCategorie: nouvelleCat ? nouvelle.trim() : '',
                typeCategorie: 'produit',
                unite: unite.trim(),
                seuil: s,
              },
              {
                onSuccess: () => {
                  notifier('Article enregistré.', 'succes')
                },
                onError: (e) => {
                  setErreur(versErreurApp(e).message)
                },
              },
            )
          }}
        >
          Enregistrer l’article
        </Bouton>
      </div>
    </section>
  )
}

function NouveauFormat({ ligne }: { ligne: LigneStock }) {
  const [ouvert, setOuvert] = useState(false)
  const [unite, setUnite] = useState('')
  const [prix, setPrix] = useState('')
  const [stockInitial, setStockInitial] = useState('0')
  const [cle, setCle] = useState(() => `format-${crypto.randomUUID()}`)
  const [erreur, setErreur] = useState<string | null>(null)
  const operation = useOperationStock()
  const { notifier } = useNotifications()
  const p = entier(prix)
  const st = entier(stockInitial)
  const valide = unite.trim().length >= 1 && p !== null && p >= 0 && st !== null && st >= 0

  if (!ouvert) {
    return (
      <div className="border-t border-filet pt-5">
        <Bouton
          variante="fantome"
          taille="petit"
          onClick={() => {
            setOuvert(true)
          }}
        >
          + Ajouter un format à {ligne.produit}
        </Bouton>
      </div>
    )
  }
  return (
    <section
      aria-labelledby="titre-format"
      className="flex flex-col gap-4 border-t border-filet pt-5"
    >
      <h3 id="titre-format" className="text-[17px] font-semibold">
        Nouveau format de {ligne.produit}
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Champ libelle="Unité de vente" obligatoire>
          {(a) => (
            <Saisie
              {...a}
              value={unite}
              maxLength={120}
              onChange={(e) => {
                setUnite(e.target.value)
              }}
              placeholder="Ex. 150 ml"
            />
          )}
        </Champ>
        <Champ libelle="Prix (FCFA)" obligatoire>
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={prix}
              onChange={(e) => {
                setPrix(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="Stock initial">
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={stockInitial}
              onChange={(e) => {
                setStockInitial(e.target.value)
              }}
            />
          )}
        </Champ>
      </div>
      {erreur && <Alerte ton="danger" titre={erreur} />}
      <div className="flex gap-2">
        <Bouton
          variante="secondaire"
          enCours={operation.isPending}
          disabled={!valide}
          onClick={() => {
            if (p === null || st === null) return
            setErreur(null)
            operation.mutate(
              {
                type: 'format',
                produitId: ligne.produitId,
                unite: unite.trim(),
                prix: p,
                stockInitial: st,
                cle,
              },
              {
                onSuccess: () => {
                  notifier(`Format ${unite.trim()} ajouté (${formaterFcfa(p)}).`, 'succes')
                  setOuvert(false)
                  setUnite('')
                  setPrix('')
                  setStockInitial('0')
                  setCle(`format-${crypto.randomUUID()}`)
                },
                onError: (e) => {
                  setErreur(versErreurApp(e).message)
                },
              },
            )
          }}
        >
          Ajouter le format
        </Bouton>
        <Bouton
          variante="fantome"
          onClick={() => {
            setOuvert(false)
          }}
        >
          Annuler
        </Bouton>
      </div>
    </section>
  )
}

function Historique({ varianteId }: { varianteId: string }) {
  const mouvements = useMouvements({ varianteId, type: null, limite: 30 })
  const deverrouillages = useDeverrouillages(varianteId)
  return (
    <section
      aria-labelledby="titre-historique"
      className="flex flex-col gap-3 border-t border-filet pt-5"
    >
      <h3 id="titre-historique" className="text-[17px] font-semibold">
        Historique de l’article
      </h3>
      {mouvements.isPending ? (
        <p className="text-sm text-encre-3">Chargement…</p>
      ) : mouvements.isError ? (
        <Alerte ton="danger" titre={versErreurApp(mouvements.error).message} />
      ) : mouvements.data.length === 0 ? (
        <p className="text-sm text-encre-3">Aucune opération pour le moment.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-filet rounded-[16px] bg-carte-2">
          {mouvements.data.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-[13px]"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <Badge ton={TYPE_MOUVEMENT[m.type].ton}>{TYPE_MOUVEMENT[m.type].libelle}</Badge>
                  <span className="text-encre-3">{formaterDateHeure(m.le)}</span>
                </span>
                {m.motif && <span className="mt-1 block text-encre-2">{m.motif}</span>}
                <span className="mt-0.5 block text-encre-3">
                  {m.auteur ?? (m.referenceType === 'commande' ? 'Site (commande)' : 'Système')}
                </span>
              </span>
              <span className="chiffres text-right">
                <span
                  className={cx(
                    'block font-semibold',
                    m.deltaPhysique < 0
                      ? 'text-danger'
                      : m.deltaPhysique > 0
                        ? 'text-succes'
                        : 'text-encre-3',
                  )}
                >
                  {m.deltaPhysique !== 0
                    ? signe(m.deltaPhysique)
                    : `réservé ${signe(m.deltaReserve)}`}
                </span>
                {m.avant !== null && m.apres !== null && m.deltaPhysique !== 0 && (
                  <span className="text-encre-3">
                    {m.avant} → {m.apres}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
      {deverrouillages.data && deverrouillages.data.length > 0 && (
        <div>
          <h4 className="text-[13px] font-semibold text-encre-2">Déverrouillages</h4>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
            {deverrouillages.data.map((d) => (
              <li key={d.id} className="flex flex-wrap gap-x-2">
                <span className="text-encre-3">{formaterDateHeure(d.le)}</span>
                <span className="text-encre-2">{d.auteur ?? '—'}</span>
                <span>« {d.motif} »</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** « 9500 FCFA » → « 9 500 FCFA » (même format que le reste du site). */
function valeurReglage(v: string | null): string {
  if (v === null) return '—'
  const m = /^(\d+) FCFA$/.exec(v)
  return m ? formaterFcfa(Number(m[1])) : v
}

/** Réglages modifiés (journal d'audit inaltérable) : ancienne → nouvelle valeur, auteur, date. */
function HistoriqueReglages({ varianteId }: { varianteId: string }) {
  const reglages = useReglages(varianteId)
  return (
    <section
      aria-labelledby="titre-reglages"
      className="flex flex-col gap-3 border-t border-filet pt-5"
    >
      <h3 id="titre-reglages" className="text-[17px] font-semibold">
        Historique des réglages
      </h3>
      {reglages.isPending ? (
        <p className="text-sm text-encre-3">Chargement…</p>
      ) : reglages.isError ? (
        <Alerte ton="danger" titre={versErreurApp(reglages.error).message} />
      ) : reglages.data.length === 0 ? (
        <p className="text-sm text-encre-3">Aucun réglage modifié pour le moment.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-filet rounded-[16px] bg-carte-2">
          {reglages.data.map((r, i) => (
            <li key={`${r.le}-${r.champ}-${String(i)}`} className="px-3 py-2.5 text-[13px]">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-encre">{r.champ}</span>
                <span className="text-encre-3">{formaterDateHeure(r.le)}</span>
              </span>
              <span className="mt-0.5 block text-encre-2">
                {r.champ === 'Création' ? (
                  <>Format créé : {r.nouveau}</>
                ) : (
                  <>
                    <span className="text-encre-3 line-through decoration-encre-3/60">
                      {valeurReglage(r.ancien)}
                    </span>{' '}
                    → <span className="font-medium text-encre">{valeurReglage(r.nouveau)}</span>
                  </>
                )}
              </span>
              <span className="mt-0.5 block text-encre-3">
                {r.auteur ?? 'Système (mise à jour du catalogue)'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
