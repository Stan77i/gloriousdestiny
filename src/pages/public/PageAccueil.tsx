import { useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { VeineOr } from '@/components/marque/VeineOr'
import { classesBouton } from '@/components/ui/classesBouton'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { lireParametresPublics } from '@/services/parametres.service'

/**
 * Accueil provisoire : aucune donnée inventée. Le lien WhatsApp vient
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
    <section className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="titre-affiche text-[56px] text-ivoire sm:text-[88px]">Glorious Destiny</h1>
      <VeineOr className="mt-6 max-w-sm" />
      <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ivoire-2">
        Perruques, pose de cils et produits professionnels. Notre boutique en ligne est en
        préparation.
      </p>
      {lienWhatsApp && (
        <a
          href={lienWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className={classesBouton('principal', 'grand', 'mt-10 no-underline')}
        >
          <MessageCircle aria-hidden="true" />
          Nous écrire sur WhatsApp
        </a>
      )}
    </section>
  )
}
