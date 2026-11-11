import { versErreurApp } from '@/lib/errors/versErreurApp'
import { estIndicatif, type Indicatif } from '@/lib/format/telephone'
import { supabase } from '@/services/supabase/client'

export type Ville = {
  id: number
  nom: string
  pays: string
  indicatif: Indicatif
  devise: string
}

export async function listerVilles(): Promise<Ville[]> {
  const { data, error } = await supabase()
    .from('villes')
    .select('id, nom, pays, indicatif, devise')
    .eq('actif', true)
    .order('ordre')
  if (error) throw versErreurApp(error)
  // Une ville dont l'indicatif n'est pas connu de l'interface n'est pas proposée.
  return data.filter((v): v is typeof v & { indicatif: Indicatif } => estIndicatif(v.indicatif))
}

export type ClienteListe = {
  id: string
  nom: string
  telephone: string
  email: string | null
  creeLe: string
  nbCommandes: number
  totalLivre: number
}

type LigneCliente = {
  id: string
  nom: string
  telephone: string
  email: string | null
  created_at: string
  notes_internes: string | null
  commandes: { statut: string; total_fcfa: number }[]
}

function versListe(l: LigneCliente): ClienteListe {
  return {
    id: l.id,
    nom: l.nom,
    telephone: l.telephone,
    email: l.email,
    creeLe: l.created_at,
    nbCommandes: l.commandes.filter((c) => c.statut !== 'annulee').length,
    totalLivre: l.commandes
      .filter((c) => c.statut === 'livree')
      .reduce((s, c) => s + c.total_fcfa, 0),
  }
}

export async function listerClientes(recherche?: string): Promise<ClienteListe[]> {
  let requete = supabase()
    .from('clientes')
    .select('id, nom, telephone, email, created_at, notes_internes, commandes(statut, total_fcfa)')
    .is('fusionnee_dans', null)
    .order('created_at', { ascending: false })
    .limit(200)
  const terme = recherche?.trim().replace(/[%,()]/g, '')
  if (terme) requete = requete.or(`nom.ilike.%${terme}%,telephone.ilike.%${terme}%`)
  const { data, error } = await requete.overrideTypes<LigneCliente[], { merge: false }>()
  if (error) throw versErreurApp(error)
  return data.map(versListe)
}

export type DetailCliente = ClienteListe & {
  notesInternes: string | null
  adresses: {
    id: string
    ville: string
    quartier: string
    adresse: string | null
    pointDeRepere: string
  }[]
}

export async function detailCliente(id: string): Promise<DetailCliente | null> {
  const { data, error } = await supabase()
    .from('clientes')
    .select(
      'id, nom, telephone, email, created_at, notes_internes, commandes(statut, total_fcfa), adresses:adresses_clientes(id, quartier, adresse, point_de_repere, ville:villes(nom))',
    )
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<
      | (LigneCliente & {
          adresses: {
            id: string
            quartier: string
            adresse: string | null
            point_de_repere: string
            ville: { nom: string }
          }[]
        })
      | null,
      { merge: false }
    >()
  if (error) throw versErreurApp(error)
  if (!data) return null
  return {
    ...versListe(data),
    notesInternes: data.notes_internes,
    adresses: data.adresses.map((a) => ({
      id: a.id,
      ville: a.ville.nom,
      quartier: a.quartier,
      adresse: a.adresse,
      pointDeRepere: a.point_de_repere,
    })),
  }
}

export async function annoterCliente(id: string, notes: string): Promise<void> {
  const { error } = await supabase().rpc('annoter_cliente', { p_id: id, p_notes: notes })
  if (error) throw versErreurApp(error)
}
