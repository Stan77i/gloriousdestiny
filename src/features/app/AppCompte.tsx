import { useState, useSyncExternalStore } from 'react'
import { Download, Heart, Share } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { lienProduit } from '@/features/catalogue/liens'
import { useProduits } from '@/features/catalogue/requetes'
import { lireEtat, type Suivi } from '@/features/notifications/cliente/memoire'
import { ReglagesSite } from '@/features/sons/ReglagesSite'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { classesCta } from './classes'
import { TitreEcran } from './elements'
import { basculerFavori, useFavoris } from './favoris'
import { estInstallee, estIphone, installer, useInstallable } from './installation'
import { PrixApp, VignetteProduit } from './produits'

function abonnerSuivis(f: () => void) {
  window.addEventListener('gd-notifications-cliente', f)
  return () => {
    window.removeEventListener('gd-notifications-cliente', f)
  }
}
let cache: { cle: string; valeur: Suivi[] } = { cle: '', valeur: [] }
function lireSuivis(): Suivi[] {
  const v = lireEtat().suivis.slice().reverse()
  const cle = JSON.stringify(v)
  if (cle !== cache.cle) cache = { cle, valeur: v }
  return cache.valeur
}

function ListeSuivis() {
  const suivis = useSyncExternalStore(abonnerSuivis, lireSuivis, () => [])
  if (suivis.length === 0) return null
  return (
    <section className="mt-5">
      <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-encre">
        Mes commandes et demandes
      </h2>
      <ul className="mt-2.5 flex flex-col gap-2">
        {suivis.map((s) => (
          <li key={s.reference}>
            <Link
              to={
                s.type === 'commande'
                  ? CHEMINS.suiviCommande(s.reference)
                  : CHEMINS.suiviRendezVous(s.reference)
              }
              className="flex min-h-14 items-center justify-between gap-3 rounded-[22px] bg-carte px-4 no-underline shadow-panneau"
            >
              <span className="text-[15px] font-semibold text-encre">
                {s.type === 'commande' ? 'Commande' : 'Rendez-vous'}
              </span>
              <span className="chiffres text-[14px] text-or-texte">{s.reference} →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Installer l'application : invite native (Android) ou geste à faire (iPhone). */
function Installer() {
  const installable = useInstallable()
  const [aide, setAide] = useState(false)
  if (estInstallee()) return null
  if (installable)
    return (
      <button type="button" className={`${classesCta('or')} mt-5`} onClick={() => void installer()}>
        <Download aria-hidden="true" className="size-5" />
        Installer l’application
      </button>
    )
  if (!estIphone()) return null
  return (
    <div className="mt-5 rounded-[22px] bg-carte p-4 shadow-panneau">
      <button
        type="button"
        aria-expanded={aide}
        onClick={() => {
          setAide(!aide)
        }}
        className="flex w-full items-center gap-2 text-left text-[15px] font-semibold text-encre"
      >
        <Download aria-hidden="true" className="size-5 text-or-texte" />
        Installer l’application sur l’iPhone
      </button>
      {aide && (
        <p className="mt-2 text-[14px] leading-relaxed text-encre-2">
          Dans Safari, touchez <Share aria-label="Partager" className="inline size-4" />{' '}
          <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>. L’icône GD
          apparaît avec vos autres applications.
        </p>
      )}
    </div>
  )
}

/**
 * « Mon compte » sans mot de passe : ce que la cliente a fait sur ce téléphone (commandes,
 * demandes, favoris), l'installation de l'application et ses réglages.
 */
export function AppCompte() {
  useTitreDocument('Mon compte')
  const favoris = useFavoris()
  const produits = useProduits()
  const mesFavoris = (produits.data ?? []).filter((p) => favoris.includes(p.id))

  return (
    <div>
      <TitreEcran retour>Mon compte</TitreEcran>
      <section className="rounded-[28px] bg-sable p-5">
        <p className="text-[24px] leading-tight font-semibold tracking-[-0.03em] text-encre">
          Vos commandes, vos rendez-vous, vos favoris.
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-encre-2">
          Pas de mot de passe : tout est gardé sur ce téléphone.
        </p>
      </section>
      <Installer />
      <ListeSuivis />

      <section className="mt-5">
        <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-encre">Favoris</h2>
        {mesFavoris.length === 0 ? (
          <p className="mt-2 text-[14px] text-encre-3">
            Touchez le cœur d’un produit pour le retrouver ici.
          </p>
        ) : (
          <ul className="-mx-4 mt-2.5 flex [scrollbar-width:none] gap-2.5 overflow-x-auto px-4 pb-2">
            {mesFavoris.map((p) => (
              <li key={p.id} className="relative w-[140px] shrink-0">
                <Link
                  to={lienProduit(p)}
                  className="block rounded-[22px] bg-carte p-2 no-underline shadow-panneau"
                >
                  <VignetteProduit produit={p} className="h-[120px] rounded-[16px]" />
                  <p className="mt-2 truncate px-1 text-[14px] font-semibold text-encre">{p.nom}</p>
                  <div className="px-1 pb-1">
                    <PrixApp produit={p} variante={p.variantes[0]} />
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label={`Retirer ${p.nom} des favoris`}
                  onClick={() => {
                    basculerFavori(p.id)
                  }}
                  className="absolute top-3.5 right-3.5 grid size-9 place-items-center rounded-full bg-carte text-or shadow-panneau"
                >
                  <Heart aria-hidden="true" className="size-4 fill-or" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-[22px] bg-carte p-4 shadow-panneau">
        <ReglagesSite />
      </section>
      <Link
        to={CHEMINS.connexion}
        className="mt-6 block text-center text-[13px] text-encre-3 no-underline"
      >
        Espace équipe
      </Link>
    </div>
  )
}

/** Suivre une commande : les références de ce téléphone, ou une référence saisie. */
export function AppSuivi() {
  useTitreDocument('Suivre ma commande')
  const naviguer = useNavigate()
  const [ref, setRef] = useState('')
  const propre = ref.trim().toUpperCase()
  return (
    <div>
      <TitreEcran retour>Suivre ma commande</TitreEcran>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (propre.length >= 4) void naviguer(CHEMINS.suiviCommande(propre))
        }}
        className="rounded-[28px] bg-sauge p-5"
      >
        <label htmlFor="ref" className="text-[15px] font-semibold text-encre">
          Référence de la commande
        </label>
        <input
          id="ref"
          value={ref}
          onChange={(e) => {
            setRef(e.target.value)
          }}
          placeholder="GD-…"
          autoCapitalize="characters"
          className="mt-2 min-h-12 w-full rounded-full bg-carte px-4 text-[16px] text-encre uppercase shadow-panneau outline-none focus:ring-2 focus:ring-or/60"
        />
        <p className="mt-2 text-[13px] text-encre-2">
          Elle figure dans votre message WhatsApp de confirmation.
        </p>
        <button
          type="submit"
          disabled={propre.length < 4}
          className={`${classesCta('encre')} mt-4 min-h-12`}
        >
          Suivre
        </button>
      </form>
      <ListeSuivis />
    </div>
  )
}
