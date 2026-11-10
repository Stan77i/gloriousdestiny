import { useState } from 'react'
import { Check, ChevronDown, ClipboardCopy, MessageCircle } from 'lucide-react'
import { Bouton } from '@/components/ui/Bouton'
import { classesBouton } from '@/components/ui/classesBouton'
import { useParametresPublics } from '@/features/catalogue/requetes'
import { signalerOuvertureWhatsapp, type ResumeCommande } from '@/services/commandes.service'
import { copierTexte } from './copier'
import { lienWhatsApp } from './lienWhatsApp'

/**
 * Dernière étape de la commande (architecture, section H) : la cliente envoie sur WhatsApp
 * le message rédigé par le serveur. Elle ne recopie jamais sa commande :
 * - numéro de la boutique connu : le message arrive pré-rempli dans WhatsApp ;
 * - lien court seulement : le message est copié au clic, il reste à le coller.
 */
export function EnvoiWhatsApp({ commande }: { commande: ResumeCommande }) {
  const parametres = useParametresPublics()
  const [copie, setCopie] = useState<'oui' | 'echec' | null>(null)
  const [ouvert, setOuvert] = useState(commande.message_whatsapp_ouvert_at !== null)
  const lien = lienWhatsApp(parametres.data, commande.message_whatsapp)
  const message = commande.message_whatsapp

  async function copier() {
    const ok = await copierTexte(message)
    setCopie(ok ? 'oui' : 'echec')
    return ok
  }

  function surOuverture() {
    // Le lien s'ouvre de lui-même (balise <a>) : rien ne bloque la navigation.
    if (lien && !lien.preRempli) void copier()
    setOuvert(true)
    signalerOuvertureWhatsapp(commande.reference, commande.cliente.telephone).catch(() => {
      // le suivi de l'ouverture est facultatif
    })
  }

  return (
    <section
      aria-labelledby="titre-envoi-whatsapp"
      className="flex flex-col gap-5 rounded-panneau border border-or/40 bg-surface-1 p-5 shadow-panneau sm:p-6"
    >
      <div>
        <h2 id="titre-envoi-whatsapp" className="text-[19px] font-semibold text-ivoire">
          {ouvert
            ? 'Votre commande est prête sur WhatsApp'
            : 'Dernière étape : envoyez votre commande'}
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ivoire-2">
          {!lien
            ? 'Copiez votre commande et envoyez-la à Glorious Destiny sur WhatsApp.'
            : lien.preRempli
              ? 'WhatsApp s’ouvre avec votre commande déjà écrite : il ne vous reste qu’à appuyer sur Envoyer.'
              : 'Votre commande sera copiée automatiquement. Dans WhatsApp, appuyez longuement dans la zone de message, choisissez « Coller », puis envoyez.'}
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
          Commande copiée : collez-la dans WhatsApp.
        </p>
      )}
      {copie === 'echec' && (
        <p role="alert" className="text-sm text-alerte">
          La copie automatique n’a pas fonctionné : sélectionnez le texte ci-dessous et copiez-le.
        </p>
      )}

      <details className="group rounded-[12px] border border-filet bg-noir/40" open={!lien}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm text-ivoire-2 hover:text-ivoire">
          Voir le message
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-ivoire-3 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-3 border-t border-filet px-4 py-4">
          <pre className="font-sans text-[14px] leading-relaxed whitespace-pre-wrap text-ivoire select-all">
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
