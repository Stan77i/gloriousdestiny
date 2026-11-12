import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { usePrestations } from '@/features/catalogue/prestations'
import { useParametresPublics, useProduits } from '@/features/catalogue/requetes'
import { lienWhatsApp } from '@/features/whatsapp/lienWhatsApp'
import { useMouvementReduit } from '@/hooks/useMouvementReduit'
import { composerMessages } from './messages'

const CLE = 'gd-conversation'
const PREMIER = 6000
const ENTRE = 40000
const VISIBLE = 11000
const MAX = 4

type Memoire = { vus: number; prochain: number; ferme: boolean }

function lire(): Memoire {
  try {
    const m = JSON.parse(sessionStorage.getItem(CLE) ?? 'null') as Memoire | null
    if (m) return m
  } catch {
    /* stockage indisponible : on repart de zéro */
  }
  return { vus: 0, prochain: 0, ferme: false }
}

function ecrire(m: Memoire) {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(m))
  } catch {
    /* sans stockage, la conversation reste limitée à cette page */
  }
}

/**
 * Bulles de conversation sous le logo : de temps en temps, la maison « écrit » à la cliente
 * (points de saisie, puis une phrase courte et naturelle, avec un lien). Discrètes : la première
 * après 6 s, puis toutes les 40 s, 4 au plus par visite ; fermer une bulle les arrête pour la
 * visite. Absentes du panier et de la commande, pour ne jamais gêner un achat.
 */
export function BullesConversation() {
  const { pathname } = useLocation()
  const produits = useProduits()
  const prestations = usePrestations()
  const parametres = useParametresPublics()
  const reduit = useMouvementReduit()
  const whatsapp = lienWhatsApp(parametres.data, 'Bonjour Glorious Destiny, j’aimerais un conseil.')
  const messages = useMemo(
    () =>
      composerMessages({
        produits: produits.data,
        prestations: prestations.data,
        whatsapp: whatsapp?.url ?? null,
      }),
    [produits.data, prestations.data, whatsapp?.url],
  )
  const [rang, setRang] = useState<number | null>(null)
  const [ecrit, setEcrit] = useState(false)
  const [survol, setSurvol] = useState(false)
  const calme = pathname.startsWith(CHEMINS.panier) || pathname.startsWith(CHEMINS.commande)

  // Programme la prochaine bulle.
  useEffect(() => {
    if (calme || messages.length === 0 || rang !== null) return
    const m = lire()
    if (m.ferme || m.vus >= MAX) return
    const attente = m.vus === 0 ? PREMIER : ENTRE
    const t = window.setTimeout(() => {
      const memo = lire()
      if (memo.ferme || memo.vus >= MAX) return
      ecrire({ ...memo, vus: memo.vus + 1, prochain: memo.prochain + 1 })
      setEcrit(false)
      setRang(memo.prochain % messages.length)
    }, attente)
    return () => {
      window.clearTimeout(t)
    }
  }, [calme, messages.length, rang])

  // « en train d'écrire… », puis la phrase ; elle s'efface seule (sauf survol).
  useEffect(() => {
    if (rang === null) return
    const a = window.setTimeout(
      () => {
        setEcrit(true)
      },
      reduit ? 0 : 1100,
    )
    return () => {
      window.clearTimeout(a)
    }
  }, [rang, reduit])
  useEffect(() => {
    if (rang === null || !ecrit || survol) return
    const t = window.setTimeout(() => {
      setRang(null)
    }, VISIBLE)
    return () => {
      window.clearTimeout(t)
    }
  }, [rang, ecrit, survol])

  const msg = rang === null || calme ? undefined : messages[rang]
  if (!msg) return null

  const fermer = () => {
    ecrire({ ...lire(), ferme: true })
    setRang(null)
  }

  return (
    <aside
      aria-label="Message de Glorious Destiny"
      onMouseEnter={() => {
        setSurvol(true)
      }}
      onMouseLeave={() => {
        setSurvol(false)
      }}
      className="bulle-conversation fixed top-[5.25rem] right-4 left-4 z-30 sm:right-auto sm:max-w-[360px] lg:left-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))]"
    >
      {/* Queue de la bulle, vers le logo. */}
      <span
        aria-hidden="true"
        className="absolute -top-1.5 left-5 size-3 rotate-45 rounded-[2px] bg-carte ring-1 ring-or/25 [clip-path:polygon(0_0,100%_0,0_100%)]"
      />
      <div className="relative flex gap-3 rounded-[20px] bg-carte p-3 pr-2 shadow-flottant ring-1 ring-or/25">
        <span
          aria-hidden="true"
          className="logo-vivant grid size-9 shrink-0 place-items-center rounded-full bg-encre text-or"
        >
          <svg viewBox="0 0 24 24" className="size-4">
            <path
              d="M17.6 7.2A7 7 0 1 0 19 13h-6.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-encre-3">
            <span className="font-semibold text-encre">Glorious Destiny</span> · à l’instant
          </p>
          {ecrit ? (
            <div className="apparait-fondu" aria-live="polite">
              <p className="mt-0.5 text-[14px] leading-snug text-encre">{msg.texte}</p>
              {msg.lien &&
                (msg.lien.externe ? (
                  <a
                    href={msg.lien.vers}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-encre px-3.5 text-[13px] font-semibold text-fond no-underline [&_svg]:size-3.5"
                  >
                    {msg.lien.libelle}
                    <ArrowRight aria-hidden="true" />
                  </a>
                ) : (
                  <Link
                    to={msg.lien.vers}
                    onClick={() => {
                      setRang(null)
                    }}
                    className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-encre px-3.5 text-[13px] font-semibold text-fond no-underline [&_svg]:size-3.5"
                  >
                    {msg.lien.libelle}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
            </div>
          ) : (
            <span aria-label="Glorious Destiny écrit…" className="mt-2 flex gap-1 pb-1">
              <span className="guide-point size-1.5 rounded-full bg-encre-3" />
              <span className="guide-point size-1.5 rounded-full bg-encre-3 [animation-delay:150ms]" />
              <span className="guide-point size-1.5 rounded-full bg-encre-3 [animation-delay:300ms]" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={fermer}
          aria-label="Fermer ce message"
          className="grid size-9 shrink-0 place-items-center rounded-full text-encre-3 hover:bg-carte-2 hover:text-encre [&_svg]:size-4"
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
