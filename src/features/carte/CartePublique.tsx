import { useEffect, useRef } from 'react'
import { ArrowRight, MapPin, PackageCheck, Store, Truck, X } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { classesBouton } from '@/components/ui/classesBouton'
import { NavPilules } from '@/components/ui/Navigation'
import { cx } from '@/lib/cx'
import type { CartePublique as Donnees, VillePublique } from '@/services/carte.service'
import { AFRIQUE, centre, positionDansCadre, ratioCadre, useGrilles, type Grilles } from './fond'
import { useVisible, type EtatCarte } from './etat'
import { PointsCarte } from './PointsCarte'
import { arc, projeter } from './projection'
import { useCartePublique } from './requetes'

/**
 * Carte publique « Notre présence dans le monde » : même fond que la carte d'administration,
 * mais alimentée par carte_publique (agrégats anonymes). Une commande enregistrée n'est jamais
 * montrée comme une livraison : trajet tracé en or plein = au moins une commande livrée,
 * pointillés d'or qui avancent = commande remise au transporteur, sans trajet = commande
 * seulement enregistrée ou destination desservie sans commande encore.
 */

function totaux(d: Donnees) {
  return d.pays.reduce(
    (t, p) => ({
      enregistrees: t.enregistrees + p.enregistrees,
      en_route: t.en_route + p.en_route,
      livrees: t.livrees + p.livrees,
    }),
    { enregistrees: 0, en_route: 0, livrees: 0 },
  )
}

function nomPays(d: Donnees, code: string): string {
  return d.pays.find((p) => p.code === code)?.nom ?? code
}

function phrase(v: VillePublique, estSalon: boolean): string {
  if (estSalon) return 'Notre salon et notre stock : chaque colis part d’ici, préparé à la main.'
  if (v.livrees > 0) return `${String(v.livrees)} commande(s) remise(s) en main propre à ${v.nom}.`
  if (v.en_route > 0) return `Un envoi est en route vers ${v.nom}.`
  if (v.enregistrees > 0) return `Commande(s) reçue(s) depuis ${v.nom}, pas encore expédiée(s).`
  return `Nous livrons à ${v.nom}. Les premières livraisons s’afficheront ici dès qu’elles seront remises.`
}

/** Fenêtre d'information d'une ville : trois comptes distincts et l'accès aux produits. */
function FicheVille({
  d,
  v,
  estSalon,
  onFermer,
  className,
  style,
}: {
  d: Donnees
  v: VillePublique
  estSalon: boolean
  onFermer: () => void
  className?: string | undefined
  style?: React.CSSProperties | undefined
}) {
  return (
    <section
      aria-label={`${v.nom}, ${nomPays(d, v.pays)}`}
      className={cx(
        'rounded-[20px] bg-carte p-4 text-encre shadow-flottant ring-1 ring-or/25',
        className,
      )}
      style={style}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-or-texte uppercase">
            {nomPays(d, v.pays)}
          </p>
          <h3 className="text-[20px] leading-tight font-semibold tracking-[-0.02em]">{v.nom}</h3>
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer la fiche"
          className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-encre-2 hover:bg-carte-2 [&_svg]:size-4"
        >
          <X aria-hidden="true" />
        </button>
      </header>
      <p className="mt-2 text-[14px] leading-snug text-encre-2">{phrase(v, estSalon)}</p>
      <dl className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        {[
          ['Enregistrées', v.enregistrees],
          ['En route', v.en_route],
          ['Livrées', v.livrees],
        ].map(([l, n]) => (
          <div key={l} className="rounded-[12px] bg-carte-2 px-1 py-2">
            <dt className="text-[11px] text-encre-3">{l}</dt>
            <dd
              className={cx(
                'chiffres text-[18px] font-semibold',
                l === 'Livrées' && Number(n) > 0 && 'text-or-texte',
              )}
            >
              {n}
            </dd>
          </div>
        ))}
      </dl>
      <Link
        to={CHEMINS.catalogue}
        className={classesBouton('or', 'petit', 'mt-3 w-full no-underline')}
      >
        Découvrir les produits
        <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  )
}

