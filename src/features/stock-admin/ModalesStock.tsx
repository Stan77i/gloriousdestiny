import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Alerte } from '@/components/ui/Alerte'
import { Bouton, BoutonIcone } from '@/components/ui/Bouton'
import { Champ, Saisie, Selection, ZoneTexte } from '@/components/ui/Champs'
import { Modale } from '@/components/ui/Modale'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import type { Fournisseur, LigneStock } from '@/services/stock.service'
import { signe } from './libelles'
import { useEnregistrerFournisseur, useFournisseurs, useOperationStock } from './requetes'

const entier = (v: string) => {
  const n = Number.parseInt(v.replace(/\s/g, ''), 10)
  return Number.isInteger(n) ? n : null
}

function useAction(onFermer: () => void) {
  const operation = useOperationStock()
  const { notifier } = useNotifications()
  const [erreur, setErreur] = useState<string | null>(null)
  function lancer(o: Parameters<typeof operation.mutate>[0], succes: string) {
    setErreur(null)
    operation.mutate(o, {
      onSuccess: () => {
        notifier(succes, 'succes')
        onFermer()
      },
      onError: (e) => {
        setErreur(versErreurApp(e).message)
      },
    })
  }
  return { lancer, enCours: operation.isPending, erreur }
}

/** Perte, casse, péremption : motif obligatoire, jamais sur le stock réservé. */
export function ModalePerte({ ligne, onFermer }: { ligne: LigneStock; onFermer: () => void }) {
  const [cle] = useState(() => `perte-${crypto.randomUUID()}`)
  const [quantite, setQuantite] = useState('1')
  const [motif, setMotif] = useState('')
  const { lancer, enCours, erreur } = useAction(onFermer)
  const q = entier(quantite)
  const max = ligne.physique - ligne.reserve
  const valide = q !== null && q > 0 && q <= max && motif.trim().length >= 3
  return (
    <Modale
      ouverte
      onFermer={onFermer}
      titre={`Déclarer une perte · ${ligne.produit}`}
      description={`Stock physique ${String(ligne.physique)}, dont ${String(ligne.reserve)} réservé(s) pour des commandes.`}
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton
            variante="danger"
            enCours={enCours}
            disabled={!valide}
            onClick={() => {
              if (q !== null)
                lancer(
                  {
                    type: 'perte',
                    varianteId: ligne.varianteId,
                    quantite: q,
                    motif: motif.trim(),
                    cle,
                  },
                  `Perte de ${String(q)} enregistrée.`,
                )
            }}
          >
            Enregistrer la perte
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Champ
          libelle="Quantité perdue"
          obligatoire
          aide={`Au plus ${String(max)} : le stock réservé ne peut pas être déclaré perdu.`}
        >
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={quantite}
              onChange={(e) => {
                setQuantite(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="Motif" obligatoire>
          {(a) => (
            <ZoneTexte
              {...a}
              value={motif}
              onChange={(e) => {
                setMotif(e.target.value)
              }}
              placeholder="Ex. : flacons cassés au déballage, produit périmé"
            />
          )}
        </Champ>
        {erreur && <Alerte ton="danger" titre={erreur} />}
      </div>
    </Modale>
  )
}

/** Inventaire : on saisit ce qui est réellement compté ; l'écart devient un mouvement. */
export function ModaleInventaire({ ligne, onFermer }: { ligne: LigneStock; onFermer: () => void }) {
  const [cle] = useState(() => `inventaire-${crypto.randomUUID()}`)
  const [compte, setCompte] = useState(String(ligne.physique))
  const [motif, setMotif] = useState('Inventaire')
  const { lancer, enCours, erreur } = useAction(onFermer)
  const c = entier(compte)
  const ecart = c === null ? null : c - ligne.physique
  const valide = c !== null && c >= 0 && ecart !== 0 && motif.trim().length >= 3
  return (
    <Modale
      ouverte
      onFermer={onFermer}
      titre={`Inventaire · ${ligne.produit}`}
      description={`Stock théorique : ${String(ligne.physique)} unités.`}
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton
            enCours={enCours}
            disabled={!valide}
            onClick={() => {
              if (c !== null)
                lancer(
                  {
                    type: 'inventaire',
                    varianteId: ligne.varianteId,
                    compte: c,
                    motif: motif.trim(),
                    cle,
                  },
                  `Inventaire enregistré (${signe(ecart ?? 0)}).`,
                )
            }}
          >
            Corriger le stock
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Champ
          libelle="Quantité comptée"
          obligatoire
          aide={
            ecart === null
              ? undefined
              : ecart === 0
                ? 'Aucun écart : rien à corriger.'
                : `Écart : ${signe(ecart)} unité(s).`
          }
        >
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={compte}
              onChange={(e) => {
                setCompte(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="Motif" obligatoire>
          {(a) => (
            <Saisie
              {...a}
              value={motif}
              onChange={(e) => {
                setMotif(e.target.value)
              }}
            />
          )}
        </Champ>
        {erreur && <Alerte ton="danger" titre={erreur} />}
      </div>
    </Modale>
  )
}

/** Réglages servant aux alertes et aux prévisions (Phase 11). */
export function ModaleAlertes({ ligne, onFermer }: { ligne: LigneStock; onFermer: () => void }) {
  const [seuil, setSeuil] = useState(String(ligne.seuilAlerte))
  const [delai, setDelai] = useState(
    ligne.delaiApproJours === null ? '' : String(ligne.delaiApproJours),
  )
  const [securite, setSecurite] = useState(
    ligne.stockSecuriteJours === null ? '' : String(ligne.stockSecuriteJours),
  )
  const { lancer, enCours, erreur } = useAction(onFermer)
  const s = entier(seuil)
  const d = delai.trim() === '' ? null : entier(delai)
  const j = securite.trim() === '' ? null : entier(securite)
  const valide =
    s !== null &&
    s >= 0 &&
    (delai.trim() === '' || (d !== null && d > 0)) &&
    (securite.trim() === '' || (j !== null && j >= 0))
  return (
    <Modale
      ouverte
      onFermer={onFermer}
      titre={`Alertes · ${ligne.produit}`}
      description="Ces valeurs déclenchent l’alerte « Stock bas » et serviront aux prévisions de réapprovisionnement."
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton
            enCours={enCours}
            disabled={!valide}
            onClick={() => {
              if (s !== null)
                lancer(
                  {
                    type: 'alertes',
                    produitId: ligne.produitId,
                    seuil: s,
                    delaiAppro: d,
                    securite: j,
                  },
                  'Réglages enregistrés.',
                )
            }}
          >
            Enregistrer
          </Bouton>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <Champ libelle="Seuil d’alerte" obligatoire aide="Unités disponibles">
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
        <Champ libelle="Délai fournisseur" aide="Jours (facultatif)">
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={delai}
              onChange={(e) => {
                setDelai(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="Stock de sécurité" aide="Jours (facultatif)">
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={securite}
              onChange={(e) => {
                setSecurite(e.target.value)
              }}
            />
          )}
        </Champ>
      </div>
      {erreur && <Alerte ton="danger" titre={erreur} className="mt-5" />}
    </Modale>
  )
}

type LigneSaisie = { cle: string; varianteId: string; quantite: string; cout: string }

/** Réception fournisseur à plusieurs lignes, enregistrée en une seule opération. */
export function ModaleReception({
  stock,
  initiale,
  onFermer,
}: {
  stock: LigneStock[]
  initiale?: string
  onFermer: () => void
}) {
  const fournisseurs = useFournisseurs()
  const [cle] = useState(() => `reception-${crypto.randomUUID()}`)
  const [fournisseurId, setFournisseurId] = useState('')
  const [reference, setReference] = useState('')
  const [lignes, setLignes] = useState<LigneSaisie[]>(() => [
    { cle: crypto.randomUUID(), varianteId: initiale ?? '', quantite: '', cout: '' },
  ])
  const { lancer, enCours, erreur } = useAction(onFermer)
  const valides = lignes.filter((l) => l.varianteId && (entier(l.quantite) ?? 0) > 0)
  const doublons = new Set(valides.map((l) => l.varianteId)).size !== valides.length
  const valide = valides.length === lignes.length && valides.length > 0 && !doublons
  const total = valides.reduce((s, l) => s + (entier(l.quantite) ?? 0), 0)

  function maj(i: number, champ: keyof LigneSaisie, valeur: string) {
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, [champ]: valeur } : l)))
  }

  return (
    <Modale
      ouverte
      forme="tiroir"
      onFermer={onFermer}
      titre="Nouvelle réception"
      description="Marchandise reçue d’un fournisseur. Chaque ligne crée une entrée de stock."
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton
            enCours={enCours}
            disabled={!valide}
            onClick={() => {
              lancer(
                {
                  type: 'reception',
                  cle,
                  fournisseurId: fournisseurId || null,
                  referenceFournisseur: reference.trim(),
                  lignes: valides.map((l) => ({
                    varianteId: l.varianteId,
                    quantite: entier(l.quantite) ?? 0,
                    coutUnitaire: l.cout.trim() === '' ? null : entier(l.cout),
                  })),
                },
                `Réception enregistrée : ${String(total)} unité(s) entrée(s).`,
              )
            }}
          >
            Enregistrer ({total})
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            libelle="Fournisseur"
            aide={
              fournisseurs.data?.length === 0
                ? 'Ajoutez vos fournisseurs dans l’onglet Fournisseurs.'
                : undefined
            }
          >
            {(a) => (
              <Selection
                {...a}
                value={fournisseurId}
                onChange={(e) => {
                  setFournisseurId(e.target.value)
                }}
              >
                <option value="">Non précisé</option>
                {fournisseurs.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </Selection>
            )}
          </Champ>
          <Champ libelle="Bon de livraison" aide="Référence du fournisseur (facultatif)">
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
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-[13px] font-semibold text-ivoire-2">Articles reçus</legend>
          {lignes.map((l, i) => (
            <div
              key={l.cle}
              className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-[12px] border border-filet p-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Selection
                    aria-label={`Produit, ligne ${String(i + 1)}`}
                    value={l.varianteId}
                    onChange={(e) => {
                      maj(i, 'varianteId', e.target.value)
                    }}
                  >
                    <option value="">Produit…</option>
                    {stock.map((s) => (
                      <option key={s.varianteId} value={s.varianteId}>
                        {s.produit}
                        {s.libelle !== 'Format standard' ? ` · ${s.libelle}` : ''}
                      </option>
                    ))}
                  </Selection>
                </div>
                <Saisie
                  aria-label={`Quantité, ligne ${String(i + 1)}`}
                  inputMode="numeric"
                  placeholder="Qté"
                  value={l.quantite}
                  onChange={(e) => {
                    maj(i, 'quantite', e.target.value)
                  }}
                />
                <Saisie
                  aria-label={`Coût unitaire en FCFA, ligne ${String(i + 1)}`}
                  inputMode="numeric"
                  placeholder="Coût (FCFA)"
                  value={l.cout}
                  onChange={(e) => {
                    maj(i, 'cout', e.target.value)
                  }}
                />
              </div>
              <BoutonIcone
                libelle={`Retirer la ligne ${String(i + 1)}`}
                variante="fantome"
                disabled={lignes.length === 1}
                onClick={() => {
                  setLignes((ls) => ls.filter((_, j) => j !== i))
                }}
              >
                <Trash2 />
              </BoutonIcone>
            </div>
          ))}
          <Bouton
            variante="secondaire"
            taille="petit"
            icone={<Plus />}
            className="self-start"
            onClick={() => {
              setLignes((ls) => [
                ...ls,
                { cle: crypto.randomUUID(), varianteId: '', quantite: '', cout: '' },
              ])
            }}
          >
            Ajouter un article
          </Bouton>
          {doublons && (
            <p className="text-[13px] text-alerte">
              Un même produit apparaît deux fois : regroupez les quantités.
            </p>
          )}
        </fieldset>
        {erreur && <Alerte ton="danger" titre={erreur} />}
      </div>
    </Modale>
  )
}

export function ModaleFournisseur({
  fournisseur,
  onFermer,
}: {
  fournisseur: Fournisseur | null
  onFermer: () => void
}) {
  const enregistrer = useEnregistrerFournisseur()
  const { notifier } = useNotifications()
  const [nom, setNom] = useState(fournisseur?.nom ?? '')
  const [telephone, setTelephone] = useState(fournisseur?.telephone ?? '')
  const [ville, setVille] = useState(fournisseur?.ville ?? '')
  const [notes, setNotes] = useState(fournisseur?.notes ?? '')
  const [erreur, setErreur] = useState<string | null>(null)
  const tel = telephone.replace(/[\s.-]/g, '')
  const telValide = tel === '' || /^\+[1-9]\d{7,14}$/.test(tel)
  return (
    <Modale
      ouverte
      onFermer={onFermer}
      titre={fournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton
            enCours={enregistrer.isPending}
            disabled={nom.trim().length < 2 || !telValide}
            onClick={() => {
              setErreur(null)
              enregistrer.mutate(
                {
                  ...(fournisseur ? { id: fournisseur.id } : {}),
                  nom: nom.trim(),
                  telephone: tel || null,
                  ville: ville.trim() || null,
                  notes: notes.trim() || null,
                },
                {
                  onSuccess: () => {
                    notifier('Fournisseur enregistré.', 'succes')
                    onFermer()
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
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Champ libelle="Nom" obligatoire className="sm:col-span-2">
          {(a) => (
            <Saisie
              {...a}
              value={nom}
              onChange={(e) => {
                setNom(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ
          libelle="Téléphone"
          erreur={telValide ? undefined : 'Format international attendu, ex. +237 6 90 00 00 00'}
        >
          {(a) => (
            <Saisie
              {...a}
              type="tel"
              value={telephone}
              onChange={(e) => {
                setTelephone(e.target.value)
              }}
              placeholder="+237…"
            />
          )}
        </Champ>
        <Champ libelle="Ville">
          {(a) => (
            <Saisie
              {...a}
              value={ville}
              onChange={(e) => {
                setVille(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="Notes" className="sm:col-span-2">
          {(a) => (
            <ZoneTexte
              {...a}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
              }}
            />
          )}
        </Champ>
        {erreur && <Alerte ton="danger" titre={erreur} className="sm:col-span-2" />}
      </div>
    </Modale>
  )
}
