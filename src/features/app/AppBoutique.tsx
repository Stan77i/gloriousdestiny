import { useState } from 'react'
import { Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { useDisponibilites, useProduits } from '@/features/catalogue/requetes'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { statutProduit } from './catalogueApp'
import { Pilule } from './elements'
import { classesCta } from './classes'
import { useFavoris } from './favoris'
import { CarteApp } from './produits'

const FILTRES = [
  { valeur: null, libelle: 'Tout' },
  { valeur: 'pose-de-perruque', libelle: 'Pose de perruque' },
  { valeur: 'coiffage', libelle: 'Coiffage' },
  { valeur: 'cils', libelle: 'Cils' },
  { valeur: 'coffret', libelle: 'Coffret' },
  { valeur: 'perruques', libelle: 'Perruques' },
] as const

type Filtre = (typeof FILTRES)[number]['valeur'] | 'favoris'

const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Boutique de l'application : en-tête sauge avec recherche en direct (nom et catégorie),
 * filtres en pilules, grille de deux colonnes.
 */
export function AppBoutique({ filtreInitial = null }: { filtreInitial?: Filtre }) {
  useTitreDocument('Boutique')
  const [params] = useSearchParams()
  const [filtre, setFiltre] = useState<Filtre>(
    () => (params.get('categorie') as Filtre | null) ?? filtreInitial,
  )
  const [recherche, setRecherche] = useState('')
  const produits = useProduits()
  const favoris = useFavoris()
  const dispo = useDisponibilites(
    (produits.data ?? []).flatMap((p) => p.variantes.map((v) => v.id)),
  )

  const q = sansAccents(recherche.trim())
  const liste = (produits.data ?? []).filter((p) => {
    if (filtre === 'favoris' && !favoris.includes(p.id)) return false
    if (filtre && filtre !== 'favoris' && p.categorie.slug !== filtre) return false
    return !q || sansAccents(`${p.nom} ${p.categorie.nom}`).includes(q)
  })
  const perruquesDispo =
    filtre === 'perruques' &&
    dispo.data !== undefined &&
    liste.some((p) => statutProduit(p, dispo.data) !== 'epuise')

  return (
    <div className="pt-1">
      <header className="rounded-[28px] bg-sauge p-5">
        <h1 className="text-[34px] leading-none font-semibold tracking-[-0.035em] text-encre">
          La boutique
        </h1>
        <p className="mt-1.5 text-[14px] text-encre-2">
          {produits.data ? `${String(produits.data.length)} articles · ` : ''}paiement à la
          livraison
        </p>
        <label className="mt-4 flex min-h-12 items-center gap-2.5 rounded-full bg-carte px-4 shadow-panneau focus-within:ring-2 focus-within:ring-or/60">
          <Search aria-hidden="true" className="size-[18px] text-encre-3" />
          <span className="sr-only">Rechercher</span>
          <input
            type="search"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value)
            }}
            placeholder="Lace Glue, cils, wax…"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-encre outline-none placeholder:text-encre-3"
          />
        </label>
      </header>

      <div className="-mx-4 mt-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1">
        {FILTRES.map((f) => (
          <Pilule
            key={f.libelle}
            actif={filtre === f.valeur}
            onClick={() => {
              setFiltre(f.valeur)
            }}
          >
            {f.libelle}
          </Pilule>
        ))}
        {favoris.length > 0 && (
          <Pilule
            actif={filtre === 'favoris'}
            onClick={() => {
              setFiltre(filtre === 'favoris' ? null : 'favoris')
            }}
          >
            ♥ Favoris
          </Pilule>
        )}
      </div>

      {filtre === 'perruques' && !perruquesDispo && dispo.data !== undefined && (
        <section className="mt-4 rounded-[28px] bg-rose p-5">
          <p className="text-[13px] font-semibold text-encre-2">Rupture de stock</p>
          <h2 className="mt-1 text-[21px] font-semibold tracking-[-0.02em] text-encre">
            Les perruques reviennent bientôt.
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-encre-2">
            Laissez votre numéro : vous serez prévenue sur WhatsApp dès leur retour.
          </p>
          <Link to={CHEMINS.perruques} className={`${classesCta('encre')} mt-4 min-h-12`}>
            Me prévenir sur WhatsApp
          </Link>
        </section>
      )}

      {produits.isError ? (
        <div className="mt-6">
          <EtatErreur
            message={versErreurApp(produits.error).message}
            onReessayer={() => void produits.refetch()}
          />
        </div>
      ) : produits.isPending ? (
        <ul className="mt-4 grid grid-cols-2 gap-2.5" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="rounded-[28px] bg-carte p-2">
              <Squelette className="h-[150px] w-full rounded-[22px]" />
              <Squelette className="mt-3 h-4 w-3/4" />
              <Squelette className="mt-2 h-4 w-1/2" />
            </li>
          ))}
        </ul>
      ) : liste.length === 0 ? (
        <p className="mt-10 text-center text-[15px] text-encre-3">
          {q ? `Aucun article pour « ${recherche.trim()} ».` : 'Aucun article ici pour le moment.'}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2.5">
          {liste.map((p) => (
            <li key={p.id}>
              <CarteApp produit={p} statut={statutProduit(p, dispo.data)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