/** Scène de la carte (toujours nocturne : noir, or, ivoire), vues Monde → Afrique → Pays. */
export function ScenePresence({
  etat,
  hauteur = 'normale',
  className,
}: {
  etat: EtatCarte
  hauteur?: 'normale' | 'immersive'
  className?: string
}) {
  const racine = useRef<HTMLDivElement>(null)
  const visible = useVisible(racine)
  const requete = useCartePublique(visible)
  const grilles = useGrilles(visible)
  const d = requete.data

  return (
    <div
      ref={racine}
      className={cx(
        'zone-nuit relative flex flex-col gap-4 rounded-panneau bg-fond p-3 text-encre sm:p-5',
        className,
      )}
    >
      {requete.isError ? (
        <div className="grid min-h-[280px] place-items-center rounded-[22px] bg-carte p-6 text-center">
          <div>
            <p className="font-semibold">La carte n’a pas pu être chargée.</p>
            <button
              type="button"
              onClick={() => void requete.refetch()}
              className={classesBouton('secondaire', 'petit', 'mt-3')}
            >
              Réessayer
            </button>
          </div>
        </div>
      ) : !d || !grilles ? (
        <div
          aria-label="Chargement de la carte"
          className="aspect-[16/9] w-full animate-pulse-doux rounded-[22px] bg-carte"
        />
      ) : (
        <Cadre d={d} grilles={grilles} etat={etat} hauteur={hauteur} />
      )}
    </div>
  )
}

