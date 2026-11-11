import { Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Monogramme } from '@/components/produit/Monogramme'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Bouton, BoutonIcone } from '@/components/ui/Bouton'
import { Squelette } from '@/components/ui/Chargeur'
import { classesBouton } from '@/components/ui/classesBouton'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { EtatErreur, EtatVide } from '@/components/ui/Etats'
import { SelecteurQuantite } from '@/components/ui/SelecteurQuantite'
import { lienProduit } from '@/features/catalogue/liens'
import { useDisponibilites, useProduits } from '@/features/catalogue/requetes'
import { visuelProduit } from '@/features/catalogue/visuels'
import { QUANTITE_MAX } from '@/features/panier/panier'
import { usePanier } from '@/features/panier/usePanier'
import { BoutonWhatsApp } from '@/features/whatsapp/BoutonWhatsApp'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterFcfa } from '@/lib/format/montant'

/**
 * Panier. Prix et disponibilités relus depuis la base (jamais stockés dans le panier).
 * La commande avec enregistrement et envoi WhatsApp arrive aux Phases 5 et 6.
 */
export function PagePanier() {
  useTitreDocument('Panier')
  const panier = usePanier()
  const produits = useProduits()
  const dispo = useDisponibilites(panier.lignes.map((l) => l.varianteId))

  const index = new Map(
    (produits.data ?? []).flatMap((p) =>
      p.variantes.map((v) => [v.id, { produit: p, variante: v }] as const),
    ),
  )
  const lignes = panier.lignes.map((l) => ({ ...l, ref: index.get(l.varianteId) }))
  const sousTotal = lignes.reduce((s, l) => s + (l.ref ? l.ref.variante.prix * l.quantite : 0), 0)
  const indisponibles = lignes.filter(
    (l) => !l.ref || dispo.data?.get(l.varianteId) === 'epuise',
  ).length

  if (panier.lignes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EtatVide
          titre="Votre panier est vide"
          action={
            <Link
              to={CHEMINS.catalogue}
              className={classesBouton('principal', 'normal', 'no-underline')}
            >
              Découvrir la gamme
            </Link>
          }
        >
          Ajoutez des produits depuis le catalogue : ils resteront ici, même si vous fermez la page.
        </EtatVide>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
      <EnTetePage titre="Panier" />
      {produits.isError ? (
        <EtatErreur
          message={versErreurApp(produits.error).message}
          onReessayer={() => void produits.refetch()}
        />
      ) : (
        <div className="grid gap-10 pb-10 lg:grid-cols-[1fr_360px]">
          <ul className="divide-y divide-filet border-y border-filet">
            {lignes.map((l) => {
              const statut = dispo.data?.get(l.varianteId)
              if (!l.ref) {
                return (
                  <li key={l.varianteId} className="flex items-center justify-between gap-4 py-5">
                    {produits.isPending ? (
                      <Squelette className="h-20 w-full" />
                    ) : (
                      <>
                        <p className="text-sm text-encre-3">Cet article n’est plus proposé.</p>
                        <Bouton
                          variante="fantome"
                          taille="petit"
                          onClick={() => {
                            panier.retirer(l.varianteId)
                          }}
                        >
                          Retirer
                        </Bouton>
                      </>
                    )}
                  </li>
                )
              }
              const { produit, variante } = l.ref
              const visuel = visuelProduit(produit.slug)
              return (
                <li
                  key={l.varianteId}
                  className="grid grid-cols-[84px_1fr] gap-4 py-5 sm:grid-cols-[96px_1fr_auto]"
                >
                  <Link
                    to={lienProduit(produit)}
                    className="relative aspect-square overflow-hidden rounded-[12px] border border-filet bg-carte"
                    aria-label={produit.nom}
                  >
                    {visuel.detoure ? (
                      <img src={visuel.detoure} alt="" className="size-full object-contain p-2" />
                    ) : (
                      <Monogramme nom={produit.nom} />
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to={lienProduit(produit)}
                      className="text-[17px] font-semibold text-encre no-underline hover:text-or-texte"
                    >
                      {produit.nom}
                    </Link>
                    <p className="mt-0.5 text-[13px] text-encre-3">
                      {variante.libelle !== 'Format standard' ? `${variante.libelle} · ` : ''}
                      {formaterFcfa(variante.prix)} l’unité
                    </p>
                    <div className="mt-2">
                      {statut === 'bientot_epuise' && <Badge ton="alerte">Bientôt épuisé</Badge>}
                      {statut === 'epuise' && <Badge ton="danger">Épuisé : à retirer</Badge>}
                    </div>
                    <p className="chiffres mt-2 text-[15px] font-semibold text-encre sm:hidden">
                      {formaterFcfa(variante.prix * l.quantite)}
                    </p>
                    <div className="mt-3 flex items-center gap-2 sm:hidden">
                      <SelecteurQuantite
                        libelle={`Quantité de ${produit.nom}`}
                        valeur={l.quantite}
                        max={QUANTITE_MAX}
                        onChange={(q) => {
                          panier.modifier(l.varianteId, q)
                        }}
                      />
                      <BoutonIcone
                        libelle={`Retirer ${produit.nom}`}
                        variante="fantome"
                        onClick={() => {
                          panier.retirer(l.varianteId)
                        }}
                      >
                        <Trash2 />
                      </BoutonIcone>
                    </div>
                  </div>
                  <div className="hidden flex-col items-end justify-between gap-3 sm:flex">
                    <p className="chiffres text-[17px] font-semibold text-encre">
                      {formaterFcfa(variante.prix * l.quantite)}
                    </p>
                    <div className="flex items-center gap-2">
                      <SelecteurQuantite
                        libelle={`Quantité de ${produit.nom}`}
                        valeur={l.quantite}
                        max={QUANTITE_MAX}
                        onChange={(q) => {
                          panier.modifier(l.varianteId, q)
                        }}
                      />
                      <BoutonIcone
                        libelle={`Retirer ${produit.nom}`}
                        variante="fantome"
                        onClick={() => {
                          panier.retirer(l.varianteId)
                        }}
                      >
                        <Trash2 />
                      </BoutonIcone>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <aside
            aria-labelledby="titre-recap"
            className="flex flex-col gap-5 self-start rounded-panneau border border-filet bg-carte p-6 lg:sticky lg:top-24"
          >
            <h2 id="titre-recap" className="text-[17px] font-semibold">
              Récapitulatif
            </h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-encre-2">
                  Sous-total ({panier.nombreArticles} article{panier.nombreArticles > 1 ? 's' : ''})
                </dt>
                <dd className="chiffres font-semibold">
                  {produits.isPending ? '…' : formaterFcfa(sousTotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-encre-2">Livraison</dt>
                <dd className="text-right text-encre-3">Réglée à l’agence</dd>
              </div>
            </dl>
            <p className="text-[13px] leading-relaxed text-encre-3">
              Paiement à la livraison, en espèces ou par Mobile Money. Les frais de livraison se
              règlent directement auprès de l’agence de livraison.
            </p>
            {indisponibles > 0 && (
              <Alerte ton="alerte" titre="Certains articles ne sont plus disponibles">
                Retirez-les pour continuer.
              </Alerte>
            )}
            {indisponibles > 0 || produits.isPending ? (
              <Bouton taille="grand" disabled className="w-full">
                Commander
              </Bouton>
            ) : (
              <Link
                to={CHEMINS.commande}
                className={classesBouton('principal', 'grand', 'w-full no-underline')}
              >
                Commander
              </Link>
            )}
            <BoutonWhatsApp
              libelle="Une question ? WhatsApp"
              variante="fantome"
              className="w-full"
            />
          </aside>
        </div>
      )}
    </div>
  )
}
