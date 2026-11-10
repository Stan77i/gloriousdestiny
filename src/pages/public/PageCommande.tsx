import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ArrowLeft, Lock } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router'
import { z } from 'zod'
import { CHEMINS } from '@/app/router/chemins'
import { Alerte } from '@/components/ui/Alerte'
import { Bouton } from '@/components/ui/Bouton'
import { Champ, Saisie, Selection, ZoneTexte } from '@/components/ui/Champs'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { useDisponibilites, useProduits } from '@/features/catalogue/requetes'
import {
  cleIdempotence,
  memoriserDerniereCommande,
  oublierCleCommande,
} from '@/features/commande/cleCommande'
import { usePanier } from '@/features/panier/usePanier'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterFcfa } from '@/lib/format/montant'
import { normaliserTelephone } from '@/lib/format/telephone'
import { listerVilles, type Ville } from '@/services/clientes.service'
import { creerCommande } from '@/services/commandes.service'

const schema = z.object({
  nom: z.string().trim().min(2, 'Indiquez votre nom (2 caractères minimum).').max(120),
  villeId: z.string().min(1, 'Choisissez votre ville.'),
  telephone: z.string().trim().min(1, 'Indiquez votre numéro de téléphone.'),
  email: z
    .string()
    .trim()
    .max(160)
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Adresse e-mail invalide.'),
  quartier: z.string().trim().min(1, 'Indiquez votre quartier.').max(120),
  adresse: z.string().trim().max(300),
  pointDeRepere: z
    .string()
    .trim()
    .min(3, 'Un point de repère aide le livreur à vous trouver.')
    .max(300),
  notes: z.string().trim().max(1000),
})
type Valeurs = z.infer<typeof schema>

const EXEMPLE_TEL: Record<Ville['indicatif'], string> = {
  '+237': '6 90 00 00 00',
  '+225': '07 07 07 07 07',
}

