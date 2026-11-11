import { SITE } from '@/config/site'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Banknote,
  Check,
  MessageCircle,
  Plus,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react'
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
import { ContenusPublics } from '@/features/contenus/ContenusPublics'
import { PrevenezMoi } from '@/features/notifications/cliente/PrevenezMoi'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { FOND_TEINTE, TEINTE_TYPE_PRODUIT } from '@/domain/univers'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterFcfa } from '@/lib/format/montant'
import { PageIntrouvable } from '@/pages/errors/PageIntrouvable'

/** Questions communes à tous les produits : les doutes qui bloquent un achat à distance. */
const FAQ_COMMUNE = [
  {
    q: 'Où livrez-vous ?',
    r: `${SITE.zonesLivraison}. Notre équipe vous appelle sur WhatsApp pour convenir du lieu, de l’heure et, hors Cameroun, des modalités d’envoi.`,
  },
  {
    q: 'Quand est-ce que je paie ?',
    r: 'À la livraison, en espèces ou par Mobile Money, quand vous avez le colis en main. Rien n’est payé sur le site.',
  },
  {
    q: 'Comment se passe la commande ?',
    r: 'Ajoutez au panier, validez vos coordonnées : votre commande est enregistrée et le stock vous est réservé. Vous confirmez ensuite en un message sur WhatsApp.',
  },
]

/**
 * Barre d'achat collante sur mobile : apparaît quand le bouton principal sort de l'écran,
 * pour que l'achat reste à portée de pouce pendant la lecture de la fiche.
 */
function useHorsEcran() {
  // Ref par rappel : l'élément n'existe qu'après le chargement de la fiche.
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [hors, setHors] = useState(false)
  useEffect(() => {
    if (!element) return
    // Zone d'observation prolongée vers le bas : l'élément n'en sort qu'en passant
    // au-dessus de l'écran, même si la page saute d'un coup (ancre, retour arrière).
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e) setHors(!e.isIntersecting)
      },
      { rootMargin: '0px 0px 100000px 0px' },
    )
    obs.observe(element)
    return () => {
      obs.disconnect()
    }
  }, [element])
  return [setElement, hors] as const
}

