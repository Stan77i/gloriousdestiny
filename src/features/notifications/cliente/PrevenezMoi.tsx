import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { Alerte } from '@/components/ui/Alerte'
import { Bouton } from '@/components/ui/Bouton'
import { CaseACocher, Champ, Saisie, Selection } from '@/components/ui/Champs'
import { useMutation } from '@tanstack/react-query'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { normaliserTelephone, type Indicatif } from '@/lib/format/telephone'
import { demanderAlerteRetourStock } from '@/services/notifications.service'
import { suivreAlerte } from './memoire'

/**
 * « Prévenez-moi au retour en stock » sur un article épuisé. Consentement explicite (case non
 * cochée par défaut). La demande est enregistrée par la base ; au retour en stock, l'équipe
 * reçoit le message prêt et la visiteuse voit la notification sur cet appareil.
 */
export function PrevenezMoi({
  varianteId,
  produit,
  slug,
}: {
  varianteId: string
  produit: string
  slug: string
}) {
  const [nom, setNom] = useState('')
  const [indicatif, setIndicatif] = useState<Indicatif>('+237')
  const [tel, setTel] = useState('')
  const [accord, setAccord] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const demande = useMutation({ mutationFn: demanderAlerteRetourStock })

  if (demande.isSuccess) {
    return (
      <Alerte
        ton="succes"
        titre={
          demande.data === 'disponible'
            ? `${produit} vient de revenir : vous pouvez le commander.`
            : 'C’est noté : nous vous prévenons sur WhatsApp dès son retour.'
        }
      />
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const telephone = normaliserTelephone(tel, indicatif)
        if (nom.trim().length < 2) {
          setErreur('Indiquez votre prénom.')
          return
        }
        if (!telephone) {
          setErreur('Numéro WhatsApp invalide pour ce pays.')
          return
        }
        if (!accord) {
          setErreur('Cochez la case pour accepter d’être prévenue.')
          return
        }
        setErreur(null)
        demande.mutate(
          { varianteId, nom: nom.trim(), telephone, consentement: true },
          {
            onSuccess: (r) => {
              if (r === 'enregistree') suivreAlerte({ varianteId, produit, slug })
            },
          },
        )
      }}
      className="flex flex-col gap-3 rounded-[22px] bg-carte p-5 shadow-panneau"
    >
      <p className="flex items-center gap-2 font-semibold [&_svg]:size-4 [&_svg]:text-or-texte">
        <BellRing aria-hidden="true" />
        Prévenez-moi au retour en stock
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Prénom" obligatoire>
          {(a) => (
            <Saisie
              {...a}
              value={nom}
              autoComplete="given-name"
              onChange={(e) => {
                setNom(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="WhatsApp" obligatoire>
          {(a) => (
            <div className="flex gap-2">
              <div className="w-28 shrink-0">
                <Selection
                  aria-label="Indicatif"
                  value={indicatif}
                  onChange={(e) => {
                    setIndicatif(e.target.value as Indicatif)
                  }}
                >
                  <option value="+237">+237</option>
                  <option value="+225">+225</option>
                </Selection>
              </div>
              <Saisie
                {...a}
                type="tel"
                inputMode="tel"
                value={tel}
                onChange={(e) => {
                  setTel(e.target.value)
                }}
              />
            </div>
          )}
        </Champ>
      </div>
      <CaseACocher
        libelle="J’accepte d’être contactée sur WhatsApp, une seule fois, au retour de cet article."
        checked={accord}
        onChange={(e) => {
          setAccord(e.target.checked)
        }}
      />
      {(erreur ?? (demande.isError ? versErreurApp(demande.error).message : null)) && (
        <Alerte ton="danger" titre={erreur ?? versErreurApp(demande.error).message} />
      )}
      <Bouton
        type="submit"
        variante="secondaire"
        className="self-start"
        enCours={demande.isPending}
      >
        Me prévenir
      </Bouton>
    </form>
  )
}
