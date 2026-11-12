import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Alerte } from '@/components/ui/Alerte'
import { Bouton } from '@/components/ui/Bouton'
import { Champ, Interrupteur, Saisie, ZoneTexte } from '@/components/ui/Champs'
import { Modale } from '@/components/ui/Modale'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { urlPhotoPrestation } from '@/services/catalogue.service'
import {
  schemaPrestation,
  verifierPhotoPrestation,
  type SaisiePrestation,
  type ServiceAdmin,
} from '@/services/catalogueAdmin.service'
import { useModifierPrestation } from './requetes'

/**
 * Prestation de la rubrique « Nos prestations » : nom, description, prix, photo et
 * disponibilité. Le site lit ces valeurs directement : le prix n'est écrit nulle part ailleurs.
 */
export function ModalePrestation({
  service,
  onFermer,
}: {
  service: ServiceAdmin
  onFermer: () => void
}) {
  const { notifier } = useNotifications()
  const modifier = useModifierPrestation()
  const [v, setV] = useState<SaisiePrestation>({
    nom: service.nom,
    prix: String(service.prixFcfa),
    publie: service.publie,
    description: service.description,
    coupDeCoeur: service.coupDeCoeur,
  })
  const [erreurs, setErreurs] = useState<Partial<Record<string, string>>>({})
  const [photo, setPhoto] = useState<File | null>(null)
  const [retirer, setRetirer] = useState(false)
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null)
  const apercu = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(
    () => () => {
      if (apercu) URL.revokeObjectURL(apercu)
    },
    [apercu],
  )

  const actuelle = retirer ? null : urlPhotoPrestation(service.image)
  const visible = photo ? apercu : actuelle

  function enregistrer() {
    const r = schemaPrestation.safeParse(v)
    if (!r.success) {
      const e: Partial<Record<string, string>> = {}
      for (const i of r.error.issues) e[String(i.path[0] ?? '')] ??= i.message
      setErreurs(e)
      return
    }
    setErreurs({})
    modifier.mutate(
      { id: service.id, saisie: r.data, photo, retirerPhoto: retirer },
      {
        onSuccess: () => {
          notifier(`${r.data.nom} : modifications enregistrées.`, 'succes')
          onFermer()
        },
      },
    )
  }

  return (
    <Modale
      ouverte
      forme="tiroir"
      onFermer={onFermer}
      titre={service.nom}
      description="Rubrique « Nos prestations ». Les demandes déjà reçues gardent leur prix."
      pied={
        <>
          <Bouton variante="fantome" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton enCours={modifier.isPending} onClick={enregistrer}>
            Enregistrer
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {modifier.isError && <Alerte ton="danger" titre={versErreurApp(modifier.error).message} />}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-encre">Photo</span>
          <div className="relative aspect-[4/5] w-40 overflow-hidden rounded-[18px] bg-sable">
            {visible ? (
              <img src={visible} alt="" className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center px-3 text-center text-[13px] text-encre-3">
                Aucune photo : le site affiche l’illustration de la prestation.
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-filet px-4 text-sm font-medium text-encre hover:border-or [&_svg]:size-4">
              <ImagePlus aria-hidden="true" />
              {visible ? 'Changer la photo' : 'Ajouter une photo'}
              <input
                type="file"
                accept="image/webp,image/png,image/jpeg,image/avif"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const erreur = verifierPhotoPrestation(f)
                  setErreurPhoto(erreur)
                  if (!erreur) {
                    setPhoto(f)
                    setRetirer(false)
                  }
                }}
              />
            </label>
            {visible && (
              <Bouton
                variante="fantome"
                taille="petit"
                icone={<Trash2 />}
                onClick={() => {
                  setPhoto(null)
                  setRetirer(true)
                }}
              >
                Retirer
              </Bouton>
            )}
          </div>
          <p className="text-[13px] text-encre-3">
            Format portrait 4:5 conseillé (ex. 1600 × 2000 px), 5 Mo au plus.
          </p>
          {erreurPhoto && (
            <p role="alert" className="text-sm text-alerte">
              {erreurPhoto}
            </p>
          )}
        </div>
        <Champ libelle="Nom" obligatoire erreur={erreurs['nom']}>
          {(a) => (
            <Saisie
              {...a}
              value={v.nom}
              onChange={(e) => {
                setV((x) => ({ ...x, nom: e.target.value }))
              }}
            />
          )}
        </Champ>
        <Champ libelle="Prix (FCFA)" obligatoire erreur={erreurs['prix']}>
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={v.prix}
              onChange={(e) => {
                setV((x) => ({ ...x, prix: e.target.value }))
              }}
            />
          )}
        </Champ>
        <Interrupteur
          libelle={v.publie ? 'Disponible sur le site' : 'Indisponible (masquée du site)'}
          checked={v.publie}
          onChange={(e) => {
            setV((x) => ({ ...x, publie: e.target.checked }))
          }}
        />
        <Interrupteur
          libelle="Badge « Coup de cœur » (choix de l’équipe)"
          checked={v.coupDeCoeur}
          onChange={(e) => {
            setV((x) => ({ ...x, coupDeCoeur: e.target.checked }))
          }}
        />
        <p className="-mt-3 text-[13px] text-encre-3">
          « Très demandée » s’affiche tout seul à partir de 3 demandes reçues en 90 jours.
        </p>
        <Champ libelle="Description" erreur={erreurs['description']}>
          {(a) => (
            <ZoneTexte
              {...a}
              rows={6}
              value={v.description}
              onChange={(e) => {
                setV((x) => ({ ...x, description: e.target.value }))
              }}
            />
          )}
        </Champ>
      </div>
    </Modale>
  )
}
