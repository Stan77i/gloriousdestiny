import { useState } from 'react'
import { Download, Moon, PackagePlus, RefreshCw, TriangleAlert, CircleHelp } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Bouton } from '@/components/ui/Bouton'
import { Squelette } from '@/components/ui/Chargeur'
import { EtatErreur } from '@/components/ui/Etats'
import { NavPilules } from '@/components/ui/Navigation'
import { Panneau, TuileChiffre } from '@/components/ui/Panneau'
import { Tableau } from '@/components/ui/Tableau'
import type { TonBadge } from '@/components/ui/Badge'
import { aRole } from '@/domain/roles'
import { telechargerCsv, versCsv } from '@/features/analyse/csv'
import { decimal, formaterVitesse } from '@/features/analyse/format'
import { useAnalyse } from '@/features/analyse/requetes'
import { useAuth } from '@/features/auth/useAuth'
import { GraphiqueVentes } from '@/features/tableau-de-bord/GraphiqueVentes'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDateHeure, formaterJour } from '@/lib/format/date'
import type { Analyse, Classe, LigneAnalyse } from '@/services/analyse.service'

const CLASSE: Record<Classe, { libelle: string; ton: TonBadge }> = {
  epuise: { libelle: 'Épuisé', ton: 'danger' },
  risque_rupture: { libelle: 'Risque de rupture', ton: 'alerte' },
  populaire: { libelle: 'Populaire', ton: 'or' },
  en_croissance: { libelle: 'En croissance', ton: 'succes' },
  en_baisse: { libelle: 'En baisse', ton: 'info' },
  dormant: { libelle: 'Dormant', ton: 'neutre' },
}

function nomArticle(l: LigneAnalyse): string {
  return l.variante === 'Format standard' ? l.produit : `${l.produit} · ${l.variante}`
}

function raisonInsuffisant(l: LigneAnalyse, a: Analyse): string {
  if (l.historique_jours < a.regles.min_historique_jours)
    return `en stock depuis ${String(l.historique_jours)} j (il en faut ${String(a.regles.min_historique_jours)})`
  return `${String(l.nb_ventes_fenetre)} vente(s) en ${String(a.regles.fenetre_jours)} j (il en faut ${String(a.regles.min_ventes)})`
}

function exporter(a: Analyse) {
  const virgule = (n: number | null) => (n === null ? null : decimal.format(n))
  const csv = versCsv(
    [
      'Produit',
      'Disponible',
      `Ventes ${String(a.regles.fenetre_jours)} j`,
      'Jours disponibles',
      'Vitesse (unités/jour)',
      'Jours avant rupture',
      'Date de rupture estimée',
      'Quantité recommandée',
      'Tendance (%)',
      'Classes',
      'Données suffisantes',
    ],
    a.produits.map((l) => [
      nomArticle(l),
      l.disponible,
      l.ventes_fenetre,
      l.jours_dispo_fenetre,
      virgule(l.vitesse),
      l.jours_avant_rupture,
      l.date_rupture,
      l.quantite_recommandee,
      l.tendance_pct,
      l.classes.map((c) => CLASSE[c].libelle).join(', '),
      l.suffisant ? 'oui' : 'non',
    ]),
  )
  telechargerCsv(`glorious-destiny-previsions-${a.aujourdhui}.csv`, csv)
}

function Tuiles({ a }: { a: Analyse }) {
  const aCommander = a.produits.filter((l) => (l.quantite_recommandee ?? 0) > 0)
  const risque = a.produits.filter(
    (l) => l.classes.includes('risque_rupture') || l.classes.includes('epuise'),
  )
  const dormants = a.produits.filter((l) => l.classes.includes('dormant'))
  const insuffisants = a.produits.filter((l) => !l.suffisant)
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <TuileChiffre
        fond={aCommander.length > 0 ? 'or' : 'carte'}
        libelle="À recommander"
        valeur={String(aCommander.length)}
        complement={
          aCommander.length > 0
            ? `${String(aCommander.reduce((s, l) => s + (l.quantite_recommandee ?? 0), 0))} unités au total`
            : 'article(s)'
        }
        icone={<PackagePlus />}
      />
      <TuileChiffre
        fond={risque.length > 0 ? 'rose' : 'carte'}
        libelle="Épuisés ou en risque de rupture"
        valeur={String(risque.length)}
        complement="avant le prochain réapprovisionnement"
        icone={<TriangleAlert />}
      />
      <TuileChiffre
        libelle="Dormants"
        valeur={String(dormants.length)}
        complement={`aucune vente depuis ${String(a.regles.dormant_jours)} j`}
        icone={<Moon />}
      />
      <TuileChiffre
        fond="sable"
        libelle="Données insuffisantes"
        valeur={String(insuffisants.length)}
        complement="pas encore de prévision fiable"
        icone={<CircleHelp />}
      />
    </div>
  )
}

