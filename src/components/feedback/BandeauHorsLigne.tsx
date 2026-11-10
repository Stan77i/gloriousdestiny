import { useEnLigne } from '@/hooks/useEnLigne'

/** Bandeau affiché quand le réseau est coupé : commander ou réserver exige une connexion. */
export function BandeauHorsLigne() {
  const enLigne = useEnLigne()
  if (enLigne) return null
  return (
    <div role="status" className="bg-or px-4 py-2 text-center text-sm text-noir">
      Vous êtes hors ligne. Les commandes et réservations reprendront dès le retour du réseau.
    </div>
  )
}
