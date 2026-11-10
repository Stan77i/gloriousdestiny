import { ArrowRight, Boxes, Inbox, Truck, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { Panneau, TuileChiffre } from '@/components/ui/Panneau'
import { aRole, type Role } from '@/domain/roles'
import { useAuth } from '@/features/auth/useAuth'
import { useCompteurs } from '@/features/commandes-admin/requetes'
import { STATUT_STOCK } from '@/features/stock-admin/libelles'
import { useStock } from '@/features/stock-admin/requetes'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'

function Lien({ vers, children }: { vers: string; children: string }) {
  return (
    <Link
      to={vers}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-or-texte no-underline hover:text-or [&_svg]:size-4"
    >
      {children}
      <ArrowRight aria-hidden="true" />
    </Link>
  )
}

function ResumeCommandes() {
  const compteurs = useCompteurs()
  if (compteurs.isError) {
    return (
      <EtatErreur
        message={versErreurApp(compteurs.error).message}
        onReessayer={() => void compteurs.refetch()}
      />
    )
  }
  if (compteurs.isPending) return <Squelette className="h-32 w-full" />
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TuileChiffre
        fond={compteurs.data.nouvelle > 0 ? 'or' : 'carte'}
        libelle="À confirmer"
        valeur={String(compteurs.data.nouvelle)}
        complement="commandes du site en attente"
        icone={<Inbox />}
      />
      <TuileChiffre
        fond="sauge"
        libelle="À expédier"
        valeur={String(compteurs.data.confirmee)}
        complement={`${String(compteurs.data.expediee)} en cours de livraison`}
        icone={<Truck />}
      />
    </div>
  )
}

function ResumeStock() {
  const stock = useStock()
  if (stock.isError) {
    return (
      <EtatErreur
        message={versErreurApp(stock.error).message}
        onReessayer={() => void stock.refetch()}
      />
    )
  }
  if (stock.isPending) return <Squelette className="h-32 w-full" />
  const alertes = stock.data
    .filter((l) => l.statut !== 'disponible')
    .sort((a, b) => a.disponible - b.disponible)
  return (
    <Panneau
      titre="Stock à surveiller"
      sousTitre={
        alertes.length === 0
          ? 'Tous les articles sont au-dessus de leur seuil.'
          : `${String(alertes.length)} article(s) sous le seuil d’alerte`
      }
      action={<Lien vers="/admin/stock">Ouvrir le stock</Lien>}
    >
      {alertes.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-encre-2 [&_svg]:size-4 [&_svg]:text-succes">
          <Boxes aria-hidden="true" />
          {stock.data.reduce((s, l) => s + l.disponible, 0)} unités disponibles à la vente.
        </p>
      ) : (
        <ul className="divide-y divide-filet">
          {alertes.slice(0, 6).map((l) => (
            <li
              key={l.varianteId}
              className="flex items-center justify-between gap-4 py-2.5 text-sm"
            >
              <span className="min-w-0 truncate">{l.produit}</span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="chiffres text-encre-2">
                  {l.disponible} / seuil {l.seuilAlerte}
                </span>
                <Badge ton={STATUT_STOCK[l.statut].ton}>{STATUT_STOCK[l.statut].libelle}</Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panneau>
  )
}

/** Aperçu : ce qui demande une action aujourd'hui, selon le rôle. Le tableau de bord complet arrive en Phase 10. */
export function PageAdminAccueil() {
  useTitreDocument('Administration')
  const auth = useAuth()
  const profil = auth.statut === 'connecte' ? auth.profil : null
  const role: Role | null = profil?.role ?? null
  const commandes = aRole(role, ['ventes', 'logistique'])
  const stock = aRole(role, ['stock'])

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold">
        {profil ? `Bonjour ${profil.nom.split(' ')[0] ?? ''}` : 'Aperçu'}
      </h1>
      {commandes && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[17px] font-semibold">Commandes</h2>
            <Lien vers="/admin/commandes">Voir la file</Lien>
          </div>
          <ResumeCommandes />
        </div>
      )}
      {stock && <ResumeStock />}
      {!commandes && !stock && (
        <Panneau titre="Bienvenue">
          <p className="flex items-center gap-2 text-sm text-encre-2 [&_svg]:size-4">
            <TriangleAlert aria-hidden="true" />
            Aucun module n’est encore ouvert à votre rôle.
          </p>
        </Panneau>
      )}
    </section>
  )
}