function TableauProduits({ a, admin }: { a: Analyse; admin: boolean }) {
  return (
    <Tableau
      legende="Prévisions par article"
      cle={(l) => l.variante_id}
      lignes={a.produits}
      colonnes={[
        {
          id: 'produit',
          entete: 'Article',
          pleineLargeur: true,
          cellule: (l) => (
            <span className="flex flex-col gap-1.5">
              <span className="font-medium">{nomArticle(l)}</span>
              {l.classes.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {l.classes.map((c) => (
                    <Badge key={c} ton={CLASSE[c].ton}>
                      {CLASSE[c].libelle}
                    </Badge>
                  ))}
                </span>
              )}
            </span>
          ),
        },
        {
          id: 'disponible',
          entete: 'Disponible',
          numerique: true,
          cellule: (l) => <span className="chiffres">{l.disponible}</span>,
        },
        {
          id: 'vitesse',
          entete: 'Vitesse de vente',
          cellule: (l) =>
            l.suffisant && l.vitesse !== null ? (
              <span className="flex flex-col">
                <span className="chiffres font-medium">{formaterVitesse(l.vitesse)}</span>
                <span className="text-[12px] text-encre-3">
                  {l.ventes_fenetre} vendu(s) sur {l.jours_dispo_fenetre} j en stock
                </span>
              </span>
            ) : (
              <span className="flex flex-col">
                <span className="text-encre-2">Données insuffisantes</span>
                <span className="text-[12px] text-encre-3">{raisonInsuffisant(l, a)}</span>
              </span>
            ),
        },
        {
          id: 'rupture',
          entete: 'Rupture estimée',
          cellule: (l) =>
            l.disponible <= 0 ? (
              <span className="font-medium text-danger">Épuisé</span>
            ) : l.jours_avant_rupture !== null && l.date_rupture ? (
              <span className="flex flex-col">
                <span className="chiffres font-medium">dans {l.jours_avant_rupture} j</span>
                <span className="text-[12px] text-encre-3">
                  vers le {formaterJour(l.date_rupture, 'court')}
                </span>
              </span>
            ) : (
              <span className="text-encre-3">—</span>
            ),
        },
        {
          id: 'commander',
          entete: 'À recommander',
          numerique: true,
          cellule: (l) =>
            l.quantite_recommandee !== null ? (
              <span
                className={
                  l.quantite_recommandee > 0 ? 'chiffres font-semibold text-or-texte' : 'chiffres'
                }
              >
                {l.quantite_recommandee}
              </span>
            ) : l.suffisant ? (
              admin ? (
                <Link to="/admin/catalogue" className="text-[13px]">
                  Saisir les délais
                </Link>
              ) : (
                <span className="text-[13px] text-encre-3">délais non saisis</span>
              )
            ) : (
              <span className="text-encre-3">—</span>
            ),
        },
        {
          id: 'tendance',
          entete: 'Tendance',
          numerique: true,
          secondaire: true,
          cellule: (l) =>
            l.tendance_pct === null ? (
              <span className="text-encre-3">—</span>
            ) : (
              <span className="chiffres">
                {l.tendance_pct > 0 ? '+' : l.tendance_pct < 0 ? '−' : ''}
                {Math.abs(l.tendance_pct)} %
              </span>
            ),
        },
      ]}
    />
  )
}

