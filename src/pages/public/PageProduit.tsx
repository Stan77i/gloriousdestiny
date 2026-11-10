import { useState } from 'react'
import { ArrowLeft, Banknote, ShoppingBag, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { useNotifications } from '@/components/feedback/notifications/useNotifications'
import { Monogramme } from '@/components/produit/Monogramme'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { SelecteurQuantite } from '@/components/ui/SelecteurQuantite'
import { GrilleProduits } from '@/features/catalogue/GrilleProduits'
import { useDisponibilites, useProduit, useProduits } from '@/features/catalogue/requetes'
import { visuelProduit } from '@/features/catalogue/visuels'
import { QUANTITE_MAX } from '@/features/panier/panier'
import { usePanier } from '@/features/panier/usePanier'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterFcfa } from '@/lib/format/montant'
import { PageIntrouvable } from '@/pages/errors/PageIntrouvable'

/** Fiche produit (et fiche perruque : même structure, attributs en plus). */
export function PageProduit() {
  const { slug = '' } = useParams()
  const produit = useProduit(slug)
  const tous = useProduits()
  const panier = usePanier()
  const { notifier } = useNotifications()
  const [quantite, setQuantite] = useState(1)
  const [vue, setVue] = useState<'produit' | 'usage'>('produit')
  const variante = produit.data?.variantes[0]
  const dispo = useDisponibilites(variante ? [variante.id] : [])
  useTitreDocument(produit.data?.nom)

  if (produit.isPending) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-10">
        <Squelette className="aspect-square w-full rounded-panneau" />
        <div className="flex flex-col gap-4">
          <Squelette className="h-12 w-3/4" />
          <Squelette className="h-6 w-1/3" />
          <Squelette className="h-24 w-full" />
        </div>
      </div>
    )
  }
  if (produit.isError) {
    return (
      <EtatErreur
        message={versErreurApp(produit.error).message}
        onReessayer={() => void produit.refetch()}
      />
    )
  }
  if (!produit.data) return <PageIntrouvable />

  const p = produit.data
  const visuel = visuelProduit(p.slug)
  const statut = variante ? dispo.data?.get(variante.id) : undefined
  const epuise = statut === 'epuise' || !variante
  const similaires = tous.data?.filter(
    (x) => x.id !== p.id && x.categorie.slug === p.categorie.slug,
  )
  const retour = p.type === 'perruque' ? CHEMINS.perruques : CHEMINS.catalogue

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <Link
        to={retour}
        className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-encre-3 no-underline hover:text-encre [&_svg]:size-4"
      >
        <ArrowLeft aria-hidden="true" />
        {p.type === 'perruque' ? 'Perruques' : 'Catalogue'}
      </Link>

      <div className="grid gap-10 pt-4 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* Visuels */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden rounded-panneau border border-filet bg-[radial-gradient(120%_80%_at_50%_100%,var(--color-carte-3),var(--color-fond)_70%)]">
            {vue === 'usage' && visuel.photo ? (
              <img
                src={visuel.photo.grande}
                srcSet={`${visuel.photo.petite} 800w, ${visuel.photo.grande} 1600w`}
                sizes="(min-width: 1024px) 50vw, 100vw"
                alt={visuel.photo.alt}
                className="absolute inset-0 size-full object-cover"
              />
            ) : visuel.detoure ? (
              <img
                src={visuel.detoure}
                alt={`${p.nom}, flacon Glorious Destiny`}
                fetchPriority="high"
                className="absolute inset-0 size-full object-contain p-[10%]"
              />
            ) : (
              <Monogramme nom={p.nom} />
            )}
          </div>
          {visuel.photo && visuel.detoure && (
            <div role="group" aria-label="Choisir la vue" className="flex gap-3">
              {(
                [
                  ['produit', visuel.detoure, 'Le produit'],
                  ['usage', visuel.photo.petite, 'En situation'],
                ] as const
              ).map(([id, src, libelle]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={vue === id}
                  onClick={() => {
                    setVue(id)
                  }}
                  className={cx(
                    'relative size-20 overflow-hidden rounded-[12px] border bg-carte transition-colors',
                    vue === id ? 'border-or' : 'border-filet hover:border-filet-fort',
                  )}
                >
                  <img
                    src={src}
                    alt=""
                    className={cx(
                      'size-full',
                      id === 'produit' ? 'object-contain p-2' : 'object-cover',
                    )}
                  />
                  <span className="sr-only">{libelle}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informations et achat */}
        <div className="flex flex-col">
          <h1 className="titre-affiche text-[40px] text-encre sm:text-[56px]">{p.nom}</h1>
          <p className="mt-2 text-sm text-encre-3">{p.categorie.nom}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-[26px] font-semibold text-or-texte">
              {formaterFcfa(variante?.prix ?? p.prix)}
            </p>
            {variante && variante.libelle !== 'Format standard' && (
              <span className="text-encre-3">· {variante.libelle}</span>
            )}
            {statut === 'disponible' && <Badge ton="succes">En stock</Badge>}
            {statut === 'bientot_epuise' && <Badge ton="alerte">Bientôt épuisé</Badge>}
            {statut === 'epuise' && <Badge>Épuisé</Badge>}
          </div>
          {p.description && (
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-encre-2">
              {p.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SelecteurQuantite
              libelle="Quantité"
              valeur={quantite}
              max={QUANTITE_MAX}
              onChange={setQuantite}
            />
            <Bouton
              taille="grand"
              icone={<ShoppingBag />}
              disabled={epuise || dispo.isPending}
              onClick={() => {
                if (!variante) return
                panier.ajouter(variante.id, quantite)
                notifier(`${p.nom} ajouté au panier (${String(quantite)}).`, 'succes')
              }}
              className="flex-1 sm:flex-none"
            >
              {epuise ? 'Épuisé' : 'Ajouter au panier'}
            </Bouton>
          </div>
          <BoutonWhatsApp
            libelle="Une question ? Écrivez-nous"
            variante="fantome"
            className="mt-3 self-start"
            message={`Bonjour, j'ai une question sur ${p.nom}.`}
          />

          <ul className="mt-10 flex flex-col gap-4 border-t border-filet pt-8 text-sm text-encre-2">
            <li className="flex gap-3 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-or">
              <Truck aria-hidden="true" />
              Livraison à Douala, Yaoundé, Garoua et Abidjan.
            </li>
            <li className="flex gap-3 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-or">
              <Banknote aria-hidden="true" />
              Paiement à la livraison, en espèces ou par Mobile Money.
            </li>
          </ul>
        </div>
      </div>

      {similaires && similaires.length > 0 && (
        <section aria-labelledby="titre-similaires" className="border-t border-filet py-16">
          <h2 id="titre-similaires" className="titre-affiche mb-8 text-[34px] text-encre">
            Dans la même gamme
          </h2>
          <GrilleProduits
            produits={similaires.slice(0, 4)}
            chargement={false}
            erreur={null}
            onReessayer={() => void tous.refetch()}
            vide={null}
          />
        </section>
      )}
    </div>
  )
}
