import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { usePrestations } from '@/features/catalogue/prestations'
import { useParametresPublics, useProduits } from '@/features/catalogue/requetes'
import { lienWhatsApp } from '@/features/whatsapp/lienWhatsApp'
import { useMouvementReduit } from '@/hooks/useMouvementReduit'
import { cx } from '@/lib/cx'
import { jouer } from '@/features/sons/sons'
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

  // Bruit de clavier discret pendant que le « G » écrit, puis un petit son quand la phrase arrive.
  useEffect(() => {
    if (rang === null || ecrit) return
    jouer('bulle')
    let t = 0
    const frappe = () => {
      jouer('touche')
      t = window.setTimeout(frappe, 70 + Math.random() * 110)
    }
    t = window.setTimeout(frappe, 180)
    return () => {
      window.clearTimeout(t)
    }
  }, [rang, ecrit])

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

  // Pendant qu'elle « parle », la maison fait briller son logo.
  useEffect(() => {
    if (!msg) return
    document.documentElement.dataset['parle'] = 'oui'
    return () => {
      delete document.documentElement.dataset['parle']
    }
  }, [msg])
  if (!msg) return null

  const fermer = () => {
    ecrire({ ...lire(), ferme: true })
    setRang(null)
  }

  const classeLien =
    'mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold text-or-texte no-underline hover:text-or [&_svg]:size-3.5'

  return (
    <aside
      aria-label="Message de Glorious Destiny"
      onMouseEnter={() => {
        setSurvol(true)
      }}
      onMouseLeave={() => {
        setSurvol(false)
      }}
      className="bulle-conversation fixed top-[5.15rem] left-[22px] z-30 lg:left-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))]"
    >
      {/* Bulle qui sort du « G » : coin pointu vers le logo, liseré de lumière qui tourne. */}
      <div
        className={cx(
          'bulle-cadre relative overflow-hidden rounded-[22px] rounded-tl-[6px] p-[1.5px] shadow-[0_14px_40px_-12px_rgb(214_167_86/0.55)] transition-[width] duration-500',
          ecrit ? 'w-[min(256px,calc(100vw-44px))]' : 'w-[66px]',
        )}
      >
        <span aria-hidden="true" className="bulle-lumiere absolute inset-[-60%]" />
        <div className="relative rounded-[20.5px] rounded-tl-[4.5px] bg-carte/95 px-3.5 py-2.5 backdrop-blur-md">
          {ecrit ? (
            <div className="apparait-fondu pr-5" aria-live="polite">
              <p className="text-[13px] leading-snug text-encre">{msg.texte}</p>
              {msg.lien &&
                (msg.lien.externe ? (
                  <a
                    href={msg.lien.vers}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classeLien}
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
                    className={classeLien}
                  >
                    {msg.lien.libelle}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
            </div>
          ) : (
            <span aria-label="Glorious Destiny écrit…" className="flex justify-center gap-1 py-1">
              <span className="guide-point size-1.5 rounded-full bg-or" />
              <span className="guide-point size-1.5 rounded-full bg-or [animation-delay:150ms]" />
              <span className="guide-point size-1.5 rounded-full bg-or [animation-delay:300ms]" />
            </span>
          )}
          {ecrit && (
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer ce message"
              className="absolute top-1 right-1 grid size-7 place-items-center rounded-full text-encre-3 hover:bg-carte-2 hover:text-encre [&_svg]:size-3.5"
            >
              <X aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
