import { Boxes, CircleCheck, PackageX, TriangleAlert } from 'lucide-react'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { Panneau, TuileChiffre } from '@/components/ui/Panneau'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDate, formaterDateHeure } from '@/lib/format/date'
import { signe } from './libelles'
import { useTableauStock } from './requetes'

function Liste({
  vide,
  lignes,
}: {
  vide: string
  lignes: { cle: string; titre: string; detail: string; valeur: string; onClic?: () => void }[]
}) {
  if (lignes.length === 0) return <p className="text-sm text-encre-3">{vide}</p>
  return (
    <ul className="flex flex-col divide-y divide-filet">
      {lignes.map((l) => (
        <li key={l.cle}>
          <button
            type="button"
            onClick={l.onClic}
            disabled={!l.onClic}
            className="flex w-full items-start justify-between gap-3 py-2.5 text-left enabled:hover:text-or-texte"
          >
            <span className="min-w-0">
              <span className="block text-[14px] font-medium">{l.titre}</span>
              <span className="block text-[12px] text-encre-3">{l.detail}</span>
            </span>
            <span className="chiffres shrink-0 text-[14px] font-semibold">{l.valeur}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Tableau de bord du stock : tout est calculé par le serveur (tableau_stock), relu toutes les 30 s. */
export function VueTableauStock({
  ouvrirArticle,
}: {
  ouvrirArticle: (varianteId: string) => void
}) {
  const t = useTableauStock()
  if (t.isError)
    return (
      <EtatErreur message={versErreurApp(t.error).message} onReessayer={() => void t.refetch()} />
    )
  if (t.isPending)
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Squelette key={i} className="h-28 w-full" />
        ))}
      </div>
    )
  const d = t.data
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <TuileChiffre
          libelle="Articles"
          valeur={String(d.articles)}
          complement="formats suivis"
          icone={<Boxes />}
        />
        <TuileChiffre
          fond="menthe"
          libelle="Disponibles"
          valeur={String(d.disponibles)}
          complement="au-dessus du seuil"
          icone={<CircleCheck />}
        />
        <TuileChiffre
          fond={d.stockFaible > 0 ? 'sable' : 'carte'}
          libelle="Stock faible"
          valeur={String(d.stockFaible)}
          complement="au seuil ou dessous"
          icone={<TriangleAlert />}
        />
        <TuileChiffre
          fond={d.ruptures > 0 ? 'rose' : 'carte'}
          libelle="En rupture"
          valeur={String(d.ruptures)}
          complement="plus vendables"
          icone={<PackageX />}
        />
        <TuileChiffre
          libelle="Unités en rayon"
          valeur={String(d.physiqueTotal)}
          complement="stock physique"
        />
        <TuileChiffre
          fond="or"
          libelle="Unités réservées"
          valeur={String(d.reserveTotal)}
          complement="commandes en cours"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panneau titre="Dernières entrées" sousTitre="Réceptions et stocks initiaux">
          <Liste
            vide="Aucune entrée de marchandises pour le moment."
            lignes={d.dernieresEntrees.map((e) => ({
              cle: String(e.id),
              titre: e.article,
              detail: `${formaterDateHeure(e.created_at)} · ${e.auteur ?? 'Système'}`,
              valeur: `${signe(e.quantite)} → ${String(e.physique_apres ?? '—')}`,
            }))}
          />
        </Panneau>
        <Panneau titre="Dernières corrections" sousTitre="Ajustements, comptages et pertes">
          <Liste
            vide="Aucune correction pour le moment."
            lignes={d.dernieresCorrections.map((e) => ({
              cle: String(e.id),
              titre: e.article,
              detail: `${formaterDateHeure(e.created_at)} · ${e.auteur ?? 'Système'}${e.motif ? ` · ${e.motif}` : ''}`,
              valeur: `${String(e.physique_avant ?? '—')} → ${String(e.physique_apres ?? '—')}`,
            }))}
          />
        </Panneau>
        <Panneau titre="Les plus vendus" sousTitre="Sur 30 jours, retours déduits">
          <Liste
            vide="Pas encore de vente expédiée sur les 30 derniers jours."
            lignes={d.plusVendus.map((v) => ({
              cle: v.variante_id,
              titre: v.article,
              detail: 'unités vendues',
              valeur: String(v.quantite),
              onClic: () => {
                ouvrirArticle(v.variante_id)
              },
            }))}
          />
        </Panneau>
        <Panneau titre="Ne bougent pas" sousTitre="En stock, sans vente depuis 60 jours">
          <Liste
            vide="Aucun article immobile depuis 60 jours."
            lignes={d.dormants.map((v) => ({
              cle: v.variante_id,
              titre: v.article,
              detail: v.derniere_vente
                ? `dernière vente le ${formaterDate(v.derniere_vente)}`
                : 'jamais vendu',
              valeur: `${String(v.physique)} en rayon`,
              onClic: () => {
                ouvrirArticle(v.variante_id)
              },
            }))}
          />
        </Panneau>
      </div>
    </div>
  )
}
