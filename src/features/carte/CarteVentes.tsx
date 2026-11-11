import { EtatErreur } from '@/components/ui/Etats'
import { Squelette } from '@/components/ui/Chargeur'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { CarteActivite } from './CarteActivite'
import { useCarte } from './requetes'

/** Carte des ventes du tableau de bord, sur la période choisie. */
export function CarteVentes({ du, au }: { du: string; au: string }) {
  const carte = useCarte(du, au)
  return (
    <section id="carte-des-ventes" className="rounded-[26px] bg-carte p-5 shadow-panneau sm:p-6">
      <header className="mb-4">
        <h2 className="text-[17px] font-semibold">Carte des ventes</h2>
        <p className="mt-0.5 text-[13px] text-encre-3">
          Monde, pays, ville, quartier : commandes reçues et chiffre d’affaires de la période
        </p>
      </header>
      {carte.isError ? (
        <EtatErreur
          message={versErreurApp(carte.error).message}
          onReessayer={() => void carte.refetch()}
        />
      ) : carte.isPending ? (
        <Squelette className="h-80 w-full rounded-[22px]" />
      ) : (
        <CarteActivite carte={carte.data} majLe={carte.dataUpdatedAt} />
      )}
    </section>
  )
}
