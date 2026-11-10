import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/**
 * Stock (architecture, section G). Lecture par la vue `vue_stock` (réservée au personnel),
 * écriture uniquement par les fonctions SQL : chaque quantité modifiée laisse un mouvement.
 */

export type StatutStock = 'disponible' | 'bientot_epuise' | 'epuise'

export type LigneStock = {
  varianteId: string
  produitId: string
  produit: string
  libelle: string
  sku: string
  categorie: string
  publie: boolean
  seuilAlerte: number
  delaiApproJours: number | null
  stockSecuriteJours: number | null
  physique: number
  reserve: number
  disponible: number
  statut: StatutStock
  misAJourLe: string | null
}

export async function listerStock(): Promise<LigneStock[]> {
  const { data, error } = await supabase().from('vue_stock').select('*').order('produit')
  if (error) throw versErreurApp(error)
  return data.map((l) => ({
    varianteId: l.variante_id ?? '',
    produitId: l.produit_id ?? '',
    produit: l.produit ?? '',
    libelle: l.libelle ?? '',
    sku: l.sku ?? '',
    categorie: l.categorie ?? '',
    publie: l.publie ?? false,
    seuilAlerte: l.seuil_alerte ?? 0,
    delaiApproJours: l.delai_appro_jours,
    stockSecuriteJours: l.stock_securite_jours,
    physique: l.physique ?? 0,
    reserve: l.reserve ?? 0,
    disponible: l.disponible ?? 0,
    statut: (l.statut ?? 'epuise') as StatutStock,
    misAJourLe: l.mis_a_jour_le,
  }))
}

export type TypeMouvement =
  | 'entree'
  | 'reservation'
  | 'annulation_reservation'
  | 'vente'
  | 'retour'
  | 'perte'
  | 'correction'
  | 'transfert'
  | 'livraison'

export type Mouvement = {
  id: number
  type: TypeMouvement
  deltaPhysique: number
  deltaReserve: number
  motif: string | null
  referenceType: string | null
  referenceId: string | null
  le: string
  produit: string
  libelle: string
  auteur: string | null
  commande: string | null
}

type LigneMouvement = {
  id: number
  type: TypeMouvement
  delta_physique: number
  delta_reserve: number
  motif: string | null
  reference_type: string | null
  reference_id: string | null
  created_at: string
  auteur_id: string | null
  variante: { libelle: string; produit: { nom: string } }
}