/** Finalisation de la commande : coordonnées, adresse de livraison, enregistrement. */
export function PageCommande() {
  useTitreDocument('Commande')
  const panier = usePanier()
  const naviguer = useNavigate()
  const client = useQueryClient()
  const produits = useProduits()
  const villes = useQuery({ queryKey: ['villes'], queryFn: listerVilles, staleTime: 60 * 60_000 })
  const dispo = useDisponibilites(panier.lignes.map((l) => l.varianteId))
  const [erreur, setErreur] = useState<string | null>(null)
  // Une fois la commande enregistrée, le panier est vidé : ne pas rediriger vers le panier vide.
  const [enregistree, setEnregistree] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Valeurs>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '',
      villeId: '',
      telephone: '',
      email: '',
      quartier: '',
      adresse: '',
      pointDeRepere: '',
      notes: '',
    },
  })
  const villeId = useWatch({ control, name: 'villeId' })
  const ville = villes.data?.find((v) => String(v.id) === villeId)

  if (panier.lignes.length === 0 && !enregistree) return <Navigate to={CHEMINS.panier} replace />

  const index = new Map(
    (produits.data ?? []).flatMap((p) =>
      p.variantes.map((v) => [v.id, { produit: p, variante: v }] as const),
    ),
  )
  const lignes = panier.lignes.map((l) => ({ ...l, ref: index.get(l.varianteId) }))
  const total = lignes.reduce((s, l) => s + (l.ref ? l.ref.variante.prix * l.quantite : 0), 0)
  const bloquantes = lignes.filter((l) => !l.ref || dispo.data?.get(l.varianteId) === 'epuise')

  const soumettre = handleSubmit(async (v) => {
    setErreur(null)
    const villeChoisie = villes.data?.find((x) => String(x.id) === v.villeId)
    if (!villeChoisie) return
    const telephone = normaliserTelephone(v.telephone, villeChoisie.indicatif)
    if (!telephone) {
      setError('telephone', {
        message: `Numéro invalide pour ${villeChoisie.nom} : ${villeChoisie.indicatif === '+237' ? '9' : '10'} chiffres attendus après ${villeChoisie.indicatif}.`,
      })
      return
    }
    try {
      const commande = await creerCommande({
        cleIdempotence: cleIdempotence(panier.lignes),
        cliente: { nom: v.nom, telephone, email: v.email || undefined },
        adresse: {
          villeId: villeChoisie.id,
          quartier: v.quartier,
          adresse: v.adresse || undefined,
          pointDeRepere: v.pointDeRepere,
        },
        lignes: panier.lignes,
        notes: v.notes || undefined,
      })
      setEnregistree(true)
      memoriserDerniereCommande(commande.reference, telephone)
      oublierCleCommande()
      panier.vider()
      void client.invalidateQueries({ queryKey: ['disponibilites'] })
      void naviguer(CHEMINS.suiviCommande(commande.reference), {
        replace: true,
        state: { nouvelle: true },
      })
    } catch (e) {
      const app = versErreurApp(e)
      if (app.code === 'stock_insuffisant') {
        const produit = app.detail?.split(': ')[1]
        setErreur(
          produit
            ? `Il ne reste plus assez de « ${produit} ». Réduisez la quantité ou retirez-le du panier.`
            : app.message,
        )
        void client.invalidateQueries({ queryKey: ['disponibilites'] })
      } else {
        setErreur(app.message)
      }
    }
  })

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
      <Link
        to={CHEMINS.panier}
        className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-encre-3 no-underline hover:text-encre [&_svg]:size-4"
      >
        <ArrowLeft aria-hidden="true" />
        Panier
      </Link>
      <EnTetePage
        className="pt-4"
        titre="Commande"
        intro="Vos coordonnées pour la livraison. Vous payez à la réception, en espèces ou par Mobile Money."
      />
      <form
        noValidate
        onSubmit={(e) => void soumettre(e)}
        className="grid gap-10 pb-10 lg:grid-cols-[1fr_380px]"
      >
        <div className="flex flex-col gap-10">
          <fieldset className="grid gap-5 sm:grid-cols-2">
            <legend className="mb-5 text-[19px] font-semibold text-encre">Vos coordonnées</legend>
            <Champ
              libelle="Nom complet"
              obligatoire
              erreur={errors.nom?.message}
              className="sm:col-span-2"
            >
              {(a) => <Saisie {...a} autoComplete="name" {...register('nom')} />}
            </Champ>
            <Champ libelle="Ville de livraison" obligatoire erreur={errors.villeId?.message}>
              {(a) => (
                <Selection {...a} {...register('villeId')} disabled={!villes.data}>
                  <option value="">Choisir…</option>
                  {villes.data?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nom}
                    </option>
                  ))}
                </Selection>
              )}
            </Champ>
            <Champ
              libelle="Téléphone"
              obligatoire
              erreur={errors.telephone?.message}
              aide={
                ville
                  ? `Numéro ${ville.pays === 'CM' ? 'camerounais' : 'ivoirien'}, ex. ${EXEMPLE_TEL[ville.indicatif]}`
                  : 'Choisissez d’abord votre ville.'
              }
            >
              {(a) => (
                <div className="flex">
                  <span className="inline-flex min-h-12 items-center rounded-l-champ border border-r-0 border-filet-champ bg-carte-2 px-3 text-[15px] text-encre-2">
                    {ville?.indicatif ?? '+…'}
                  </span>
                  <Saisie
                    {...a}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    className="rounded-l-none"
                    {...register('telephone')}
                  />
                </div>
              )}
            </Champ>
            <Champ
              libelle="E-mail (facultatif)"
              erreur={errors.email?.message}
              className="sm:col-span-2"
            >
              {(a) => <Saisie {...a} type="email" autoComplete="email" {...register('email')} />}
            </Champ>
          </fieldset>

          <fieldset className="grid gap-5 sm:grid-cols-2">
            <legend className="mb-5 text-[19px] font-semibold text-encre">
              Adresse de livraison
            </legend>
            <Champ libelle="Quartier" obligatoire erreur={errors.quartier?.message}>
              {(a) => <Saisie {...a} autoComplete="address-level3" {...register('quartier')} />}
            </Champ>
            <Champ libelle="Rue, immeuble (facultatif)" erreur={errors.adresse?.message}>
              {(a) => <Saisie {...a} autoComplete="street-address" {...register('adresse')} />}
            </Champ>
            <Champ
              libelle="Point de repère"
              obligatoire
              erreur={errors.pointDeRepere?.message}
              aide="Ex. : face à la pharmacie, portail noir."
              className="sm:col-span-2"
            >
              {(a) => <Saisie {...a} {...register('pointDeRepere')} />}
            </Champ>
            <Champ
              libelle="Précisions (facultatif)"
              erreur={errors.notes?.message}
              className="sm:col-span-2"
            >
              {(a) => (
                <ZoneTexte
                  {...a}
                  placeholder="Créneau de livraison préféré, question…"
                  {...register('notes')}
                />
              )}
            </Champ>
          </fieldset>
        </div>

        <aside
          aria-labelledby="titre-recap-commande"
          className="flex flex-col gap-5 self-start rounded-panneau border border-filet bg-carte p-6 lg:sticky lg:top-24"
        >
          <h2 id="titre-recap-commande" className="text-[17px] font-semibold">
            Votre commande
          </h2>
          <ul className="flex flex-col gap-3 text-sm">
            {lignes.map((l) => (
              <li key={l.varianteId} className="flex justify-between gap-4">
                <span className="text-encre-2">
                  {l.ref?.produit.nom ?? 'Article indisponible'}{' '}
                  <span className="chiffres text-encre-3">× {l.quantite}</span>
                </span>
                <span className="chiffres whitespace-nowrap">
                  {l.ref ? formaterFcfa(l.ref.variante.prix * l.quantite) : '—'}
                </span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2 border-t border-filet pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-encre-2">Livraison</dt>
              <dd className="text-encre-3">Convenue avec vous</dd>
            </div>
            <div className="flex justify-between gap-4 text-[17px] font-semibold">
              <dt>Total</dt>
              <dd className="chiffres text-or-texte">{formaterFcfa(total)}</dd>
            </div>
          </dl>
          {bloquantes.length > 0 && (
            <Alerte ton="alerte" titre="Un article n’est plus disponible">
              Retournez au panier pour le retirer.
            </Alerte>
          )}
          {erreur && <Alerte ton="danger" titre={erreur} />}
          <Bouton
            type="submit"
            taille="grand"
            enCours={isSubmitting}
            disabled={bloquantes.length > 0 || produits.isPending}
            className="w-full"
          >
            Valider ma commande
          </Bouton>
          <p className="flex gap-2 text-[13px] leading-relaxed text-encre-3 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0">
            <Lock aria-hidden="true" />
            Aucun paiement maintenant. Notre équipe vous contacte pour confirmer la commande et la
            livraison.
          </p>
        </aside>
      </form>
    </div>
  )
}
