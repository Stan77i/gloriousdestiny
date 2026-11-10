import { useState } from 'react'
import { Check, ChevronDown, ClipboardCopy, MessageCircle } from 'lucide-react'
import { Bouton } from '@/components/ui/Bouton'
import { classesBouton } from '@/components/ui/classesBouton'
import { useParametresPublics } from '@/features/catalogue/requetes'
import { copierTexte } from './copier'
import { lienWhatsApp } from './lienWhatsApp'

/**
 * Dernière étape d'une commande ou d'une réservation (architecture, section H) : la cliente
 * envoie sur WhatsApp le message rédigé par le serveur. Elle ne recopie jamais rien :
 * - numéro de la boutique connu : le message arrive pré-rempli dans WhatsApp ;
 * - lien court seulement : le message est copié au clic, il reste à le coller.
 */
const MOTS = {
  commande: {
    objet: 'commande',
    la: 'votre commande',
    La: 'Votre commande',
    copiee: 'Commande copiée',
  },
  'rendez-vous': {
    objet: 'rendez-vous',
    la: 'votre rendez-vous',
    La: 'Votre rendez-vous',
    copiee: 'Message copié',
  },
} as const

export function EnvoiWhatsApp({
  objet,
  message,
  dejaOuvert,
  onOuverture,
}: {
  objet: keyof typeof MOTS
  message: string
  dejaOuvert: boolean
  /** Trace l'ouverture côté serveur (facultatif : un échec n'empêche rien). */
  onOuverture: () => Promise<unknown>
}) {
  const parametres = useParametresPublics()
  const [copie, setCopie] = useState<'oui' | 'echec' | null>(null)
  const [ouvert, setOuvert] = useState(dejaOuvert)
  const lien = lienWhatsApp(parametres.data, message)
  const m = MOTS[objet]

  async function copier() {
    const ok = await copierTexte(message)
    setCopie(ok ? 'oui' : 'echec')
    return ok
  }

  function surOuverture() {
    // Le lien s'ouvre de lui-même (balise <a>) : rien ne bloque la navigation.
    if (lien && !lien.preRempli) void copier()
    setOuvert(true)
    onOuverture().catch(() => {
      // le suivi de l'ouverture est facultatif
    })
  }

  return (
    <section
      aria-labelledby="titre-envoi-whatsapp"
      className="flex flex-col gap-5 rounded-panneau bg-carte p-5 shadow-panneau ring-2 ring-or/50 sm:p-6"
    >
      <div>
        <h2 id="titre-envoi-whatsapp" className="text-[19px] font-semibold text-encre">
          {ouvert
            ? `${m.La} est prêt${objet === 'commande' ? 'e' : ''} sur WhatsApp`
            : `Dernière étape : envoyez ${m.la}`}
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-encre-2">
          {!lien
            ? `Copiez le message et envoyez-le à Glorious Destiny sur WhatsApp.`
            : lien.preRempli
              ? `WhatsApp s’ouvre avec ${m.la} déjà écrit${objet === 'commande' ? 'e' : ''} : il ne vous reste qu’à appuyer sur Envoyer.`
              : 'Le message sera copié automatiquement. Dans WhatsApp, appuyez longuement dans la zone de message, choisissez « Coller », puis envoyez.'}
        </p>
      </div>

      {lien && (
        <a
          href={lien.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={surOuverture}
          className={classesBouton(
            'principal',
            'grand',
            'w-full no-underline sm:w-auto sm:self-start',
          )}
        >
          <MessageCircle aria-hidden="true" />
          {ouvert ? 'Rouvrir WhatsApp' : 'Envoyer sur WhatsApp'}
        </a>
      )}

      {copie === 'oui' && (
        <p role="status" className="flex items-center gap-2 text-sm text-succes [&_svg]:size-4">
          <Check aria-hidden="true" />
          {m.copiee} : collez-le dans WhatsApp.
        </p>
      )}
      {copie === 'echec' && (
        <p role="alert" className="text-sm text-alerte">
          La copie automatique n’a pas fonctionné : sélectionnez le texte ci-dessous et copiez-le.
        </p>
      )}

      <details className="group rounded-[18px] border border-filet bg-fond/40" open={!lien}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm text-encre-2 hover:text-encre">
          Voir le message
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-encre-3 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-3 border-t border-filet px-4 py-4">
          <pre className="font-sans text-[15px] leading-relaxed whitespace-pre-wrap text-encre select-all">
            {message}
          </pre>
          <Bouton
            variante="secondaire"
            taille="petit"
            icone={<ClipboardCopy />}
            className="self-start"
            onClick={() => void copier()}
          >
            Copier le message
          </Bouton>
        </div>
      </details>
    </section>
  )
}
