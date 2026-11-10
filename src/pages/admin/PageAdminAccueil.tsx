import { useQuery } from '@tanstack/react-query'
import { EtatChargement, EtatErreur } from '@/components/ui/Etats'
import { useTitreDocument } from '@/hooks/useTitreDocument'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { verifierConnexionBase } from '@/services/supabase/sante'

/**
 * Accueil admin provisoire (Phase 2) : vérifie la liaison avec la base.
 * Le tableau de bord réel (chiffres, alertes) est construit en Phase 10.
 */
export function PageAdminAccueil() {
  useTitreDocument('Administration')
  const sante = useQuery({ queryKey: ['sante-base'], queryFn: verifierConnexionBase })

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-light tracking-[0.15em] uppercase">Administration</h1>
      <div className="border border-ivoire/10 bg-noir p-6">
        <h2 className="text-sm tracking-widest text-or uppercase">État du système</h2>
        {sante.isPending && <EtatChargement libelle="Vérification de la base…" />}
        {sante.isError && (
          <EtatErreur
            message={versErreurApp(sante.error).message}
            onReessayer={() => void sante.refetch()}
          />
        )}
        {sante.isSuccess && (
          <p className="mt-3 text-sm text-ivoire/80">
            Base de données joignable · {sante.data.villes} villes desservies configurées.
          </p>
        )}
      </div>
    </section>
  )
}