function Evolution({ a }: { a: Analyse }) {
  const [vue, setVue] = useState<'semaines' | 'mois'>('semaines')
  const points = (vue === 'semaines' ? a.hebdomadaire : a.mensuel).map((p) => ({
    jour: p.debut,
    ca_fcfa: p.ca_fcfa,
    nombre: p.ventes,
  }))
  const mois = new Intl.DateTimeFormat('fr-FR', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
  const etiquette =
    vue === 'semaines'
      ? (jour: string) => `Sem. du ${formaterJour(jour, 'court').split(' ').slice(1).join(' ')}`
      : (jour: string) => mois.format(new Date(`${jour}T12:00:00Z`))
  return (
    <Panneau
      titre="Évolution des ventes"
      sousTitre="Chiffre d’affaires net des retours"
      action={
        <NavPilules
          libelle="Regroupement"
          elements={[
            { id: 'semaines', libelle: '12 semaines' },
            { id: 'mois', libelle: '12 mois' },
          ]}
          actif={vue}
          onChoisir={(id) => {
            setVue(id as 'semaines' | 'mois')
          }}
        />
      }
    >
      <GraphiqueVentes
        serie={points}
        etiquette={etiquette}
        etiquetteAxe={etiquette}
        unite={vue === 'semaines' ? 'Semaine' : 'Mois'}
      />
    </Panneau>
  )
}

function Regles({ a }: { a: Analyse }) {
  const r = a.regles
  return (
    <details className="rounded-panneau bg-carte p-5 text-sm shadow-panneau sm:p-6">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold">
        Comment ces prévisions sont calculées
      </summary>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 leading-relaxed text-encre-2">
        <li>
          <strong className="text-encre">Vitesse de vente</strong> : unités vendues (nettes des
          retours) sur les {r.fenetre_jours} derniers jours, divisées par le nombre de jours où
          l’article était en stock. Les jours de rupture ne comptent pas, sinon la vitesse serait
          sous-estimée.
        </li>
        <li>
          <strong className="text-encre">Rupture estimée</strong> : stock disponible ÷ vitesse.
        </li>
        <li>
          <strong className="text-encre">À recommander</strong> : vitesse × (délai de
          réapprovisionnement + stock de sécurité) − disponible. Calculé seulement si ces deux
          délais sont saisis pour le produit (Catalogue).
        </li>
        <li>
          <strong className="text-encre">Tendance</strong> : vitesse des {r.tendance_jours} derniers
          jours comparée aux {r.tendance_jours} précédents. En croissance au-delà de +
          {r.seuil_tendance_pct} %, en baisse en dessous de −{r.seuil_tendance_pct} %.
        </li>
        <li>
          <strong className="text-encre">Populaire</strong> : au moins {r.part_populaire_pct} % des
          unités vendues sur {r.fenetre_jours} jours.{' '}
          <strong className="text-encre">Dormant</strong> : en stock, aucune vente depuis{' '}
          {r.dormant_jours} jours. <strong className="text-encre">Risque de rupture</strong> :
          épuisé avant la fin du délai de réapprovisionnement.
        </li>
        <li>
          <strong className="text-encre">Données insuffisantes</strong> : moins de{' '}
          {r.min_historique_jours} jours en stock ou moins de {r.min_ventes} ventes sur{' '}
          {r.fenetre_jours} jours. Aucun chiffre n’est alors avancé.
        </li>
      </ul>
    </details>
  )
}

/** Analyse et prévisions : vitesse, rupture, réapprovisionnement, classification, évolution. */
export function PageAdminAnalyse() {
  useTitreDocument('Analyse et prévisions')
  const auth = useAuth()
  const admin = aRole(auth.statut === 'connecte' ? (auth.profil?.role ?? null) : null, [])
  const analyse = useAnalyse()

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold">Analyse et prévisions</h1>
          <p className="text-sm text-encre-3">
            {analyse.data
              ? `Calculé le ${formaterDateHeure(analyse.data.calcule_at)} à partir des ventes et des mouvements de stock réels.`
              : 'À partir des ventes et des mouvements de stock réels.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Bouton
            variante="secondaire"
            icone={<RefreshCw />}
            enCours={analyse.isFetching}
            onClick={() => void analyse.refetch()}
          >
            Recalculer
          </Bouton>
          {analyse.data && (
            <Bouton
              variante="secondaire"
              icone={<Download />}
              onClick={() => {
                exporter(analyse.data)
              }}
            >
              Exporter (CSV)
            </Bouton>
          )}
        </div>
      </div>
      {analyse.isError ? (
        <EtatErreur
          message={versErreurApp(analyse.error).message}
          onReessayer={() => void analyse.refetch()}
        />
      ) : analyse.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Squelette key={i} className="h-36 w-full" />
          ))}
          <Squelette className="h-80 w-full sm:col-span-2 xl:col-span-4" />
        </div>
      ) : (
        <>
          <Tuiles a={analyse.data} />
          <TableauProduits a={analyse.data} admin={admin} />
          <Evolution a={analyse.data} />
          <Regles a={analyse.data} />
        </>
      )}
    </section>
  )
}
