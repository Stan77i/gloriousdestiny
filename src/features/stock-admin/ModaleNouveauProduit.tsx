import { useState } from 'react'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Alerte } from '@/components/ui/Alerte'
import { Bouton } from '@/components/ui/Bouton'
import { Champ, Interrupteur, Saisie, Selection, ZoneTexte } from '@/components/ui/Champs'
import { Modale } from '@/components/ui/Modale'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { useCategories, useOperationStock } from './requetes'

const entier = (v: string) => {
  const n = Number.parseInt(v.replace(/\s/g, ''), 10)
  return Number.isInteger(n) ? n : null
}

/**
 * Nouveau produit : il entre aussitôt dans le stock (et dans le catalogue s'il est publié).
 * La catégorie peut être créée à la volée ; le stock initial passe par un mouvement d'entrée.
 */
export function ModaleNouveauProduit({
  onFermer,
  onCree,
}: {
  onFermer: () => void
  onCree: (varianteId: string) => void
}) {
  const categories = useCategories()
  const operation = useOperationStock()
  const { notifier } = useNotifications()
  const [cle] = useState(() => `creation-${crypto.randomUUID()}`)
  const [nom, setNom] = useState('')
  const [categorie, setCategorie] = useState('')
  const [nouvelle, setNouvelle] = useState('')
  const [typeCategorie, setTypeCategorie] = useState<'produit' | 'cils' | 'perruque'>('produit')
  const [unite, setUnite] = useState('')
  const [prix, setPrix] = useState('')
  const [seuil, setSeuil] = useState('5')
  const [stockInitial, setStockInitial] = useState('0')
  const [description, setDescription] = useState('')
  const [publie, setPublie] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const nouvelleCat = categorie === '__nouvelle'
  const p = entier(prix)
  const s = entier(seuil)
  const st = entier(stockInitial)
  const valide =
    nom.trim().length >= 2 &&
    (nouvelleCat ? nouvelle.trim().length >= 2 : categorie !== '') &&
    p !== null &&
    p >= 0 &&
    s !== null &&
    s >= 0 &&
    st !== null &&
    st >= 0

  return (
    <Modale
      ouverte
      forme="tiroir"
      onFermer={onFermer}
      titre="Nouveau produit"
      description="Il apparaît aussitôt dans le stock, et sur le site s’il est publié."
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton
            variante="or"
            enCours={operation.isPending}
            disabled={!valide}
            onClick={() => {
              if (p === null || s === null || st === null) return
              setErreur(null)
              operation.mutate(
                {
                  type: 'creer_produit',
                  produit: {
                    nom: nom.trim(),
                    categorieId: nouvelleCat ? null : categorie,
                    nouvelleCategorie: nouvelleCat ? nouvelle.trim() : '',
                    typeCategorie,
                    unite: unite.trim(),
                    prix: p,
                    seuil: s,
                    stockInitial: st,
                    publie,
                    description: description.trim(),
                    cle,
                  },
                },
                {
                  onSuccess: (id) => {
                    notifier(`${nom.trim()} ajouté au stock.`, 'succes')
                    onCree(id as string)
                  },
                  onError: (e) => {
                    setErreur(versErreurApp(e).message)
                  },
                },
              )
            }}
          >
            Créer le produit
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
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
              <option value="">Choisir…</option>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Nom de la catégorie" obligatoire>
              {(a) => (
                <Saisie
                  {...a}
                  maxLength={80}
                  value={nouvelle}
                  onChange={(e) => {
                    setNouvelle(e.target.value)
                  }}
                  placeholder="Ex. Accessoires"
                />
              )}
            </Champ>
            <Champ libelle="Rayon du site">
              {(a) => (
                <Selection
                  {...a}
                  value={typeCategorie}
                  onChange={(e) => {
                    setTypeCategorie(e.target.value as typeof typeCategorie)
                  }}
                >
                  <option value="produit">Produits</option>
                  <option value="cils">Cils</option>
                  <option value="perruque">Perruques</option>
                </Selection>
              )}
            </Champ>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
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
          <Champ libelle="Stock initial" aide="Unités en rayon aujourd’hui (0 si aucune).">
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
          <Champ libelle="Seuil d’alerte">
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
        <Champ libelle="Description" aide="Facultatif : visible sur la fiche du site.">
          {(a) => (
            <ZoneTexte
              {...a}
              rows={3}
              maxLength={1500}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          )}
        </Champ>
        <Interrupteur
          libelle="Publier sur le site"
          checked={publie}
          onChange={(e) => {
            setPublie(e.target.checked)
          }}
        />
        {erreur && <Alerte ton="danger" titre={erreur} />}
      </div>
    </Modale>
  )
}
