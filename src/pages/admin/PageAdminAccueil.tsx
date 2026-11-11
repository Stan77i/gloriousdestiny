import { useState, type ReactNode } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChartLine,
  CircleCheck,
  Clock,
  Inbox,
  Plus,
  Truck,
  TriangleAlert,
} from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { NavPilules } from '@/components/ui/Navigation'
import { Panneau, TuileChiffre } from '@/components/ui/Panneau'
import { classesBouton } from '@/components/ui/classesBouton'
import { STATUT_RDV } from '@/domain/libelles'
import { aRole, type Role } from '@/domain/roles'
import { useAuth } from '@/features/auth/useAuth'
import { useCompteurs } from '@/features/commandes-admin/requetes'
import { STATUT_STOCK } from '@/features/stock-admin/libelles'
import { useStock } from '@/features/stock-admin/requetes'
import { Anneau } from '@/features/tableau-de-bord/Anneau'
import { BarresEtat, LegendeEtat } from '@/features/tableau-de-bord/BarresEtat'
import { GraphiquePouls } from '@/features/tableau-de-bord/GraphiquePouls'
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
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterHeure, formaterJour, initiale, jourSalon } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import type { TableauDeBord } from '@/services/tableauDeBord.service'

function Lien({ vers, children }: { vers: string; children: string }) {
  return (
    <Link
      to={vers}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-or-texte no-underline hover:text-or [&_svg]:size-4"
    >
      {children}
      <ArrowRight aria-hidden="true" />
    </Link>
  )
}

