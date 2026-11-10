import { useQuery } from '@tanstack/react-query'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { lireParametresPublics } from '@/services/parametres.service'

/**
 * Accueil provisoire (Phase 2) : aucune donnée inventée. Le lien WhatsApp vient
 * de la table `parametres`. La vraie page d'accueil est construite en Phase 4.
 */
export function PageAccueil() {
  useTitreDocument()
  const parametres = useQuery({
    queryKey: ['parametres', 'publics'],
    queryFn: lireParametresPublics,
  })
  const lienWhatsApp = parametres.data?.whatsapp_lien

  return (
    <section className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col items-center justify-center gap-8 px-4 text-center">
      <p className="text-xs tracking-[0.4em] text-or uppercase">Perruques · Cils · Soins</p>
      <h1 className="text-4xl font-light tracking-[0.2em] uppercase sm:text-5xl">
        Glorious Destiny
      </h1>
      <p className="max-w-md text-ivoire/70">Notre boutique en ligne est en préparation.</p>
      {lienWhatsApp && (
        <a
          href={lienWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center border border-or px-6 text-sm tracking-wide text-or transition-colors hover:bg-or hover:text-noir"
        >
          Nous écrire sur WhatsApp
        </a>
      )}
    </section>
  )
}