/** Journal des mouvements (le plus récent d'abord), filtrable par variante et par type. */
export async function listerMouvements(filtre: {
  varianteId?: string | null
  type?: TypeMouvement | null
  limite?: number
}): Promise<Mouvement[]> {
  let requete = supabase()
    .from('mouvements_stock')
    .select(
      'id, type, delta_physique, delta_reserve, motif, reference_type, reference_id, created_at, auteur_id, variante:variantes!inner(libelle, produit:produits!inner(nom))',
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(filtre.limite ?? 150)
  if (filtre.varianteId) requete = requete.eq('variante_id', filtre.varianteId)
  if (filtre.type) requete = requete.eq('type', filtre.type)
  const { data, error } = await requete.overrideTypes<LigneMouvement[], { merge: false }>()
  if (error) throw versErreurApp(error)

  // Noms des auteurs et références des commandes, en deux lectures groupées.
  const auteurs = [...new Set(data.map((m) => m.auteur_id).filter((x): x is string => x !== null))]
  const commandes = [
    ...new Set(
      data
        .filter((m) => m.reference_type === 'commande' && m.reference_id)
        .map((m) => m.reference_id as string),
    ),
  ]
  const [profils, refs] = await Promise.all([
    auteurs.length
      ? supabase().from('profiles').select('id, nom').in('id', auteurs)
      : Promise.resolve({ data: [], error: null }),
    commandes.length
      ? supabase().from('commandes').select('id, reference').in('id', commandes)
      : Promise.resolve({ data: [], error: null }),
  ])
  const nomAuteur = new Map((profils.data ?? []).map((p) => [p.id, p.nom]))
  const refCommande = new Map((refs.data ?? []).map((c) => [c.id, c.reference]))

  return data.map((m) => ({
    id: m.id,
    type: m.type,
    deltaPhysique: m.delta_physique,
    deltaReserve: m.delta_reserve,
    motif: m.motif,
    referenceType: m.reference_type,
    referenceId: m.reference_id,
    le: m.created_at,
    produit: m.variante.produit.nom,
    libelle: m.variante.libelle,
    auteur: m.auteur_id ? (nomAuteur.get(m.auteur_id) ?? null) : null,
    commande: m.reference_id ? (refCommande.get(m.reference_id) ?? null) : null,
  }))
}

export type Fournisseur = {
  id: string
  nom: string
  telephone: string | null
  ville: string | null
  notes: string | null
}

export async function listerFournisseurs(): Promise<Fournisseur[]> {
  const { data, error } = await supabase()
    .from('fournisseurs')
    .select('id, nom, telephone, ville, notes')
    .is('archive_at', null)
    .order('nom')
  if (error) throw versErreurApp(error)
  return data
}

export async function enregistrerFournisseur(
  f: Omit<Fournisseur, 'id'> & { id?: string },
): Promise<void> {
  const valeurs = { nom: f.nom, telephone: f.telephone, ville: f.ville, notes: f.notes }
  const { error } = f.id
    ? await supabase().from('fournisseurs').update(valeurs).eq('id', f.id)
    : await supabase().from('fournisseurs').insert(valeurs)
  if (error) throw versErreurApp(error)
}

export type Reception = {
  id: string
  date: string
  fournisseur: string | null
  referenceFournisseur: string | null
  lignes: { produit: string; quantite: number; coutUnitaire: number | null }[]
}

export async function listerReceptions(): Promise<Reception[]> {
  const { data, error } = await supabase()
    .from('receptions')
    .select(
      'id, date_reception, reference_fournisseur, created_at, fournisseur:fournisseurs(nom), lignes:reception_lignes(quantite, cout_unitaire_fcfa, variante:variantes(libelle, produit:produits(nom)))',
    )
    .order('created_at', { ascending: false })
    .limit(50)
    .overrideTypes<
      {
        id: string
        date_reception: string
        reference_fournisseur: string | null
        fournisseur: { nom: string } | null
        lignes: {
          quantite: number
          cout_unitaire_fcfa: number | null
          variante: { libelle: string; produit: { nom: string } }
        }[]
      }[],
      { merge: false }
    >()
  if (error) throw versErreurApp(error)
  return data.map((r) => ({
    id: r.id,
    date: r.date_reception,
    fournisseur: r.fournisseur?.nom ?? null,
    referenceFournisseur: r.reference_fournisseur,
    lignes: r.lignes.map((l) => ({
      produit: l.variante.produit.nom,
      quantite: l.quantite,
      coutUnitaire: l.cout_unitaire_fcfa,
    })),
  }))
}

export const operationsStock = {
  async receptionner(r: {
    cle: string
    fournisseurId: string | null
    referenceFournisseur: string
    lignes: { varianteId: string; quantite: number; coutUnitaire: number | null }[]
  }): Promise<string> {
    const { data, error } = await supabase().rpc('receptionner', {
      p_reception: {
        cle_idempotence: r.cle,
        fournisseur_id: r.fournisseurId,
        reference_fournisseur: r.referenceFournisseur,
        lignes: r.lignes.map((l) => ({
          variante_id: l.varianteId,
          quantite: l.quantite,
          cout_unitaire_fcfa: l.coutUnitaire,
        })),
      },
    })
    if (error) throw versErreurApp(error)
    return data
  },
  async perte(varianteId: string, quantite: number, motif: string, cle: string): Promise<void> {
    const { error } = await supabase().rpc('declarer_perte', {
      p_variante_id: varianteId,
      p_quantite: quantite,
      p_motif: motif,
      p_cle_idempotence: cle,
    })
    if (error) throw versErreurApp(error)
  },
  async inventaire(
    varianteId: string,
    compte: number,
    motif: string,
    cle: string,
  ): Promise<number> {
    const { data, error } = await supabase().rpc('corriger_inventaire', {
      p_variante_id: varianteId,
      p_quantite_comptee: compte,
      p_motif: motif,
      p_cle_idempotence: cle,
    })
    if (error) throw versErreurApp(error)
    return data
  },
  async alertes(
    produitId: string,
    seuil: number,
    delaiAppro: number | null,
    securite: number | null,
  ): Promise<void> {
    const { error } = await supabase().rpc('regler_alertes_stock', {
      p_produit_id: produitId,
      p_seuil_alerte: seuil,
      // null = non renseigné : la fonction SQL l'accepte.
      p_delai_appro_jours: delaiAppro as number,
      p_stock_securite_jours: securite as number,
    })
    if (error) throw versErreurApp(error)
  },
  async retour(
    commandeId: string,
    lignes: { varianteId: string; quantite: number; revendable: boolean }[],
    motif: string,
  ): Promise<void> {
    const { error } = await supabase().rpc('retourner_commande', {
      p_id: commandeId,
      p_lignes: lignes.map((l) => ({
        variante_id: l.varianteId,
        quantite: l.quantite,
        revendable: l.revendable,
      })),
      p_motif: motif,
    })
    if (error) throw versErreurApp(error)
  },
}
