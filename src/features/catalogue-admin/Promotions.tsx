import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { Champ, Saisie, Selection } from '@/components/ui/Champs'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDateHeure } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import { supabase } from '@/services/supabase/client'

/**
 * Promotions d'un produit (propriétaire et admin) : pourcentage ou prix promotionnel, sur tout
 * le produit ou un format, avec dates de début et de fin. Le serveur calcule le prix effectif,
 * l'applique à la commande et fait disparaître la promotion à son expiration.
 */

type Promotion = {
  id: string
  variante_id: string | null
  mode: 'pourcentage' | 'prix'
  valeur: number
  debut: string
  fin: string | null
  actif: boolean
  libelle: string | null
}
type Format = { id: string; libelle: string; prix: number }

async function charger(produitId: string, prixProduit: number) {
  const [promos, formats] = await Promise.all([
    supabase()
      .from('promotions')
      .select('id, variante_id, mode, valeur, debut, fin, actif, libelle')
      .eq('produit_id', produitId)
      .order('created_at', { ascending: false }),
    supabase()
      .from('variantes')
      .select('id, libelle, prix_fcfa')
      .eq('produit_id', produitId)
      .eq('actif', true),
  ])
  if (promos.error) throw versErreurApp(promos.error)
  if (formats.error) throw versErreurApp(formats.error)
  return {
    promotions: promos.data as Promotion[],
    formats: formats.data
      .map((f) => ({ id: f.id, libelle: f.libelle, prix: f.prix_fcfa ?? prixProduit }))
      .sort((a, b) => a.prix - b.prix) as Format[],
  }
}

/** « 2026-11-20T18:00 » saisi à l'heure du salon (UTC+1) → horodatage ISO. */
const versIso = (v: string) => (v ? `${v}:00+01:00` : '')

function etat(
  p: Promotion,
  maintenant: number,
): { libelle: string; ton: 'succes' | 'or' | 'neutre' } {
  if (!p.actif) return { libelle: 'Désactivée', ton: 'neutre' }
  if (new Date(p.debut).getTime() > maintenant) return { libelle: 'Programmée', ton: 'or' }
  if (p.fin && new Date(p.fin).getTime() <= maintenant)
    return { libelle: 'Terminée', ton: 'neutre' }
  return { libelle: 'En cours', ton: 'succes' }
}

