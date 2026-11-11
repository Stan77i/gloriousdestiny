import { useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Banknote,
  Boxes,
  Inbox,
  ReceiptText,
  ShoppingBag,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router'
import { Alerte } from '@/components/ui/Alerte'
import { Badge } from '@/components/ui/Badge'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { NavPilules } from '@/components/ui/Navigation'
import { Panneau, TuileChiffre } from '@/components/ui/Panneau'
import { STATUT_COMMANDE } from '@/domain/libelles'
import { aRole, type Role } from '@/domain/roles'
import { useAuth } from '@/features/auth/useAuth'
import { useCompteurs } from '@/features/commandes-admin/requetes'
import { STATUT_STOCK } from '@/features/stock-admin/libelles'
import { useStock } from '@/features/stock-admin/requetes'
import { GraphiqueVentes } from '@/features/tableau-de-bord/GraphiqueVentes'
import {
  bornesPeriode,
  PERIODES,
  variation,
  type IdPeriode,
  type Periode,
} from '@/features/tableau-de-bord/periodes'
import { useTableauDeBord } from '@/features/tableau-de-bord/requetes'
import { useMaintenant } from '@/hooks/useMaintenant'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDateHeure, formaterJour, jourSalon } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import type { StatutCommande } from '@/services/commandes.service'
import type { TableauDeBord } from '@/services/tableauDeBord.service'

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

