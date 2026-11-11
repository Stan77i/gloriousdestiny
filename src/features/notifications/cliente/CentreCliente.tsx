import { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Bouton } from '@/components/ui/Bouton'
import { Interrupteur } from '@/components/ui/Champs'
import { Modale } from '@/components/ui/Modale'
import { cx } from '@/lib/cx'
import { activerAlerteNavigateur, alerteNavigateurActive } from '../navigateur'
import { basculerType, marquerLues, toutOublier, TYPES_CLIENTE, type TypeCliente } from './memoire'
import { useNotificationsCliente } from './useNotificationsCliente'

const LIBELLES: Record<TypeCliente, string> = {
  commande: 'Suivi de mes commandes',
  rdv: 'Mes rendez-vous (confirmation, rappel la veille)',
  stock: 'Retour en stock des articles attendus',
  nouveaute: 'Nouveaux produits',
  panier: 'Rappel de mon panier (une fois)',
}

/** Cloche du site public : notifications de la visiteuse, calculées à partir de ses données. */
export function CentreCliente() {
  const [ouvert, setOuvert] = useState(false)
  const [navigateur, setNavigateur] = useState(alerteNavigateurActive)
  const { toutes, nonLues, etat } = useNotificationsCliente()
  const naviguer = useNavigate()
  const nb = nonLues.length

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOuvert(true)
        }}
        aria-label={nb > 0 ? `Notifications, ${String(nb)} non lues` : 'Notifications'}
        className="relative grid size-11 place-items-center rounded-full bg-carte text-encre shadow-panneau transition-colors duration-300 hover:bg-carte-2 [&_svg]:size-[18px]"
      >
        <Bell aria-hidden="true" />
        {nb > 0 && (
          <span
            aria-hidden="true"
            className="chiffres absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-or px-1 text-[11px] font-bold text-sur-or"
          >
            {nb > 9 ? '9+' : nb}
          </span>
        )}
      </button>
      <Modale
        ouverte={ouvert}
        forme="tiroir"
        onFermer={() => {
          setOuvert(false)
        }}
        titre="Vos notifications"
        description="Vos commandes, vos rendez-vous et les articles que vous attendez. Gardé sur cet appareil uniquement."
        pied={
          <Bouton
            variante="secondaire"
            icone={<CheckCheck />}
            disabled={nb === 0}
            onClick={() => {
              marquerLues(nonLues.map((n) => n.cle))
            }}
          >
            Tout marquer comme lu
          </Bouton>
        }
      >
        <div className="flex flex-col gap-6">
          {toutes.length === 0 ? (
            <p className="text-sm leading-relaxed text-encre-2">
              Rien pour l’instant. Après une commande ou une réservation, vous verrez ici chaque
              étape. Sur un article épuisé, « Prévenez-moi » vous signale son retour.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {toutes.map((n) => {
                const lue = etat.lues.includes(n.cle)
                return (
                  <li key={n.cle}>
                    <button
                      type="button"
                      onClick={() => {
                        marquerLues([n.cle])
                        setOuvert(false)
                        void naviguer(n.lien)
                      }}
                      className={cx(
                        'flex w-full gap-3 rounded-[16px] p-3 text-left transition-colors hover:bg-carte-2',
                        !lue && 'bg-or-doux',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          'mt-1.5 size-2 shrink-0 rounded-full',
                          lue ? 'bg-transparent' : 'bg-or',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold">
                          {n.titre}
                          {!lue && <span className="sr-only"> (non lue)</span>}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-encre-2">
                          {n.corps}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <section className="flex flex-col gap-1 border-t border-filet pt-5">
            <h3 className="text-[15px] font-semibold">Ce que je veux recevoir</h3>
            {TYPES_CLIENTE.map((t) => (
              <Interrupteur
                key={t}
                libelle={LIBELLES[t]}
                checked={!etat.coupes.includes(t)}
                onChange={(e) => {
                  basculerType(t, e.target.checked)
                }}
              />
            ))}
            <Interrupteur
              libelle="Alerte du navigateur (2 au plus par visite, jamais la nuit)"
              checked={navigateur}
              onChange={(e) => {
                void activerAlerteNavigateur(e.target.checked).then(setNavigateur)
              }}
            />
            <Bouton
              variante="fantome"
              taille="petit"
              className="mt-2 self-start"
              onClick={() => {
                toutOublier()
              }}
            >
              Oublier mes suivis sur cet appareil
            </Bouton>
          </section>
        </div>
      </Modale>
    </>
  )
}