/** Carte du tableau de bord : surface claire, grands rayons, en-tête titre + sous-titre + action. */
function Carte({
  titre,
  sousTitre,
  action,
  children,
  className,
}: {
  titre: string
  sousTitre?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('rounded-[26px] bg-carte p-5 shadow-panneau sm:p-6', className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold">{titre}</h2>
          {sousTitre && <p className="mt-0.5 text-[13px] text-encre-3">{sousTitre}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

function pluriel(n: number, un: string, plusieurs: string) {
  return `${String(n)} ${n > 1 ? plusieurs : un}`
}

/** Le lingot : chiffre d'affaires de la période, encaissé et reste à encaisser. */
function CarteChiffreAffaires({ t, periode }: { t: TableauDeBord; periode: Periode }) {
  const v = t.ventes
  const varCa = variation(v.ca_fcfa, v.ca_precedent_fcfa)
  const attente = t.alertes.commandes_en_attente.length
  return (
    <section className="degrade-or relative overflow-hidden rounded-[26px] p-5 text-sur-or shadow-or sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold [&_svg]:size-4">
          <ChartLine aria-hidden="true" />
          Chiffre d’affaires net
        </p>
        <Link
          to="/admin/analyse"
          aria-label="Ouvrir l’analyse"
          className="grid size-9 place-items-center rounded-full bg-sur-or/10 text-sur-or hover:bg-sur-or/20 [&_svg]:size-4"
        >
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
      <p className="chiffres mt-4 text-[clamp(34px,4vw,44px)] leading-none font-semibold tracking-[-0.035em]">
        {formaterFcfa(v.ca_fcfa)}
      </p>
      <p className="mt-2 text-[13px] font-medium opacity-80">
        {pluriel(v.nombre, 'vente', 'ventes')}
        {v.panier_moyen_fcfa !== null && ` · panier moyen ${formaterFcfa(v.panier_moyen_fcfa)}`}
        {varCa && ` · ${varCa.valeur} ${periode.comparaison}`}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-[16px] bg-white/30 px-3.5 py-3 backdrop-blur-sm">
          <p className="text-[12px] font-medium opacity-80">Encaissé</p>
          <p className="chiffres mt-0.5 font-semibold">{formaterFcfa(v.encaisse_fcfa)}</p>
        </div>
        <div className="rounded-[16px] bg-white/30 px-3.5 py-3 backdrop-blur-sm">
          <p className="text-[12px] font-medium opacity-80">Reste à encaisser</p>
          <p className="chiffres mt-0.5 font-semibold">{formaterFcfa(v.a_encaisser_fcfa)}</p>
        </div>
      </div>
      {attente > 0 && (
        <Link
          to="/admin/commandes"
          className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-full bg-encre px-3.5 text-[13px] font-semibold text-fond no-underline [&_svg]:size-3.5"
        >
          <TriangleAlert aria-hidden="true" />
          {pluriel(attente, 'commande attend', 'commandes attendent')} depuis plus de{' '}
          {t.alertes.seuil_heures} h
        </Link>
      )}
    </section>
  )
}

function OuEnEst({ t }: { t: TableauDeBord }) {
  const s = t.commandes_par_statut
  const n = (k: string) => s[k] ?? 0
  const recues = Object.values(s).reduce((a, b) => a + b, 0) - n('annulee')
  const r = t.rendez_vous
  const rdv = r.periode_termines + r.periode_confirmes + r.periode_demandes
  const st = t.stock
  const enStock = st.articles - st.epuises - st.bientot_epuises
  return (
    <Carte
      titre="Où en est la boutique"
      sousTitre="Commandes et rendez-vous de la période, stock d’aujourd’hui"
      action={<LegendeEtat libelles={{ fait: 'Réglé', cours: 'En cours', attente: 'À traiter' }} />}
    >
      <BarresEtat
        lignes={[
          {
            cle: 'commandes',
            libelle: 'Commandes',
            icone: <Inbox />,
            total: recues,
            detail: `${String(n('livree') + n('retournee'))} livrée(s)`,
            vers: '/admin/commandes',
            segments: [
              { ton: 'fait', valeur: n('livree') + n('retournee'), libelle: 'livrées' },
              { ton: 'cours', valeur: n('confirmee') + n('expediee'), libelle: 'en cours' },
              { ton: 'attente', valeur: n('nouvelle'), libelle: 'à confirmer' },
            ],
          },
          {
            cle: 'rdv',
            libelle: 'Rendez-vous',
            icone: <CalendarDays />,
            total: rdv,
            detail: `${String(r.periode_termines)} fait(s)`,
            vers: '/admin/rendez-vous',
            segments: [
              { ton: 'fait', valeur: r.periode_termines, libelle: 'faits' },
              { ton: 'cours', valeur: r.periode_confirmes, libelle: 'confirmés' },
              { ton: 'attente', valeur: r.periode_demandes, libelle: 'à confirmer' },
            ],
          },
          {
            cle: 'stock',
            libelle: 'Stock',
            icone: <Boxes />,
            total: st.articles,
            detail: `${String(st.unites_disponibles)} unités`,
            vers: '/admin/stock',
            segments: [
              { ton: 'fait', valeur: enStock, libelle: 'bien approvisionnés' },
              { ton: 'cours', valeur: st.bientot_epuises, libelle: 'sous le seuil' },
              { ton: 'attente', valeur: st.epuises, libelle: 'épuisés' },
            ],
          },
        ]}
      />
    </Carte>
  )
}

const VUES_POULS = [
  { id: 'jours', libelle: '7 jours' },
  { id: 'semaines', libelle: '8 semaines' },
  { id: 'mois', libelle: '6 mois' },
] as const
type VuePouls = (typeof VUES_POULS)[number]['id']

function Pouls({ t }: { t: TableauDeBord }) {
  const [vue, setVue] = useState<VuePouls>('jours')
  const points = t.pouls[vue]
  const total = points.reduce((s, p) => s + p.ca_fcfa, 0)
  const ventes = points.reduce((s, p) => s + p.nombre, 0)
  const mois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' })
  const moisLong = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const court = (j: string) => formaterJour(j, 'court').split(' ').slice(1).join(' ')
  const etiquette =
    vue === 'jours'
      ? (j: string) => initiale(formaterJour(j, 'court').split(' ').slice(0, 2).join(' '))
      : vue === 'semaines'
        ? court
        : (j: string) => initiale(mois.format(new Date(`${j}T12:00:00Z`)))
  const etiquetteLongue =
    vue === 'jours'
      ? (j: string) => initiale(formaterJour(j))
      : vue === 'semaines'
        ? (j: string) => `Semaine du ${court(j)}`
        : (j: string) => initiale(moisLong.format(new Date(`${j}T12:00:00Z`)))
  return (
    <Carte
      titre="Pouls des ventes"
      sousTitre="Chiffre d’affaires net, la période en cours en or"
      action={
        <NavPilules
          libelle="Échelle du graphique"
          elements={VUES_POULS.map((v) => ({ id: v.id, libelle: v.libelle }))}
          actif={vue}
          onChoisir={(id) => {
            setVue(id as VuePouls)
          }}
        />
      }
    >
      <p className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <span className="chiffres text-[30px] font-semibold tracking-[-0.03em]">
          {formaterFcfa(total)}
        </span>
        <span className="text-[13px] text-encre-3">
          {pluriel(ventes, 'vente', 'ventes')} sur {VUES_POULS.find((v) => v.id === vue)?.libelle}
        </span>
      </p>
      <GraphiquePouls points={points} etiquette={etiquette} etiquetteLongue={etiquetteLongue} />
    </Carte>
  )
}

function StatutCommandes({ t }: { t: TableauDeBord }) {
  const s = t.commandes_par_statut
  const n = (k: string) => s[k] ?? 0
  const livrees = n('livree') + n('retournee')
  const cours = n('confirmee') + n('expediee')
  const attente = n('nouvelle')
  const total = livrees + cours + attente
  return (
    <Carte
      titre="Statut des commandes"
      sousTitre={`${pluriel(total, 'commande reçue', 'commandes reçues')} sur la période${n('annulee') > 0 ? ` (et ${String(n('annulee'))} annulée(s))` : ''}`}
      action={<Lien vers="/admin/commandes">La file</Lien>}
    >
      <Anneau
        libelle={`${String(livrees)} livrées, ${String(cours)} en cours, ${String(attente)} à confirmer`}
        centre={total > 0 ? `${String(Math.round((livrees / total) * 100))} %` : '—'}
        sousCentre="livrées"
        parts={[
          {
            cle: 'attente',
            libelle: 'À confirmer',
            valeur: attente,
            couleur: 'var(--color-carte-3)',
            pastille: 'bg-carte-3',
          },
          {
            cle: 'cours',
            libelle: 'En cours',
            valeur: cours,
            couleur: 'var(--color-or)',
            pastille: 'bg-or',
          },
          {
            cle: 'livrees',
            libelle: 'Livrées',
            valeur: livrees,
            couleur: 'var(--color-encre)',
            pastille: 'bg-encre',
          },
        ]}
      />
    </Carte>
  )
}

function ATraiter({ t, maintenant }: { t: TableauDeBord; maintenant: number }) {
  const a = t.alertes
  const lignes: { cle: string; titre: string; detail: string; vers: string; badge: ReactNode }[] = [
    ...a.commandes_en_attente.slice(0, 4).map((c) => {
      const heures = Math.floor((maintenant - new Date(c.created_at).getTime()) / 3_600_000)
      return {
        cle: c.id,
        titre: `Confirmer ${c.reference}`,
        detail: `${c.cliente} · reçue il y a ${String(heures)} h`,
        vers: `/admin/commandes/${c.id}`,
        badge: (
          <Badge ton={heures >= 24 ? 'danger' : 'alerte'}>
            {heures >= 24 ? 'Urgent' : 'À faire'}
          </Badge>
        ),
      }
    }),
    ...(t.rendez_vous.a_confirmer > 0
      ? [
          {
            cle: 'rdv',
            titre: `Confirmer ${pluriel(t.rendez_vous.a_confirmer, 'rendez-vous', 'rendez-vous')}`,
            detail: 'Réservés sur le site, à confirmer sur WhatsApp',
            vers: '/admin/rendez-vous',
            badge: <Badge ton="alerte">À faire</Badge>,
          },
        ]
      : []),
    ...(a.a_expedier > 0
      ? [
          {
            cle: 'expedier',
            titre: `Remettre ${pluriel(a.a_expedier, 'commande', 'commandes')} à l’agence`,
            detail: 'Confirmées, pas encore expédiées',
            vers: '/admin/commandes',
            badge: <Badge ton="or">Envoi</Badge>,
          },
        ]
      : []),
    ...(a.en_cours_de_livraison > 0
      ? [
          {
            cle: 'livrer',
            titre: `Marquer ${pluriel(a.en_cours_de_livraison, 'commande livrée', 'commandes livrées')}`,
            detail: 'Expédiées : à confirmer livrées et encaisser',
            vers: '/admin/commandes',
            badge: <Badge ton="info">Suivi</Badge>,
          },
        ]
      : []),
  ]
  return (
    <Carte titre="À traiter" sousTitre="Ce qui attend une action de l’équipe">
      {lignes.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-encre-2 [&_svg]:size-4 [&_svg]:text-succes">
          <CircleCheck aria-hidden="true" />
          Rien en attente. Tout est à jour.
        </p>
      ) : (
        <ul className="divide-y divide-filet">
          {lignes.map((l) => (
            <li key={l.cle}>
              <Link
                to={l.vers}
                className="flex items-center gap-3 py-3 text-encre no-underline hover:text-encre [&:hover_.titre]:text-or-texte"
              >
                <span
                  aria-hidden="true"
                  className="size-5 shrink-0 rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-filet-champ)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="titre block truncate text-[15px] font-medium transition-colors">
                    {l.titre}
                  </span>
                  <span className="block truncate text-[12px] text-encre-3">{l.detail}</span>
                </span>
                {l.badge}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Carte>
  )
}

function SalonDuJour({ t }: { t: TableauDeBord }) {
  const liste = t.rendez_vous.liste_jour
  return (
    <Carte
      titre="Aujourd’hui au salon"
      sousTitre={pluriel(liste.length, 'rendez-vous', 'rendez-vous')}
      action={
        <Link
          to="/admin/rendez-vous"
          aria-label="Ouvrir l’agenda"
          className="grid size-10 place-items-center rounded-full text-encre-2 shadow-[inset_0_0_0_1px_var(--color-filet-fort)] hover:bg-carte-2 [&_svg]:size-4"
        >
          <Plus aria-hidden="true" />
        </Link>
      }
    >
      {liste.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-encre-2 [&_svg]:size-4">
          <Clock aria-hidden="true" />
          Aucun rendez-vous aujourd’hui.
        </p>
      ) : (
        <ol className="flex flex-col">
          {liste.map((r, i) => (
            <li key={r.id} className="grid grid-cols-[48px_20px_minmax(0,1fr)_auto] gap-x-2">
              <span className="chiffres pt-0.5 text-[13px] font-semibold">
                {formaterHeure(r.debut)}
              </span>
              <span aria-hidden="true" className="relative flex justify-center">
                <span
                  className={cx(
                    'relative z-10 mt-1 size-3 rounded-full border-2',
                    r.statut === 'confirme' ? 'border-or bg-or' : 'border-encre-2 bg-carte',
                  )}
                />
                {i < liste.length - 1 && (
                  <span className="absolute top-4 bottom-0 w-px bg-filet-fort" />
                )}
              </span>
              <span className="min-w-0 pb-5">
                <span className="block truncate text-[15px] font-medium">{r.service}</span>
                <span className="block truncate text-[12px] text-encre-3">
                  {r.cliente} · jusqu’à {formaterHeure(r.fin)}
                </span>
              </span>
              <span>
                <Badge ton={STATUT_RDV[r.statut].ton}>{STATUT_RDV[r.statut].libelle}</Badge>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Carte>
  )
}

/** Barres horizontales fines : une seule série, la plus grande valeur fait toute la largeur. */
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
      {lignes.map((l, i) => (
        <li key={l.cle} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{l.libelle}</span>
            <span className="chiffres shrink-0 text-encre-2">
              {l.texte}
              {l.detail && <span className="text-encre-3"> · {l.detail}</span>}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-carte-2">
            <div
              className={cx('h-full rounded-full', i === 0 ? 'degrade-or' : 'bg-encre')}
              style={{ width: l.valeur > 0 ? `max(${String((l.valeur / max) * 100)}%, 10px)` : 0 }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Produits({ t }: { t: TableauDeBord }) {
  const vendus = t.produits.filter((p) => p.quantite > 0)
  const top = vendus.slice(0, 5)
  const moins = t.produits
    .filter((p) => !top.includes(p))
    .sort((a, b) => a.quantite - b.quantite || a.ca_fcfa - b.ca_fcfa)
  const nom = (p: TableauDeBord['produits'][number]) =>
    p.variante === 'Format standard' ? p.produit : `${p.produit} · ${p.variante}`
  return (
    <Carte titre="Meilleures ventes" sousTitre="Quantités nettes des retours">
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
            <h3 className="text-[13px] font-semibold text-encre-2">Les moins vendus</h3>
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
    </Carte>
  )
}

function Villes({ t }: { t: TableauDeBord }) {
  return (
    <Carte titre="Ventes par ville" sousTitre="Chiffre d’affaires net">
      <Barres
        vide="Aucune vente sur la période."
        lignes={t.par_ville.map((v) => ({
          cle: v.ville,
          libelle: v.ville,
          valeur: v.ca_fcfa,
          texte: formaterFcfa(v.ca_fcfa),
          detail: pluriel(v.nombre, 'vente', 'ventes'),
        }))}
      />
    </Carte>
  )
}

function Clientes({ t }: { t: TableauDeBord }) {
  const c = t.clientes
  return (
    <Carte
      titre="Clientes"
      sousTitre={`${pluriel(c.actives, 'cliente a acheté', 'clientes ont acheté')} sur la période`}
      action={<Lien vers="/admin/clientes">Toutes</Lien>}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[18px] bg-rose p-4">
          <p className="text-[13px] font-medium">Nouvelles</p>
          <p className="chiffres mt-1 text-[30px] leading-none font-semibold">{c.nouvelles}</p>
          <p className="mt-1 text-[12px] opacity-75">premier achat</p>
        </div>
        <div className="rounded-[18px] bg-lilas p-4">
          <p className="text-[13px] font-medium">Fidèles</p>
          <p className="chiffres mt-1 text-[30px] leading-none font-semibold">{c.recurrentes}</p>
          <p className="mt-1 text-[12px] opacity-75">2 achats ou plus</p>
        </div>
      </div>
      {c.meilleures.length > 0 && (
        <ol className="mt-4 divide-y divide-filet">
          {c.meilleures.map((m) => (
            <li key={m.id} className="flex justify-between gap-3 py-2 text-sm">
              <Link to={`/admin/clientes/${m.id}`} className="min-w-0 truncate no-underline">
                {m.nom}
              </Link>
              <span className="chiffres shrink-0 text-encre-2">
                {formaterFcfa(m.ca_fcfa)}
                <span className="text-encre-3"> · {pluriel(m.nombre, 'achat', 'achats')}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Carte>
  )
}

function Definitions() {
  return (
    <details className="rounded-[26px] bg-carte p-5 text-sm shadow-panneau sm:p-6">
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
          commande, le jour de l’encaissement. « Reste à encaisser » : commandes confirmées pas
          encore payées, toutes dates confondues.
        </li>
        <li>
          <strong className="text-encre">Comparaison</strong> : la même durée, juste avant la
          période choisie. <strong className="text-encre">Pouls</strong> : 7 derniers jours, 8
          dernières semaines ou 6 derniers mois, quelle que soit la période choisie ; en encre
          au-dessus de la moyenne, en gris en dessous.
        </li>
        <li>
          <strong className="text-encre">Où en est la boutique</strong> : commandes reçues et
          rendez-vous de la période, par état ; stock par article (au-dessus du seuil d’alerte, sous
          le seuil, épuisé).
        </li>
        <li>
          <strong className="text-encre">Nouvelle cliente</strong> : son tout premier achat tombe
          dans la période. <strong className="text-encre">Fidèle</strong> : a acheté dans la période
          et compte au moins deux achats au total.
        </li>
      </ul>
    </details>
  )
}

function TableauComplet({ prenom }: { prenom: string }) {
  const [idPeriode, setIdPeriode] = useState<IdPeriode>('30j')
  const maintenant = useMaintenant()
  const aujourdhui = jourSalon(new Date(maintenant))
  const periode = bornesPeriode(idPeriode, aujourdhui)
  const tableau = useTableauDeBord(periode.du, periode.au)
  const t = tableau.data

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(30px,3.4vw,38px)] leading-[1.05] font-semibold tracking-[-0.025em]">
            {prenom ? `Bonjour ${prenom}` : 'Bonjour'}
          </h1>
          {t && (
            <p className="mt-1.5 text-[15px] text-encre-2">
              {pluriel(
                t.alertes.a_expedier,
                'commande à remettre à l’agence',
                'commandes à remettre à l’agence',
              )}
              , {pluriel(t.rendez_vous.aujourdhui, 'rendez-vous', 'rendez-vous')} au salon
              aujourd’hui.
            </p>
          )}
        </div>
        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
          <NavPilules
            libelle="Période"
            elements={PERIODES.map((p) => ({ id: p.id, libelle: p.libelle }))}
            actif={idPeriode}
            onChoisir={(id) => {
              setIdPeriode(id as IdPeriode)
            }}
          />
          <Link to="/admin/commandes" className={classesBouton('or', 'normal', 'no-underline')}>
            <Inbox aria-hidden="true" />
            Commandes
          </Link>
        </div>
      </div>

      {tableau.isError ? (
        <EtatErreur
          message={versErreurApp(tableau.error).message}
          onReessayer={() => void tableau.refetch()}
        />
      ) : tableau.isPending || !t ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <Squelette className="h-80 w-full rounded-[26px]" />
          <Squelette className="h-80 w-full rounded-[26px]" />
        </div>
      ) : (
        <div
          className={cx(
            'flex flex-col gap-4 transition-opacity',
            tableau.isPlaceholderData && 'opacity-60',
          )}
          aria-busy={tableau.isPlaceholderData}
        >
          <p className="sr-only">
            Période : du {formaterJour(periode.du)} au {formaterJour(periode.au)}.
          </p>
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              <OuEnEst t={t} />
              <Pouls t={t} />
              <ATraiter t={t} maintenant={maintenant} />
            </div>
            <div className="order-first flex min-w-0 flex-col gap-4 xl:order-none">
              <CarteChiffreAffaires t={t} periode={periode} />
              <StatutCommandes t={t} />
              <SalonDuJour t={t} />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Produits t={t} />
            <Villes t={t} />
            <Clientes t={t} />
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