function Cadre({
  d,
  grilles,
  etat,
  hauteur,
}: {
  d: Donnees
  grilles: Grilles
  etat: EtatCarte
  hauteur: 'normale' | 'immersive'
}) {
  const { vue, setVue, choisie, setChoisie } = etat
  const g = grilles[vue]
  const salon = d.salon
  const origine =
    g && salon?.latitude != null && salon.longitude != null
      ? projeter(g, salon.longitude, salon.latitude)
      : null

  // Échap ferme la fiche ouverte.
  useEffect(() => {
    if (choisie === null) return
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setChoisie(null)
    }
    window.addEventListener('keydown', f)
    return () => {
      window.removeEventListener('keydown', f)
    }
  }, [choisie, setChoisie])

  if (!g) return null

  const villes = d.villes.flatMap((v) => {
    if (vue !== 'monde' && vue !== 'afrique' && v.pays !== vue) return []
    const p =
      v.latitude != null && v.longitude != null ? projeter(g, v.longitude, v.latitude) : null
    return p ? [{ v, p }] : []
  })

  // Vue Monde : un repère pour l'Afrique, un par pays hors d'Afrique.
  const groupes = [
    {
      id: 'afrique',
      nom: 'Afrique',
      codes: d.pays.filter((x) => AFRIQUE.has(x.code)).map((x) => x.code),
    },
    ...d.pays
      .filter((x) => !AFRIQUE.has(x.code))
      .map((x) => ({ id: x.code, nom: x.nom, codes: [x.code] })),
  ]
  const regions = groupes.flatMap((gr) => {
    const vs = d.villes.filter((v) => gr.codes.includes(v.pays))
    const c = centre(vs)
    const p = c ? projeter(g, c.longitude, c.latitude) : null
    const s = vs.reduce(
      (t, v) => ({ en_route: t.en_route + v.en_route, livrees: t.livrees + v.livrees }),
      { en_route: 0, livrees: 0 },
    )
    return p ? [{ ...gr, ...s, villes: vs.length, p }] : []
  })

  // Trajets : seulement vers une destination où un colis est parti (en route) ou arrivé (livré).
  const trajets =
    origine === null
      ? []
      : vue === 'monde'
        ? regions
            .filter((r) => r.id !== 'afrique' && (r.livrees > 0 || r.en_route > 0))
            .map((r) => ({ cle: r.id, p: r.p, livre: r.livrees > 0, route: r.en_route > 0 }))
        : villes
            .filter(({ v }) => v.nom !== salon?.ville && (v.livrees > 0 || v.en_route > 0))
            .map(({ v, p }) => ({
              cle: String(v.id),
              p,
              livre: v.livrees > 0,
              route: v.en_route > 0,
            }))
  const echelle = g.colonnes / 100

  const pilules = [
    { id: 'monde', libelle: 'Monde' },
    { id: 'afrique', libelle: 'Afrique' },
    ...(vue === 'monde' || vue === 'afrique' ? [] : [{ id: vue, libelle: nomPays(d, vue) }]),
  ]
  const ville = choisie === null ? null : (d.villes.find((v) => v.id === choisie) ?? null)
  const placee = ville ? villes.find(({ v }) => v.id === ville.id) : undefined
  const t = totaux(d)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-[13px] text-encre-2">
          <span aria-hidden="true" className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-or opacity-50 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-or" />
          </span>
          {d.pays.length} pays desservis · données réelles
        </p>
        <NavPilules
          libelle="Zone de la carte"
          elements={pilules}
          actif={vue}
          onChoisir={(id) => {
            setVue(id)
          }}
        />
      </div>

      <div
        className={cx('relative w-full', hauteur === 'immersive' && 'lg:mx-auto lg:max-w-[1100px]')}
        style={{ aspectRatio: ratioCadre(g) }}
      >
        <svg
          viewBox={`-0.5 -0.5 ${String(g.colonnes + 1)} ${String(g.lignes + 1)}`}
          className="absolute inset-0 size-full"
          role="img"
          aria-label={`Carte de nos destinations : ${String(d.pays.length)} pays desservis, ${String(t.livrees)} commande(s) livrée(s), ${String(t.en_route)} en route.`}
        >
          <PointsCarte g={g} rayon={vue === 'monde' ? 0.36 : 0.34} />
          {origine &&
            trajets.map((tr) => (
              <g key={`${vue}-${tr.cle}`}>
                {tr.livre && (
                  <path
                    d={arc(origine, tr.p)}
                    pathLength={1}
                    fill="none"
                    className="veine-trace stroke-or"
                    strokeWidth={0.34 * echelle}
                    strokeLinecap="round"
                  />
                )}
                {tr.route && (
                  <>
                    <path
                      id={`trajet-${vue}-${tr.cle}`}
                      d={arc(origine, tr.p)}
                      pathLength={1}
                      fill="none"
                      className={cx('stroke-or', !tr.livre && 'trajet-route')}
                      strokeWidth={0.3 * echelle}
                      strokeLinecap="round"
                      opacity={tr.livre ? 0 : 0.9}
                    />
                    <circle
                      r={0.95 * echelle}
                      className="fill-or stroke-fond motion-reduce:hidden"
                      strokeWidth={0.3 * echelle}
                    >
                      <animateMotion dur="5s" repeatCount="indefinite">
                        <mpath href={`#trajet-${vue}-${tr.cle}`} />
                      </animateMotion>
                    </circle>
                  </>
                )}
              </g>
            ))}
        </svg>

        {vue === 'monde' &&
          regions.map((r) => {
            const actif = r.livrees > 0 || r.en_route > 0
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setVue(r.id)
                }}
                aria-label={`${r.nom} : ${String(r.villes)} ville(s) desservie(s), ${String(r.livrees)} livraison(s). Explorer`}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={positionDansCadre(g, r.p)}
              >
                <span className="relative grid size-6 place-items-center">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 animate-ping rounded-full bg-or/40 motion-reduce:hidden"
                  />
                  <span
                    className={cx(
                      'relative block size-4 rounded-full border-2 border-fond transition-transform group-hover:scale-125',
                      actif ? 'bg-or' : 'bg-or/70',
                    )}
                  />
                </span>
                <span
                  className={cx(
                    'pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-carte/90 px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-encre shadow-panneau ring-1 ring-or/30 backdrop-blur-sm group-hover:ring-or',
                    r.id === 'CA' ? 'right-full mr-1' : 'left-full ml-1',
                  )}
                >
                  {r.nom}
                  {r.livrees > 0 && (
                    <span className="chiffres ml-1 text-or-texte">{r.livrees} livrée(s)</span>
                  )}
                </span>
              </button>
            )
          })}

        {vue !== 'monde' &&
          villes.map(({ v, p }) => {
            const estSalon = v.nom === salon?.ville
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setChoisie(choisie === v.id ? null : v.id)
                }}
                aria-label={`${v.nom} : ${String(v.livrees)} livrée(s), ${String(v.en_route)} en route, ${String(v.enregistrees)} enregistrée(s)`}
                aria-pressed={choisie === v.id}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={positionDansCadre(g, p)}
              >
                <span
                  className={cx(
                    'grid size-[18px] place-items-center rounded-full border-2 transition-transform group-hover:scale-125 [&_svg]:size-2.5',
                    estSalon
                      ? 'size-6 border-or bg-fond text-or'
                      : v.livrees > 0
                        ? 'border-fond bg-or'
                        : v.en_route > 0 || v.enregistrees > 0
                          ? 'border-or bg-or/35'
                          : 'border-encre-2 bg-fond',
                    choisie === v.id && 'scale-125 ring-4 ring-or/40',
                  )}
                >
                  {estSalon && <Store aria-hidden="true" />}
                </span>
                <span
                  className={cx(
                    'pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-carte/85 px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap text-encre backdrop-blur-sm',
                    estSalon ? 'right-full mr-1.5' : 'left-full ml-1.5',
                    vue === 'afrique' && 'hidden sm:block',
                  )}
                >
                  {v.nom}
                </span>
              </button>
            )
          })}

        {/* Fenêtre d'information près du repère (écrans larges). */}
        {ville && placee && (
          <FicheVille
            d={d}
            v={ville}
            estSalon={ville.nom === salon?.ville}
            onFermer={() => {
              setChoisie(null)
            }}
            className="absolute z-20 hidden w-[272px] sm:block"
            style={{
              ...positionDansCadre(g, placee.p),
              top: `${String(Math.min(78, Math.max(22, ((placee.p.y + 0.5) / (g.lignes + 1)) * 100)))}%`,
              transform:
                placee.p.x / g.colonnes > 0.55
                  ? 'translate(calc(-100% - 22px), -50%)'
                  : 'translate(22px, -50%)',
            }}
          />
        )}
      </div>

      {/* Sur téléphone, la fiche s'ouvre sous la carte. */}
      {ville && (
        <FicheVille
          d={d}
          v={ville}
          estSalon={ville.nom === salon?.ville}
          onFermer={() => {
            setChoisie(null)
          }}
          className={placee ? 'w-full sm:hidden' : 'w-full'}
        />
      )}

      {vue !== 'monde' && (
        <ul aria-label="Villes de cette zone" className="flex flex-wrap gap-1.5">
          {villes.map(({ v }) => (
            <li key={v.id}>
              <button
                type="button"
                aria-pressed={choisie === v.id}
                onClick={() => {
                  setChoisie(choisie === v.id ? null : v.id)
                }}
                className={cx(
                  'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors [&_svg]:size-3.5',
                  choisie === v.id ? 'bg-or text-sur-or' : 'bg-carte text-encre-2 hover:bg-carte-2',
                )}
              >
                <MapPin aria-hidden="true" />
                {v.nom}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Legende />
    </>
  )
}

function Legende() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-encre-2">
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-0.5 w-5 rounded bg-or" />
        Livrée à la cliente
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-0.5 w-5 border-t-2 border-dashed border-or" />
        En route
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-encre-2" />
        Destination desservie
      </li>
      <li className="inline-flex items-center gap-1.5 [&_svg]:size-2.5">
        <span
          aria-hidden="true"
          className="grid size-4 place-items-center rounded-full border-2 border-or text-or"
        >
          <Store />
        </span>
        Salon et stock
      </li>
    </ul>
  )
}

/**
 * Chiffres publics : pays et villes desservis (faits), puis commandes livrées et en route
 * seulement s'il y en a ; sinon un état clair, jamais de chiffre de façade.
 */
export function ChiffresPresence({ className }: { className?: string }) {
  const { data: d } = useCartePublique()
  if (!d)
    return (
      <div className={cx('h-[92px] animate-pulse-doux rounded-[22px] bg-carte-2', className)} />
    )
  const t = totaux(d)
  const premiers = t.livrees === 0 && t.en_route === 0
  const cases: { libelle: string; valeur: string; icone?: React.ReactNode }[] = [
    { libelle: 'Pays desservis', valeur: String(d.pays.length) },
    { libelle: 'Villes de livraison', valeur: String(d.villes.length) },
  ]
  if (!premiers) {
    cases.push(
      {
        libelle: 'Commandes livrées',
        valeur: String(t.livrees),
        icone: <PackageCheck aria-hidden="true" />,
      },
      { libelle: 'En route', valeur: String(t.en_route), icone: <Truck aria-hidden="true" /> },
    )
  }
  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <dl className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {cases.map((c) => (
          <div key={c.libelle} className="rounded-[18px] bg-carte px-4 py-3 sm:min-w-[150px]">
            <dt className="inline-flex items-center gap-1.5 text-[12px] text-encre-3 [&_svg]:size-3.5 [&_svg]:text-or-texte">
              {c.icone}
              {c.libelle}
            </dt>
            <dd className="chiffres titre-affiche mt-0.5 text-[30px] leading-none text-encre">
              {c.valeur}
            </dd>
          </div>
        ))}
      </dl>
      {premiers && (
        <p className="max-w-xl text-[14px] leading-relaxed text-encre-3">
          Les premières livraisons s’afficheront ici dès qu’elles seront remises aux clientes : nous
          ne montrons que des colis réellement livrés, jamais de chiffre estimé.
        </p>
      )}
    </div>
  )
}
