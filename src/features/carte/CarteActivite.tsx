import { useEffect, useMemo, useState } from 'react'
import { MapPin, Store, X } from 'lucide-react'
import { NavPilules } from '@/components/ui/Navigation'
import { cx } from '@/lib/cx'
import { formaterDateHeure } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import type { Carte, VilleCarte } from '@/services/carte.service'
import { arc, projeter, type Grille, type IdVue } from './projection'

type Grilles = Partial<Record<IdVue, Grille>>

/** Pays d'Afrique : regroupés en un seul repère sur la vue Monde (trop proches à cette échelle). */
const AFRIQUE = new Set(['CM', 'CI', 'GA', 'CG', 'SN', 'GN'])

/** Les grilles (≈ 80 ko) ne sont chargées qu'à l'ouverture de la carte. */
function useGrilles(): Grilles | null {
  const [g, setG] = useState<Grilles | null>(null)
  useEffect(() => {
    let actif = true
    void import('./points-carte.json').then((m) => {
      if (actif) setG(m.default as unknown as Grilles)
    })
    return () => {
      actif = false
    }
  }, [])
  return g
}

function Points({ g, vue }: { g: Grille; vue: IdVue }) {
  const cercles = useMemo(() => {
    const r = vue === 'monde' ? 0.36 : 0.34
    const liste = []
    for (let k = 0; k < g.points.length; k += 3) {
      const code = g.points[k + 2] ?? 0
      const pays = code > 0
      liste.push(
        <circle
          key={k}
          cx={g.points[k]}
          cy={g.points[k + 1]}
          r={r}
          className={pays ? 'fill-or' : 'fill-encre-3'}
          opacity={pays ? 0.85 : 0.28}
        />,
      )
    }
    return liste
  }, [g, vue])
  return <g>{cercles}</g>
}

function Statistique({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="rounded-[14px] bg-carte-2 px-3 py-2.5">
      <dt className="text-[12px] text-encre-3">{libelle}</dt>
      <dd className="chiffres mt-0.5 font-semibold">{valeur}</dd>
    </div>
  )
}