/** Barres horizontales : une seule série, la plus grande valeur fait toute la largeur. */
function Barres({
  lignes,
  vide,
}: {
  lignes: { cle: string; libelle: string; valeur: number; texte: string; detail?: string }[]
  vide: string
}) {
  const max = Math.max(0, ...lignes.map((l) => l.valeur))
  if (max === 0) return <p className="text-sm text-encre-3">{vide}</p>
  return (
    <ul className="flex flex-col gap-3.5">
      {lignes.map((l) => (
        <li key={l.cle} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{l.libelle}</span>
            <span className="chiffres shrink-0 text-encre-2">
              {l.texte}
              {l.detail && <span className="text-encre-3"> · {l.detail}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-carte-2">
            <div
              className="h-full rounded-full bg-or"
              style={{ width: l.valeur > 0 ? `max(${String((l.valeur / max) * 100)}%, 4px)` : 0 }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Ligne({ libelle, valeur, aide }: { libelle: string; valeur: ReactNode; aide?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
      <dt className="text-encre-2">
        {libelle}
        {aide && <span className="block text-[12px] text-encre-3">{aide}</span>}
      </dt>
      <dd className="chiffres shrink-0 font-semibold">{valeur}</dd>
    </div>
  )
}

function Tuiles({ t, periode }: { t: TableauDeBord; periode: Periode }) {
  const v = t.ventes
  const varCa = variation(v.ca_fcfa, v.ca_precedent_fcfa)
  const varNb = variation(v.nombre, v.nombre_precedent)
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <TuileChiffre
        fond="or"
        libelle="Chiffre d’affaires net"
        valeur={formaterFcfa(v.ca_fcfa)}
        icone={<ShoppingBag />}
        {...(varCa
          ? {
              variation: {
                ...varCa,
                favorable: varCa.sens === 'hausse',
                periode: periode.comparaison,
              },
            }
          : { complement: `${formaterFcfa(v.ca_precedent_fcfa)} la période d’avant` })}
      />
      <TuileChiffre
        libelle="Ventes"
        valeur={String(v.nombre)}
        icone={<ReceiptText />}
        {...(varNb
          ? {
              variation: {
                ...varNb,
                favorable: varNb.sens === 'hausse',
                periode: periode.comparaison,
              },
            }
          : { complement: `${String(v.nombre_precedent)} la période d’avant` })}
      />
      <TuileChiffre
        libelle="Panier moyen"
        valeur={v.panier_moyen_fcfa === null ? '—' : formaterFcfa(v.panier_moyen_fcfa)}
        complement="par vente"
        icone={<Banknote />}
      />
      <TuileChiffre
        fond="menthe"
        libelle="Encaissé"
        valeur={formaterFcfa(v.encaisse_fcfa)}
        complement={`${formaterFcfa(v.a_encaisser_fcfa)} restent à encaisser`}
        icone={<Banknote />}
      />
    </div>
  )
}

function Alertes({ t, maintenant }: { t: TableauDeBord; maintenant: number }) {
  const a = t.alertes
  if (a.commandes_en_attente.length === 0 && a.expirations_proches === 0) return null
  return (
    <Alerte
      ton="alerte"
      titre={
        a.commandes_en_attente.length > 0
          ? `${String(a.commandes_en_attente.length)} commande(s) attendent une confirmation depuis plus de ${String(a.seuil_heures)} h`
          : `${String(a.expirations_proches)} réservation(s) de stock expirent dans moins de 6 h`
      }
    >
      <ul className="mt-1 flex flex-col gap-1">
        {a.commandes_en_attente.slice(0, 5).map((c) => {
          const heures = Math.floor((maintenant - new Date(c.created_at).getTime()) / 3_600_000)
          return (
            <li key={c.id}>
              <Link to={`/admin/commandes/${c.id}`} className="chiffres font-semibold">
                {c.reference}
              </Link>{' '}
              · {c.cliente} · reçue il y a {heures} h
              {c.reservation_expire_at &&
                ` · le stock se libère le ${formaterDateHeure(c.reservation_expire_at)}`}
            </li>
          )
        })}
      </ul>
      {a.commandes_en_attente.length > 0 && a.expirations_proches > 0 && (
        <p className="mt-1">
          Dont {a.expirations_proches} dont la réservation de stock expire dans moins de 6 h.
        </p>
      )}
    </Alerte>
  )
}

function Produits({ t }: { t: TableauDeBord }) {
  const vendus = t.produits.filter((p) => p.quantite > 0)
  const top = vendus.slice(0, 5)
  // Les moins vendus : parmi les articles qui ne sont pas déjà dans le haut du classement.
  const moins = t.produits
    .filter((p) => !top.includes(p))
    .sort((a, b) => a.quantite - b.quantite || a.ca_fcfa - b.ca_fcfa)
  const nom = (p: TableauDeBord['produits'][number]) =>
    p.variante === 'Format standard' ? p.produit : `${p.produit} · ${p.variante}`
  return (
    <Panneau titre="Produits" sousTitre="Quantités vendues nettes des retours">
      <div className="flex flex-col gap-6">
        <Barres
          vide="Aucune vente sur la période."
          lignes={top.map((p) => ({
            cle: p.variante_id,
            libelle: nom(p),
            valeur: p.quantite,
            texte: `${String(p.quantite)} vendu(s)`,
            detail: formaterFcfa(p.ca_fcfa),
          }))}
        />
        {moins.length > 0 && (
          <div>
            <h4 className="text-[13px] font-semibold text-encre-2">Les moins vendus</h4>
            <ul className="mt-2 divide-y divide-filet">
              {moins.slice(0, 3).map((p) => (
                <li key={p.variante_id} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{nom(p)}</span>
                  <span className="chiffres shrink-0 text-encre-3">
                    {p.quantite === 0 ? 'aucune vente' : `${String(p.quantite)} vendu(s)`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panneau>
  )
}

function Clientes({ t }: { t: TableauDeBord }) {
  const c = t.clientes
  return (
    <Panneau
      titre="Clientes"
      sousTitre={`${String(c.actives)} cliente(s) ont acheté sur la période`}
      action={<Lien vers="/admin/clientes">Toutes</Lien>}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-bloc bg-rose p-4">
          <p className="text-[13px] font-medium">Nouvelles</p>
          <p className="chiffres mt-1 text-[32px] leading-none font-semibold">{c.nouvelles}</p>
          <p className="mt-1 text-[12px] opacity-80">premier achat</p>
        </div>
        <div className="rounded-bloc bg-lilas p-4">
          <p className="text-[13px] font-medium">Fidèles</p>
          <p className="chiffres mt-1 text-[32px] leading-none font-semibold">{c.recurrentes}</p>
          <p className="mt-1 text-[12px] opacity-80">2 achats ou plus</p>
        </div>
      </div>
      {c.meilleures.length > 0 && (
        <>
          <h4 className="mt-5 text-[13px] font-semibold text-encre-2">Meilleures clientes</h4>
          <ol className="mt-1 divide-y divide-filet">
            {c.meilleures.map((m) => (
              <li key={m.id} className="flex justify-between gap-3 py-2 text-sm">
                <Link to={`/admin/clientes/${m.id}`} className="min-w-0 truncate no-underline">
                  {m.nom}
                </Link>
                <span className="chiffres shrink-0 text-encre-2">
                  {formaterFcfa(m.ca_fcfa)}
                  <span className="text-encre-3"> · {m.nombre} achat(s)</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Panneau>
  )
}

function Activite({ t }: { t: TableauDeBord }) {
  const statuts = Object.entries(t.commandes_par_statut) as [StatutCommande, number][]
  const r = t.rendez_vous
  return (
    <>
      <Panneau
        titre="Commandes à traiter"
        sousTitre="État actuel"
        action={<Lien vers="/admin/commandes">La file</Lien>}
      >
        <dl className="divide-y divide-filet">
          <Ligne libelle="Expédiées, à livrer" valeur={t.alertes.en_cours_de_livraison} />
          <Ligne libelle="Confirmées, à remettre à l’agence" valeur={t.alertes.a_expedier} />
        </dl>
        {statuts.length > 0 && (
          <>
            <h4 className="mt-4 text-[13px] font-semibold text-encre-2">
              Reçues sur la période ({statuts.reduce((s, [, n]) => s + n, 0)})
            </h4>
            <ul className="mt-2 flex flex-wrap gap-2">
              {statuts.map(([statut, n]) => (
                <li key={statut}>
                  <Badge ton={STATUT_COMMANDE[statut].ton}>
                    {STATUT_COMMANDE[statut].libelle} · {n}
                  </Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panneau>
      <Panneau
        titre="Rendez-vous"
        action={<Lien vers="/admin/rendez-vous">L’agenda</Lien>}
        className="bg-sable"
      >
        <dl className="divide-y divide-filet">
          <Ligne libelle="Aujourd’hui" valeur={r.aujourdhui} />
          <Ligne libelle="7 prochains jours" valeur={r.sept_jours} />
          <Ligne
            libelle="À confirmer"
            valeur={r.a_confirmer > 0 ? <Badge ton="alerte">{r.a_confirmer}</Badge> : 0}
          />
          <Ligne
            libelle="Prestations faites sur la période"
            aide={`${String(r.periode_absentes)} absence(s)`}
            valeur={`${String(r.periode_termines)} · ${formaterFcfa(r.periode_ca_fcfa)}`}
          />
        </dl>
      </Panneau>
    </>
  )
}

function Stock({ t }: { t: TableauDeBord }) {
  const s = t.stock
  return (
    <Panneau
      titre="Stock"
      sousTitre="État actuel"
      action={<Lien vers="/admin/stock">Le stock</Lien>}
    >
      <dl className="divide-y divide-filet">
        <Ligne
          libelle="Épuisés"
          valeur={s.epuises > 0 ? <Badge ton="danger">{s.epuises}</Badge> : 0}
        />
        <Ligne
          libelle="Bientôt épuisés"
          aide="sous le seuil d’alerte"
          valeur={s.bientot_epuises > 0 ? <Badge ton="alerte">{s.bientot_epuises}</Badge> : 0}
        />
        <Ligne libelle="Unités disponibles" valeur={s.unites_disponibles} />
        <Ligne
          libelle="Valeur du stock disponible"
          aide={
            s.articles_sans_cout > 0
              ? `${String(s.articles_sans_cout)} article(s) sans coût d’achat saisi, non comptés`
              : 'au dernier coût d’achat connu'
          }
          valeur={s.valeur_fcfa === null ? '—' : formaterFcfa(s.valeur_fcfa)}
        />
      </dl>
    </Panneau>
  )
}

function Definitions() {
  return (
    <details className="rounded-panneau bg-carte p-5 text-sm shadow-panneau sm:p-6">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold">
        Comment ces chiffres sont calculés
      </summary>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 leading-relaxed text-encre-2">
        <li>
          <strong className="text-encre">Vente</strong> : une commande que l’équipe a confirmée et
          qui n’a pas été annulée ensuite. Elle compte le jour de sa confirmation, à l’heure de
          Douala.
        </li>
        <li>
          <strong className="text-encre">Chiffre d’affaires net</strong> : la somme des articles
          vendus, moins les articles retournés. Les frais de livraison n’en font pas partie : la
          cliente les règle à l’agence.
        </li>
        <li>
          <strong className="text-encre">Encaissé</strong> : les paiements enregistrés dans la fiche
          commande, le jour de l’encaissement. « Restent à encaisser » : commandes confirmées pas
          encore payées, toutes dates confondues.
        </li>
        <li>
          <strong className="text-encre">Comparaison</strong> : la même durée, juste avant la
          période choisie.
        </li>
        <li>
          <strong className="text-encre">Nouvelle cliente</strong> : son tout premier achat tombe
          dans la période. <strong className="text-encre">Fidèle</strong> : a acheté dans la période
          et compte au moins deux achats au total.
        </li>
        <li>
          <strong className="text-encre">Valeur du stock</strong> : unités disponibles × dernier
          coût d’achat saisi à la réception. Les articles sans coût ne sont pas comptés.
        </li>
      </ul>
    </details>
  )
}

function TableauComplet({ prenom }: { prenom: string }) {
  const [idPeriode, setIdPeriode] = useState<IdPeriode>('30j')
  const maintenant = useMaintenant()
  const periode = bornesPeriode(idPeriode, jourSalon(new Date(maintenant)))
  const tableau = useTableauDeBord(periode.du, periode.au)

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold">{prenom ? `Bonjour ${prenom}` : 'Aperçu'}</h1>
          <p className="text-sm text-encre-3">
            {periode.du === periode.au
              ? formaterJour(periode.du)
              : `Du ${formaterJour(periode.du, 'court')} au ${formaterJour(periode.au, 'court')}`}
          </p>
        </div>
        <NavPilules
          libelle="Période"
          elements={PERIODES.map((p) => ({ id: p.id, libelle: p.libelle }))}
          actif={idPeriode}
          onChoisir={(id) => {
            setIdPeriode(id as IdPeriode)
          }}
        />
      </div>

      {tableau.isError ? (
        <EtatErreur
          message={versErreurApp(tableau.error).message}
          onReessayer={() => void tableau.refetch()}
        />
      ) : tableau.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Squelette key={i} className="h-36 w-full" />
          ))}
          <Squelette className="h-64 w-full sm:col-span-2 xl:col-span-4" />
        </div>
      ) : (
        <div
          className={`flex flex-col gap-6 transition-opacity ${tableau.isPlaceholderData ? 'opacity-60' : ''}`}
          aria-busy={tableau.isPlaceholderData}
        >
          <Alertes t={tableau.data} maintenant={maintenant} />
          <Tuiles t={tableau.data} periode={periode} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Panneau
              titre="Chiffre d’affaires par jour"
              sousTitre="Ventes confirmées, nettes des retours"
            >
              {tableau.data.serie.length > 1 ? (
                <GraphiqueVentes serie={tableau.data.serie} />
              ) : (
                <p className="text-sm text-encre-2">
                  {tableau.data.ventes.nombre} vente(s) aujourd’hui pour{' '}
                  {formaterFcfa(tableau.data.ventes.ca_fcfa)}. Choisissez une période plus longue
                  pour voir l’évolution.
                </p>
              )}
            </Panneau>
            <Panneau titre="Ventes par ville" sousTitre="Chiffre d’affaires net">
              <Barres
                vide="Aucune vente sur la période."
                lignes={tableau.data.par_ville.map((v) => ({
                  cle: v.ville,
                  libelle: v.ville,
                  valeur: v.ca_fcfa,
                  texte: formaterFcfa(v.ca_fcfa),
                  detail: `${String(v.nombre)} vente(s)`,
                }))}
              />
            </Panneau>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Produits t={tableau.data} />
            <Clientes t={tableau.data} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Activite t={tableau.data} />
            <Stock t={tableau.data} />
          </div>
          <Definitions />
        </div>
      )}
    </section>
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
        fond={compteurs.data.confirmee > 0 ? 'or' : 'carte'}
        libelle="À remettre à l’agence"
        valeur={String(compteurs.data.confirmee)}
        complement="commandes confirmées"
        icone={<Inbox />}
      />
      <TuileChiffre
        fond="sauge"
        libelle="Expédiées"
        valeur={String(compteurs.data.expediee)}
        complement="à marquer livrées"
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

/**
 * Accueil de l'administration. Ventes, admin et propriétaire : le tableau de bord complet.
 * Logistique et stock : ce qui demande une action dans leur module.
 */
export function PageAdminAccueil() {
  useTitreDocument('Administration')
  const auth = useAuth()
  const profil = auth.statut === 'connecte' ? auth.profil : null
  const role: Role | null = profil?.role ?? null
  const prenom = profil?.nom.split(' ')[0] ?? ''

  if (aRole(role, ['ventes'])) return <TableauComplet prenom={prenom} />

  const logistique = aRole(role, ['logistique'])
  const stock = aRole(role, ['stock'])
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold">{prenom ? `Bonjour ${prenom}` : 'Aperçu'}</h1>
      {logistique && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[17px] font-semibold">Commandes</h2>
            <Lien vers="/admin/commandes">Voir la file</Lien>
          </div>
          <ResumeCommandes />
        </div>
      )}
      {stock && <ResumeStock />}
      {!logistique && !stock && (
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