/** Fiche produit (et fiche perruque : même structure, attributs en plus). */
export function PageProduit() {
  const { slug = '' } = useParams()
  const produit = useProduit(slug)
  const tous = useProduits()
  const panier = usePanier()
  const { notifier } = useNotifications()
  const [quantite, setQuantite] = useState(1)
  const [vue, setVue] = useState<'produit' | 'usage'>('produit')
  const [refAchat, achatPasse] = useHorsEcran()
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
  const f = p.fiche
  const teinte = TEINTE_TYPE_PRODUIT[p.type]
  // « Complétez votre rituel » : d'abord les produits associés, puis la même catégorie.
  const autres = tous.data?.filter((x) => x.id !== p.id) ?? []
  const associes = f.associes.flatMap((s) => autres.filter((x) => x.slug === s))
  const similaires = [
    ...associes,
    ...autres.filter((x) => !associes.includes(x) && x.categorie.slug === p.categorie.slug),
  ]
  const ajouter = () => {
    if (!variante) return
    panier.ajouter(variante.id, quantite)
    notifier(`${p.nom} ajouté au panier (${String(quantite)}).`, 'succes')
  }
  const prix = formaterFcfa(variante?.prix ?? p.prix)
  const faq = [...f.faq, ...FAQ_COMMUNE]
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
          <div
            className={cx(
              'relative aspect-square overflow-hidden rounded-panneau',
              FOND_TEINTE[teinte],
            )}
          >
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
                    'relative size-20 overflow-hidden rounded-[18px] border-2 bg-carte transition-colors',
                    vue === id ? 'border-encre' : 'border-transparent hover:border-filet-fort',
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
          <p className="text-sm text-encre-3">{p.categorie.nom}</p>
          <h1 className="titre-affiche mt-2 text-[40px] text-encre sm:text-[56px]">{p.nom}</h1>
          {f.accroche && (
            <p className="mt-3 text-[21px] leading-snug font-semibold text-encre-2">{f.accroche}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-[26px] font-semibold text-or-texte">{prix}</p>
            {variante && variante.libelle !== 'Format standard' && (
              <span className="text-encre-3">· {variante.libelle}</span>
            )}
            {statut === 'disponible' && <Badge ton="succes">En stock</Badge>}
            {statut === 'bientot_epuise' && <Badge ton="alerte">Bientôt épuisé</Badge>}
            {statut === 'epuise' && <Badge>Épuisé</Badge>}
          </div>
          {(f.histoire ?? p.description) && (
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-encre-2">
              {f.histoire ?? p.description}
            </p>
          )}
          {f.benefices.length > 0 && (
            <ul aria-label="Les points forts" className="mt-6 flex flex-col gap-2.5">
              {f.benefices.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] text-encre">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-menthe text-sur-menthe [&_svg]:size-3"
                  >
                    <Check strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          )}

          <div ref={refAchat} className="mt-8 flex flex-wrap items-center gap-3">
            <SelecteurQuantite
              libelle="Quantité"
              valeur={quantite}
              max={QUANTITE_MAX}
              onChange={setQuantite}
            />
            <Bouton
              variante="or"
              taille="grand"
              icone={<ShoppingBag />}
              disabled={epuise || dispo.isPending}
              onClick={ajouter}
              className="flex-1 sm:flex-none"
            >
              {epuise ? 'Épuisé' : 'Ajouter au panier'}
            </Bouton>
          </div>
          {epuise && variante && statut === 'epuise' && (
            <div className="mt-4">
              <PrevenezMoi varianteId={variante.id} produit={p.nom} slug={p.slug} />
            </div>
          )}
          <BoutonWhatsApp
            libelle="Une question ? Écrivez-nous"
            variante="fantome"
            className="mt-3 self-start"
            message={`Bonjour, j'ai une question sur ${p.nom}.`}
          />

          <ul className="mt-8 grid gap-2 sm:grid-cols-3">
            {(
              [
                [Truck, 'Livré chez vous', '8 pays, d’Afrique au Canada'],
                [Banknote, 'Payé à la livraison', 'Espèces ou Mobile Money'],
                [MessageCircle, 'Confirmé sur WhatsApp', 'Une vraie personne vous répond'],
              ] as const
            ).map(([Icone, titre, texte]) => (
              <li
                key={titre}
                className="flex flex-col gap-1 rounded-[22px] bg-carte p-4 text-[13px] text-encre-3 shadow-panneau [&_svg]:mb-1 [&_svg]:size-5 [&_svg]:text-or-texte"
              >
                <Icone aria-hidden="true" />
                <span className="text-[15px] font-semibold text-encre">{titre}</span>
                {texte}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(f.utilisation.length > 0 || f.conseil) && (
        <section
          aria-labelledby="titre-utilisation"
          className="grid gap-4 pb-16 lg:grid-cols-[1.4fr_1fr]"
        >
          {f.utilisation.length > 0 && (
            <div className={cx('rounded-panneau p-6 sm:p-10', FOND_TEINTE[teinte])}>
              <h2 id="titre-utilisation" className="titre-affiche text-[34px] text-encre">
                Mode d’emploi
              </h2>
              <ol className="mt-6 flex flex-col gap-4">
                {f.utilisation.map((etape, i) => (
                  <li key={etape} className="flex gap-4 text-[15px] leading-relaxed text-encre">
                    <span className="chiffres grid size-9 shrink-0 place-items-center rounded-full bg-carte text-[15px] font-semibold shadow-panneau">
                      {i + 1}
                    </span>
                    <span className="pt-1.5">{etape}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {f.conseil && (
            <aside
              aria-label="Le conseil Glorious Destiny"
              className="flex flex-col justify-between gap-6 rounded-panneau bg-encre p-6 text-fond sm:p-10"
            >
              <span
                aria-hidden="true"
                className="grid size-11 place-items-center rounded-full bg-or text-sur-or [&_svg]:size-5"
              >
                <Sparkles />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-fond/75">Le conseil de la maison</p>
                <p className="mt-2 text-[21px] leading-snug font-semibold">{f.conseil}</p>
              </div>
            </aside>
          )}
        </section>
      )}

      <section aria-labelledby="titre-faq" className="pb-16">
        <h2 id="titre-faq" className="titre-affiche mb-6 text-[34px] text-encre">
          Vos questions
        </h2>
        <div className="flex flex-col gap-2">
          {faq.map((x) => (
            <details
              key={x.q}
              className="group rounded-[22px] bg-carte shadow-panneau open:pb-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 text-[17px] font-semibold text-encre">
                {x.q}
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-carte-2 transition-transform duration-300 group-open:rotate-45 [&_svg]:size-4"
                >
                  <Plus />
                </span>
              </summary>
              <p className="max-w-3xl px-5 text-[15px] leading-relaxed text-encre-2">{x.r}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="pb-16">
        <ContenusPublics titre={`${p.nom} en vrai`} produitId={p.id} />
      </div>

      {similaires.length > 0 && (
        <section aria-labelledby="titre-similaires" className="pb-16">
          <h2 id="titre-similaires" className="titre-affiche mb-8 text-[34px] text-encre">
            {associes.length > 0 ? 'Complétez votre rituel' : 'Dans la même gamme'}
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

      {/* Place réservée à la barre d'achat collante, pour qu'elle ne masque rien (mobile) */}
      <div aria-hidden="true" className="h-16 lg:hidden" />

      {/* Barre d'achat collante (mobile), visible quand le bouton principal est passé */}
      <div
        aria-hidden={!achatPasse}
        className={cx(
          'fixed inset-x-3 bottom-3 z-30 flex items-center gap-3 rounded-full bg-carte/95 py-2 pr-2 pl-5 shadow-flottant backdrop-blur-md transition-[opacity,translate] duration-300 ease-(--ease-sortie) lg:hidden',
          achatPasse ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-encre-3">{p.nom}</span>
          <span className="block text-[17px] font-semibold text-or-texte">{prix}</span>
        </span>
        <Bouton
          variante="or"
          icone={<ShoppingBag />}
          disabled={epuise || dispo.isPending}
          tabIndex={achatPasse ? 0 : -1}
          onClick={ajouter}
        >
          {epuise ? 'Épuisé' : 'Ajouter'}
        </Bouton>
      </div>
    </div>
  )
}