export function PromotionsProduit({
  produitId,
  prixProduit,
}: {
  produitId: string
  prixProduit: number
}) {
  const client = useQueryClient()
  const { notifier } = useNotifications()
  const donnees = useQuery({
    queryKey: ['admin', 'promotions', produitId],
    queryFn: () => charger(produitId, prixProduit),
  })
  const [maintenant] = useState(() => Date.now())
  const [portee, setPortee] = useState('')
  const [mode, setMode] = useState<'pourcentage' | 'prix'>('pourcentage')
  const [valeur, setValeur] = useState('')
  const [debut, setDebut] = useState('')
  const [fin, setFin] = useState('')
  const [libelle, setLibelle] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const invalider = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['admin', 'promotions', produitId] }),
      client.invalidateQueries({ queryKey: ['produits'] }),
      client.invalidateQueries({ queryKey: ['produit'] }),
    ])
  const enregistrer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase().rpc('enregistrer_promotion', {
        p: {
          produit_id: produitId,
          variante_id: portee || null,
          mode,
          valeur: Number.parseInt(valeur, 10),
          debut: versIso(debut),
          fin: versIso(fin),
          libelle: libelle.trim(),
        },
      })
      if (error) throw versErreurApp(error)
    },
    onSettled: invalider,
  })
  const desactiver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase().rpc('desactiver_promotion', { p_id: id })
      if (error) throw versErreurApp(error)
    },
    onSettled: invalider,
  })

  const n = Number.parseInt(valeur, 10)
  const formats = donnees.data?.formats ?? []
  const vises = portee ? formats.filter((f) => f.id === portee) : formats
  const apercu =
    Number.isInteger(n) && n > 0
      ? vises.map((f) => {
          const promo = mode === 'pourcentage' ? Math.round((f.prix * (100 - n)) / 100) : n
          return { ...f, promo, reduction: Math.round((100 * (f.prix - promo)) / f.prix) }
        })
      : []
  const invalide =
    !Number.isInteger(n) ||
    n <= 0 ||
    (mode === 'pourcentage' && n > 90) ||
    apercu.some((a) => a.promo >= a.prix || a.promo <= 0) ||
    (fin !== '' && debut !== '' && fin <= debut)

  return (
    <section
      aria-labelledby="titre-promotions"
      className="flex flex-col gap-4 border-t border-filet pt-5"
    >
      <h3 id="titre-promotions" className="text-[17px] font-semibold">
        Promotion
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="S’applique à">
          {(a) => (
            <Selection
              {...a}
              value={portee}
              onChange={(e) => {
                setPortee(e.target.value)
              }}
            >
              <option value="">Tous les formats</option>
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.libelle} ({formaterFcfa(f.prix)})
                </option>
              ))}
            </Selection>
          )}
        </Champ>
        <Champ libelle="Type">
          {(a) => (
            <Selection
              {...a}
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as typeof mode)
              }}
            >
              <option value="pourcentage">Pourcentage de réduction</option>
              <option value="prix">Prix promotionnel</option>
            </Selection>
          )}
        </Champ>
        <Champ
          libelle={mode === 'pourcentage' ? 'Réduction (%)' : 'Prix promotionnel (FCFA)'}
          obligatoire
        >
          {(a) => (
            <Saisie
              {...a}
              inputMode="numeric"
              value={valeur}
              onChange={(e) => {
                setValeur(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ libelle="Début" aide="Vide : tout de suite (heure de Douala).">
          {(a) => (
            <Saisie
              {...a}
              type="datetime-local"
              value={debut}
              onChange={(e) => {
                setDebut(e.target.value)
              }}
            />
          )}
        </Champ>
        <Champ
          libelle="Mention (facultative)"
          aide="Affichée avec la réduction, 40 caractères au plus."
        >
          {(a) => (
            <>
              <Saisie
                {...a}
                list="mentions-promotion"
                maxLength={40}
                value={libelle}
                onChange={(e) => {
                  setLibelle(e.target.value)
                }}
                placeholder="Ex. Offre spéciale"
              />
              <datalist id="mentions-promotion">
                <option value="Offre spéciale" />
                <option value="Offre limitée" />
                <option value="Prix doux" />
                <option value="Offre de lancement" />
              </datalist>
            </>
          )}
        </Champ>
        <Champ
          libelle="Fin"
          aide="Vide : jusqu’à désactivation. Le compte à rebours du site s’appuie sur cette date."
        >
          {(a) => (
            <Saisie
              {...a}
              type="datetime-local"
              value={fin}
              onChange={(e) => {
                setFin(e.target.value)
              }}
            />
          )}
        </Champ>
      </div>
      {apercu.length > 0 && (
        <ul
          aria-label="Aperçu des prix"
          className="flex flex-col gap-1 rounded-[14px] bg-carte-2 px-4 py-3 text-[13px]"
        >
          {apercu.map((a) => (
            <li key={a.id} className="chiffres flex justify-between gap-3">
              <span>{a.libelle}</span>
              <span>
                <span className="text-encre-3 line-through">{formaterFcfa(a.prix)}</span> →{' '}
                <strong className={a.promo >= a.prix ? 'text-danger' : 'text-encre'}>
                  {formaterFcfa(a.promo)}
                </strong>{' '}
                {a.promo < a.prix && <span className="text-or-texte">(−{a.reduction} %)</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {erreur && <Alerte ton="danger" titre={erreur} />}
      <div>
        <Bouton
          variante="or"
          disabled={invalide}
          enCours={enregistrer.isPending}
          onClick={() => {
            setErreur(null)
            enregistrer.mutate(undefined, {
              onSuccess: () => {
                notifier(
                  'Promotion enregistrée : elle s’affiche sur le site aux dates prévues.',
                  'succes',
                )
                setValeur('')
                setDebut('')
                setFin('')
                setLibelle('')
              },
              onError: (e) => {
                setErreur(versErreurApp(e).message)
              },
            })
          }}
        >
          Activer la promotion
        </Bouton>
      </div>
      {donnees.data && donnees.data.promotions.length > 0 && (
        <ul
          aria-label="Promotions du produit"
          className="flex flex-col divide-y divide-filet rounded-[14px] bg-carte-2"
        >
          {donnees.data.promotions.map((p) => {
            const e = etat(p, maintenant)
            const format = formats.find((f) => f.id === p.variante_id)
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px]"
              >
                <span>
                  <span className="font-semibold">
                    {p.mode === 'pourcentage' ? `−${String(p.valeur)} %` : formaterFcfa(p.valeur)}
                  </span>{' '}
                  · {format ? format.libelle : 'tous les formats'}
                  {p.libelle && ` · ${p.libelle}`}
                  <span className="block text-encre-3">
                    du {formaterDateHeure(p.debut)}
                    {p.fin ? ` au ${formaterDateHeure(p.fin)}` : ', sans date de fin'}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge ton={e.ton}>{e.libelle}</Badge>
                  {p.actif && e.libelle !== 'Terminée' && (
                    <Bouton
                      taille="petit"
                      variante="fantome"
                      enCours={desactiver.isPending && desactiver.variables === p.id}
                      onClick={() => {
                        desactiver.mutate(p.id, {
                          onSuccess: () => {
                            notifier('Promotion désactivée.', 'succes')
                          },
                        })
                      }}
                    >
                      Désactiver
                    </Bouton>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