function FicheVille({
  v,
  salon,
  nomPays,
  onFermer,
}: {
  v: VilleCarte
  salon: Carte['salon']
  nomPays: string
  onFermer: () => void
}) {
  const estSalon = salon !== null && salon.ville === v.nom
  return (
    <section
      aria-label={`Activité à ${v.nom}`}
      className="flex flex-col gap-4 rounded-[22px] bg-carte p-5 shadow-flottant"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.1em] text-encre-3 uppercase">
            {nomPays}
          </p>
          <h3 className="text-[22px] font-semibold tracking-[-0.02em]">{v.nom}</h3>
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="grid size-9 place-items-center rounded-full text-encre-2 hover:bg-carte-2 [&_svg]:size-4"
        >
          <X aria-hidden="true" />
        </button>
      </header>
      {v.commandes === 0 && v.ventes === 0 ? (
        <p className="text-sm text-encre-2">
          Pas encore de commande sur la période.
          {estSalon && ` Salon : ${String(salon.rendez_vous)} rendez-vous.`}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2">
            <Statistique libelle="Commandes reçues" valeur={String(v.commandes)} />
            <Statistique libelle="Chiffre d’affaires net" valeur={formaterFcfa(v.ca_fcfa)} />
            <Statistique
              libelle="Livrées · en cours · à confirmer"
              valeur={`${String(v.livrees)} · ${String(v.en_cours)} · ${String(v.a_confirmer)}`}
            />
            <Statistique
              libelle="Panier moyen"
              valeur={v.panier_moyen_fcfa === null ? '—' : formaterFcfa(v.panier_moyen_fcfa)}
            />
            <Statistique libelle="Clientes" valeur={String(v.clientes)} />
            {estSalon && (
              <Statistique libelle="Rendez-vous au salon" valeur={String(salon.rendez_vous)} />
            )}
          </dl>
          {v.produit_phare && (
            <p className="text-sm">
              <span className="text-encre-3">Produit phare : </span>
              <span className="font-semibold">{v.produit_phare.nom}</span>
              <span className="text-encre-3"> ({v.produit_phare.quantite} vendu(s))</span>
            </p>
          )}
          {v.quartiers.length > 0 && (
            <div>
              <h4 className="text-[13px] font-semibold text-encre-2">Quartiers les plus actifs</h4>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {v.quartiers.map((q) => (
                  <li
                    key={q.quartier}
                    className="rounded-full bg-or-doux px-3 py-1 text-[13px] font-medium"
                  >
                    {q.quartier} · {q.commandes}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {v.derniere_commande_at && (
            <p className="text-[12px] text-encre-3">
              Dernière commande : {formaterDateHeure(v.derniere_commande_at)}
            </p>
          )}
          {v.annulees > 0 && (
            <p className="text-[12px] text-encre-3">{v.annulees} annulée(s), non comptée(s).</p>
          )}
        </>
      )}
    </section>
  )
}

/**
 * Carte de l'activité : Monde → Afrique → Pays → Ville (et ses quartiers). Points des terres
 * précalculés, pays desservis en or, arcs depuis le salon vers chaque ville active (or plein :
 * livrées ; pointillé or : en cours ; pointillé gris : à confirmer), colis en mouvement sur les
 * envois en cours. Toutes les valeurs viennent de carte_activite ; zéro reste zéro.
 */
export function CarteActivite({ carte, majLe }: { carte: Carte; majLe: number }) {
  const grilles = useGrilles()
  const [vue, setVue] = useState<IdVue>('afrique')
  const [choisie, setChoisie] = useState<number | null>(null)
  const g = grilles?.[vue]
  const salon = carte.salon
  const origine =
    g && salon?.latitude != null && salon.longitude != null
      ? projeter(g, salon.longitude, salon.latitude)
      : null
  const villes = carte.villes.flatMap((v) => {
    const p =
      g && v.latitude != null && v.longitude != null ? projeter(g, v.longitude, v.latitude) : null
    return p ? [{ v, p }] : []
  })
  // Vue Monde : un repère par pays hors d'Afrique, un seul pour l'Afrique (au centre des villes),
  // qui ouvre la vue correspondante au clic.
  const nomPays = (code: string) => carte.pays.find((x) => x.code === code)?.nom ?? code
  const groupes = [
    {
      id: 'afrique',
      nom: 'Afrique',
      codes: carte.pays.filter((x) => AFRIQUE.has(x.code)).map((x) => x.code),
    },
    ...carte.pays
      .filter((x) => !AFRIQUE.has(x.code))
      .map((x) => ({ id: x.code, nom: x.nom, codes: [x.code] })),
  ]
  const paysRepere = groupes.flatMap((gr) => {
    const vs = carte.villes.filter(
      (v) => gr.codes.includes(v.pays) && v.latitude != null && v.longitude != null,
    )
    if (!g || vs.length === 0) return []
    const lat = vs.reduce((t, v) => t + (v.latitude ?? 0), 0) / vs.length
    const lon = vs.reduce((t, v) => t + (v.longitude ?? 0), 0) / vs.length
    const p = projeter(g, lon, lat)
    const commandes = carte.pays
      .filter((x) => gr.codes.includes(x.code))
      .reduce((t, x) => t + x.commandes, 0)
    return p ? [{ ...gr, commandes, p }] : []
  })
  const vuesPilules = [
    { id: 'monde', libelle: 'Monde' },
    { id: 'afrique', libelle: 'Afrique' },
    ...(vue === 'monde' || vue === 'afrique' ? [] : [{ id: vue, libelle: nomPays(vue) }]),
  ]
  const maxPays = Math.max(1, ...paysRepere.map((x) => x.commandes))
  const maxCommandes = Math.max(1, ...carte.villes.map((v) => v.commandes))
  const ville = carte.villes.find((v) => v.id === choisie) ?? null
  const echelle = g ? g.colonnes / 100 : 1
  const estPays = vue !== 'monde' && vue !== 'afrique'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-[13px] text-encre-2">
          <span aria-hidden="true" className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-menthe opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-menthe" />
          </span>
          Données réelles · mises à jour à{' '}
          {new Date(majLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <NavPilules
          libelle="Zone de la carte"
          elements={vuesPilules}
          actif={vue}
          onChoisir={(id) => {
            setVue(id)
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="relative w-full overflow-hidden rounded-[22px] bg-carte-2"
          style={{
            aspectRatio: g ? `${String(g.colonnes + 1)} / ${String(g.lignes + 1)}` : '16 / 9',
          }}
        >
          {!g ? (
            <div className="absolute inset-0 animate-pulse-doux bg-carte-3" />
          ) : (
            <>
              <svg
                viewBox={`-0.5 -0.5 ${String(g.colonnes + 1)} ${String(g.lignes + 1)}`}
                className="absolute inset-0 size-full"
                role="img"
                aria-label={`Carte : ${carte.villes.filter((v) => v.commandes > 0).length} ville(s) avec des commandes sur la période`}
              >
                <Points g={g} vue={vue} />
                {origine &&
                  villes
                    .filter(({ v }) => v.nom !== salon?.ville && v.commandes > 0)
                    .map(({ v, p }) => {
                      const d = arc(origine, p)
                      const etat = v.livrees > 0 ? 'livre' : v.en_cours > 0 ? 'cours' : 'attente'
                      return (
                        <g key={v.id}>
                          <path
                            id={`arc-${String(v.id)}`}
                            d={d}
                            fill="none"
                            className={etat === 'attente' ? 'stroke-encre-3' : 'stroke-or'}
                            strokeWidth={0.32 * echelle}
                            strokeDasharray={
                              etat === 'livre'
                                ? undefined
                                : `${String(1.1 * echelle)} ${String(0.9 * echelle)}`
                            }
                            strokeLinecap="round"
                          />
                          {v.en_cours > 0 && (
                            <circle
                              r={0.9 * echelle}
                              className="fill-or stroke-carte motion-reduce:hidden"
                              strokeWidth={0.3 * echelle}
                            >
                              <animateMotion dur="4.5s" repeatCount="indefinite">
                                <mpath href={`#arc-${String(v.id)}`} />
                              </animateMotion>
                            </circle>
                          )}
                        </g>
                      )
                    })}
              </svg>
              {vue === 'monde' &&
                paysRepere.map((pays) => {
                  const { p } = pays
                  const taille = 16 + Math.round(Math.sqrt(pays.commandes / maxPays) * 16)
                  return (
                    <button
                      key={pays.id}
                      type="button"
                      onClick={() => {
                        setVue(pays.id)
                      }}
                      aria-label={`${pays.nom} : ${String(pays.commandes)} commande(s), ouvrir la zone`}
                      className="group absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${String(((p.x + 0.5) / (g.colonnes + 1)) * 100)}%`,
                        top: `${String(((p.y + 0.5) / (g.lignes + 1)) * 100)}%`,
                      }}
                    >
                      <span
                        className={cx(
                          'block rounded-full border-2 transition-transform group-hover:scale-110',
                          pays.commandes > 0 ? 'border-carte bg-or' : 'border-encre-3 bg-carte',
                        )}
                        style={{ width: taille, height: taille }}
                      />
                      <span
                        className={cx(
                          'pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-carte/90 px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap shadow-panneau backdrop-blur-sm',
                          pays.id === 'CA' ? 'right-full mr-1.5' : 'left-full ml-1.5',
                        )}
                      >
                        {pays.nom}
                        <span className="chiffres ml-1 text-or-texte">{pays.commandes}</span>
                      </span>
                    </button>
                  )
                })}
              {vue !== 'monde' &&
                villes.map(({ v, p }) => {
                  const taille = 12 + Math.round(Math.sqrt(v.commandes / maxCommandes) * 14)
                  const estSalon = v.nom === salon?.ville
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setChoisie(v.id)
                      }}
                      aria-label={`${v.nom} : ${String(v.commandes)} commande(s)`}
                      aria-pressed={choisie === v.id}
                      className="group absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${String(((p.x + 0.5) / (g.colonnes + 1)) * 100)}%`,
                        top: `${String(((p.y + 0.5) / (g.lignes + 1)) * 100)}%`,
                      }}
                    >
                      <span
                        className={cx(
                          'grid place-items-center rounded-full border-2 transition-transform group-hover:scale-110 [&_svg]:size-3',
                          estSalon
                            ? 'border-or bg-encre text-or'
                            : v.commandes > 0
                              ? 'border-carte bg-or text-sur-or'
                              : 'border-encre-3 bg-carte text-encre-3',
                          choisie === v.id && 'ring-4 ring-or/35',
                        )}
                        style={{ width: taille, height: taille }}
                      >
                        {estSalon && <Store aria-hidden="true" />}
                      </span>
                      <span
                        className={cx(
                          'pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-carte/90 px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap shadow-panneau backdrop-blur-sm',
                          estSalon ? 'right-full mr-1.5' : 'left-full ml-1.5',
                          vue === 'afrique' && 'hidden sm:block',
                        )}
                      >
                        {v.nom}
                        {v.commandes > 0 && (
                          <span className="chiffres ml-1 text-or-texte">{v.commandes}</span>
                        )}
                      </span>
                    </button>
                  )
                })}
            </>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {ville ? (
            <FicheVille
              v={ville}
              salon={salon}
              nomPays={nomPays(ville.pays)}
              onFermer={() => {
                setChoisie(null)
              }}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-encre-2">
                Choisissez un pays, puis une ville (ou touchez-la sur la carte).
              </p>
              {carte.pays.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  aria-pressed={vue === p.code}
                  onClick={() => {
                    setVue(p.code)
                  }}
                  className={cx(
                    'flex items-center justify-between gap-3 rounded-[16px] px-4 py-3 text-left transition-colors',
                    vue === p.code ? 'bg-encre text-fond' : 'bg-carte-2 hover:bg-carte-3',
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold [&_svg]:size-4">
                    <MapPin aria-hidden="true" />
                    {p.nom}
                  </span>
                  <span className="chiffres text-[13px] opacity-80">
                    {p.commandes} commande(s) · {formaterFcfa(p.ca_fcfa)}
                  </span>
                </button>
              ))}
              <h3 className="mt-2 text-[13px] font-semibold text-encre-2">
                {estPays ? `Villes · ${nomPays(vue)}` : 'Villes'}
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {carte.villes
                  .filter((v) =>
                    estPays ? v.pays === vue : vue === 'afrique' ? AFRIQUE.has(v.pays) : true,
                  )
                  .map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setChoisie(v.id)
                        }}
                        className="chiffres min-h-10 rounded-full bg-carte-2 px-3.5 text-[13px] font-medium transition-colors hover:bg-carte-3"
                      >
                        {v.nom} · {v.commandes}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-encre-2">
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-5 rounded bg-or" />
              Livrées
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-5 border-t-2 border-dashed border-or" />
              En cours
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-0.5 w-5 border-t-2 border-dashed border-encre-3"
              />
              À confirmer
            </li>
            <li className="inline-flex items-center gap-1.5 [&_svg]:size-3">
              <span
                aria-hidden="true"
                className="grid size-4 place-items-center rounded-full bg-encre text-or"
              >
                <Store />
              </span>
              Salon et stock
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
