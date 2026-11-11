import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Alerte } from '@/components/ui/Alerte'
import { Bouton } from '@/components/ui/Bouton'
import { Interrupteur } from '@/components/ui/Champs'
import { Squelette } from '@/components/ui/Chargeur'
import { Modale } from '@/components/ui/Modale'
import { aRole, type Role } from '@/domain/roles'
import { cx } from '@/lib/cx'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { formaterDateHeure } from '@/lib/format/date'
import {
  LIBELLE_TYPE,
  TYPES_NOTIFICATION,
  type TypeNotification,
} from '@/services/notifications.service'
import {
  alerteNavigateurActive,
  activerAlerteNavigateur,
  afficherAlerteNavigateur,
} from './navigateur'
import {
  useEnregistrerPreferences,
  useMarquerLues,
  useMesNotifications,
  usePreferencesNotifications,
} from './requetes'

/** Types de notification qui concernent un rôle (owner et admin : tous). */
function typesDuRole(role: Role | null): TypeNotification[] {
  const ventes: TypeNotification[] = [
    'commande_nouvelle',
    'commande_attente',
    'rdv_nouveau',
    'rdv_rappels',
    'retour_stock',
    'alerte_stock_demandee',
  ]
  const stock: TypeNotification[] = ['stock_bas', 'stock_epuise']
  return TYPES_NOTIFICATION.filter(
    (t) =>
      (ventes.includes(t) && aRole(role, ['ventes'])) ||
      (stock.includes(t) && aRole(role, ['stock'])),
  )
}

function Preferences({ role }: { role: Role | null }) {
  const prefs = usePreferencesNotifications()
  const enregistrer = useEnregistrerPreferences()
  const [navigateur, setNavigateur] = useState(alerteNavigateurActive)
  const types = typesDuRole(role)
  if (prefs.isPending) return <Squelette className="h-32 w-full" />
  const coupes = prefs.data ?? []
  return (
    <section className="flex flex-col gap-1 border-t border-filet pt-5">
      <h3 className="text-[15px] font-semibold">Ce que je reçois</h3>
      {types.map((t) => (
        <Interrupteur
          key={t}
          libelle={LIBELLE_TYPE[t]}
          checked={!coupes.includes(t)}
          disabled={enregistrer.isPending}
          onChange={(e) => {
            enregistrer.mutate(e.target.checked ? coupes.filter((c) => c !== t) : [...coupes, t])
          }}
        />
      ))}
      <Interrupteur
        libelle="Alerte du navigateur pour chaque nouveauté (sur cet appareil)"
        checked={navigateur}
        onChange={(e) => {
          void activerAlerteNavigateur(e.target.checked).then(setNavigateur)
        }}
      />
      {enregistrer.isError && (
        <Alerte ton="danger" titre={versErreurApp(enregistrer.error).message} />
      )}
    </section>
  )
}

/** Cloche de l'équipe : notifications créées par la base, lu / non lu par personne, préférences. */
export function CentreEquipe({ role }: { role: Role | null }) {
  const [ouvert, setOuvert] = useState(false)
  const boite = useMesNotifications()
  const lues = useMarquerLues()
  const naviguer = useNavigate()
  const dejaVues = useRef<Set<number> | null>(null)
  const nonLues = boite.data?.non_lues ?? 0

  // Alerte navigateur pour les nouvelles notifications apparues depuis l'ouverture de la page.
  useEffect(() => {
    if (!boite.data) return
    const ids = boite.data.liste.map((n) => n.id)
    if (dejaVues.current === null) {
      dejaVues.current = new Set(ids)
      return
    }
    for (const n of boite.data.liste) {
      if (!n.lue && !dejaVues.current.has(n.id)) afficherAlerteNavigateur(n.titre, n.corps)
      dejaVues.current.add(n.id)
    }
  }, [boite.data])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOuvert(true)
        }}
        aria-label={nonLues > 0 ? `Notifications, ${String(nonLues)} non lues` : 'Notifications'}
        className="relative grid size-11 place-items-center rounded-full bg-carte text-encre-2 shadow-panneau transition-colors hover:text-encre [&_svg]:size-[18px]"
      >
        <Bell aria-hidden="true" />
        {nonLues > 0 && (
          <span className="chiffres absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-or px-1 text-[11px] leading-5 font-bold text-sur-or">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>
      <Modale
        ouverte={ouvert}
        forme="tiroir"
        onFermer={() => {
          setOuvert(false)
        }}
        titre="Notifications"
        description="Créées par le système quand il se passe quelque chose : commande, rendez-vous, stock."
        pied={
          <Bouton
            variante="secondaire"
            icone={<CheckCheck />}
            disabled={nonLues === 0}
            enCours={lues.isPending}
            onClick={() => {
              lues.mutate(null)
            }}
          >
            Tout marquer comme lu
          </Bouton>
        }
      >
        <div className="flex flex-col gap-5">
          {boite.isError ? (
            <Alerte ton="danger" titre={versErreurApp(boite.error).message} />
          ) : boite.isPending ? (
            <Squelette className="h-48 w-full" />
          ) : boite.data.liste.length === 0 ? (
            <p className="text-sm text-encre-3">
              Aucune notification pour l’instant. Elles apparaîtront à la première commande, au
              premier rendez-vous ou à la première alerte de stock.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {boite.data.liste.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.lue) lues.mutate([n.id])
                      if (n.lien) {
                        setOuvert(false)
                        void naviguer(n.lien)
                      }
                    }}
                    className={cx(
                      'flex w-full gap-3 rounded-[16px] p-3 text-left transition-colors hover:bg-carte-2',
                      !n.lue && 'bg-or-doux',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        n.lue ? 'bg-transparent' : 'bg-or',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">
                        {n.titre}
                        {!n.lue && <span className="sr-only"> (non lue)</span>}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-encre-2">
                        {n.corps}
                      </span>
                      <span className="mt-1 block text-[12px] text-encre-3">
                        {formaterDateHeure(n.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Preferences role={role} />
        </div>
      </Modale>
    </>
  )
}
