import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bloquerCreneau,
  creneauxReport,
  listerBlocages,
  marquerRappelEnvoye,
  rappelsAEnvoyer,
  reprogrammerRendezVous,
  retirerBlocage,
  actionRendezVous,
  annulerRendezVousCliente,
  compterDemandes,
  fermerJournee,
  listerCreneaux,
  listerFermetures,
  listerRendezVous,
  reserverRendezVous,
  rouvrirJournee,
  suivreRendezVous,
  type ActionRdv,
} from '@/services/rendezvous.service'

/** Créneaux libres : relus chaque minute (une autre cliente peut réserver entre-temps). */
export function useCreneaux(serviceId: string | null, du: string, au: string) {
  return useQuery({
    queryKey: ['creneaux', serviceId, du, au],
    queryFn: () => listerCreneaux(serviceId ?? '', du, au),
    enabled: serviceId !== null,
    refetchInterval: 60_000,
  })
}

export function useReservation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: reserverRendezVous,
    // Réussite ou créneau pris : la grille doit refléter l'état réel.
    onSettled: () => client.invalidateQueries({ queryKey: ['creneaux'] }),
  })
}

export function useSuiviRendezVous(reference: string, telephone: string | null) {
  return useQuery({
    queryKey: ['suivi-rdv', reference, telephone],
    queryFn: () => suivreRendezVous(reference, telephone ?? ''),
    enabled: telephone !== null,
  })
}

export function useAnnulationCliente(reference: string, telephone: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => annulerRendezVousCliente(reference, telephone),
    onSuccess: (r) => {
      client.setQueryData(['suivi-rdv', reference, telephone], r)
      void client.invalidateQueries({ queryKey: ['creneaux'] })
    },
  })
}

// Équipe

export function useAgenda(du: string, au: string) {
  return useQuery({
    queryKey: ['admin', 'rendez-vous', du, au],
    queryFn: () => listerRendezVous(du, au),
    refetchInterval: 60_000,
  })
}

export function useDemandesRdv() {
  return useQuery({
    queryKey: ['admin', 'rdv-demandes'],
    queryFn: compterDemandes,
    refetchInterval: 60_000,
  })
}

export function useFermetures(depuis: string) {
  return useQuery({
    queryKey: ['admin', 'fermetures', depuis],
    queryFn: () => listerFermetures(depuis),
  })
}

function useInvalider() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['admin'] }),
      client.invalidateQueries({ queryKey: ['creneaux'] }),
    ])
}

export function useActionRendezVous() {
  const invalider = useInvalider()
  return useMutation({ mutationFn: (a: ActionRdv) => actionRendezVous(a), onSettled: invalider })
}

export function useFermeture() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (
      f: { type: 'fermer'; date: string; motif: string } | { type: 'rouvrir'; date: string },
    ) => (f.type === 'fermer' ? fermerJournee(f.date, f.motif) : rouvrirJournee(f.date)),
    onSettled: invalider,
  })
}

export function useBlocages(du: string, au: string) {
  return useQuery({
    queryKey: ['admin', 'blocages', du, au],
    queryFn: () => listerBlocages(du, au),
  })
}

export function useBlocage() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (
      b:
        | { type: 'bloquer'; debut: string; fin: string; motif: string }
        | { type: 'retirer'; id: string },
    ) => (b.type === 'bloquer' ? bloquerCreneau(b.debut, b.fin, b.motif) : retirerBlocage(b.id)),
    onSettled: invalider,
  })
}

export function useCreneauxReport(id: string, jour: string) {
  return useQuery({
    queryKey: ['admin', 'creneaux-report', id, jour],
    queryFn: () => creneauxReport(id, jour),
    enabled: jour !== '',
  })
}

export function useReport() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (r: { id: string; debut: string; motif: string }) =>
      reprogrammerRendezVous(r.id, r.debut, r.motif),
    onSettled: invalider,
  })
}

export function useRappels() {
  return useQuery({
    queryKey: ['admin', 'rappels'],
    queryFn: rappelsAEnvoyer,
    refetchInterval: 5 * 60_000,
  })
}

export function useRappelEnvoye() {
  const invalider = useInvalider()
  return useMutation({ mutationFn: (id: string) => marquerRappelEnvoye(id), onSettled: invalider })
}
