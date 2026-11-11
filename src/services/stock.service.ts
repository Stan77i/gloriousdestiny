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
  categorieId: string
  prix: number
  /** Ventes nettes des retours (mouvements « vente » à l'expédition). */
  vendus: number
  vendus30j: number
  /** Verrou : calculé par le serveur (5 minutes après la dernière modification manuelle). */
  modifieLe: string | null
  modifiePar: string | null
  modifiableJusqua: string | null
  verrouille: boolean
  secondesRestantes: number
}

export async function listerStock(): Promise<LigneStock[]> {
  const { data, error } = await supabase().from('vue_stock').select('*').order('produit')
  if (error) throw versErreurApp(error)
  const auteurs = [...new Set(data.map((l) => l.modifie_par).filter((x): x is string => !!x))]
  const profils = auteurs.length
    ? await supabase().from('profiles').select('id, nom').in('id', auteurs)
    : { data: [] as { id: string; nom: string }[] }
  const nom = new Map((profils.data ?? []).map((p) => [p.id, p.nom]))
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
    categorieId: l.categorie_id ?? '',
    prix: l.prix_fcfa ?? 0,
    vendus: l.vendus ?? 0,
    vendus30j: l.vendus_30j ?? 0,
    modifieLe: l.modifie_at,
    modifiePar: l.modifie_par ? (nom.get(l.modifie_par) ?? 'Compte inconnu') : null,
    modifiableJusqua: l.modifiable_jusqu_a,
    verrouille: l.verrouille ?? false,
    secondesRestantes: l.secondes_restantes ?? 0,
  }))
}

export type Categorie = {
  id: string
  nom: string
  type: 'perruque' | 'cils' | 'produit' | 'service'
}

export async function listerCategories(): Promise<Categorie[]> {
  const { data, error } = await supabase()
    .from('categories')
    .select('id, nom, type')
    .neq('type', 'service')
    .order('ordre')
  if (error) throw versErreurApp(error)
  return data as Categorie[]
}

export type Deverrouillage = { id: number; motif: string; le: string; auteur: string | null }

export async function listerDeverrouillages(varianteId: string): Promise<Deverrouillage[]> {
  const { data, error } = await supabase()
    .from('deverrouillages_stock')
    .select('id, motif, created_at, auteur_id')
    .eq('variante_id', varianteId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw versErreurApp(error)
  const auteurs = [...new Set(data.map((d) => d.auteur_id).filter((x): x is string => !!x))]
  const profils = auteurs.length
    ? await supabase().from('profiles').select('id, nom').in('id', auteurs)
    : { data: [] as { id: string; nom: string }[] }
  const nom = new Map((profils.data ?? []).map((p) => [p.id, p.nom]))
  return data.map((d) => ({
    id: d.id,
    motif: d.motif,
    le: d.created_at,
    auteur: d.auteur_id ? (nom.get(d.auteur_id) ?? null) : null,
  }))
}

export type Reglage = {
  le: string
  auteur: string | null
  champ: string
  ancien: string | null
  nouveau: string | null
}

/** Changements de réglages d'un article (nom, catégorie, unité, seuil, prix, publication). */
export async function listerReglages(varianteId: string): Promise<Reglage[]> {
  const { data, error } = await supabase().rpc('historique_reglages', {
    p_variante_id: varianteId,
  })
  if (error) throw versErreurApp(error)
  return data as Reglage[]
}

type LigneTableau = {
  id: number
  article: string
  quantite: number
  physique_avant?: number | null
  physique_apres: number | null
  created_at: string
  auteur: string | null
  motif: string | null
  type?: string
}

export type TableauStock = {
  articles: number
  disponibles: number
  stockFaible: number
  ruptures: number
  physiqueTotal: number
  reserveTotal: number
  dernieresEntrees: LigneTableau[]
  dernieresCorrections: LigneTableau[]
  plusVendus: { variante_id: string; article: string; quantite: number }[]
  dormants: {
    variante_id: string
    article: string
    physique: number
    derniere_vente: string | null
  }[]
}

export async function chargerTableauStock(): Promise<TableauStock> {
  const { data, error } = await supabase().rpc('tableau_stock')
  if (error) throw versErreurApp(error)
  const t = data as {
    articles: number
    disponibles: number
    stock_faible: number
    ruptures: number
    physique_total: number
    reserve_total: number
    dernieres_entrees: LigneTableau[]
    dernieres_corrections: LigneTableau[]
    plus_vendus: TableauStock['plusVendus']
    dormants: TableauStock['dormants']
  }
  return {
    articles: t.articles,
    disponibles: t.disponibles,
    stockFaible: t.stock_faible,
    ruptures: t.ruptures,
    physiqueTotal: t.physique_total,
    reserveTotal: t.reserve_total,
    dernieresEntrees: t.dernieres_entrees,
    dernieresCorrections: t.dernieres_corrections,
    plusVendus: t.plus_vendus,
    dormants: t.dormants,
  }
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
  avant: number | null
  apres: number | null
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
  physique_avant: number | null
  physique_apres: number | null
  variante: { libelle: string; produit: { nom: string } }
}

/** Journal des mouvements (le plus récent d'abord), filtrable par article, type, catégorie et période. */
export async function listerMouvements(filtre: {
  varianteId?: string | null
  type?: TypeMouvement | null
  categorieId?: string | null
  du?: string | null
  au?: string | null
  limite?: number
}): Promise<Mouvement[]> {
  let requete = supabase()
    .from('mouvements_stock')
    .select(
      'id, type, delta_physique, delta_reserve, motif, reference_type, reference_id, created_at, auteur_id, physique_avant, physique_apres, variante:variantes!inner(libelle, produit:produits!inner(nom, categorie_id))',
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(filtre.limite ?? 150)
  if (filtre.varianteId) requete = requete.eq('variante_id', filtre.varianteId)
  if (filtre.type) requete = requete.eq('type', filtre.type)
  if (filtre.categorieId) requete = requete.eq('variante.produit.categorie_id', filtre.categorieId)
  // Période en heure du salon (UTC+1, sans heure d'été) : du 00:00 au 23:59:59 inclus.
  if (filtre.du) requete = requete.gte('created_at', `${filtre.du}T00:00:00+01:00`)
  if (filtre.au) requete = requete.lte('created_at', `${filtre.au}T23:59:59.999+01:00`)
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
    avant: m.physique_avant,
    apres: m.physique_apres,
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

export type NouveauProduit = {
  nom: string
  categorieId: string | null
  nouvelleCategorie: string
  typeCategorie: 'perruque' | 'cils' | 'produit'
  unite: string
  prix: number
  seuil: number
  stockInitial: number
  publie: boolean
  description: string
  cle: string
}

export const operationsStock = {
  async ajuster(
    varianteId: string,
    delta: number,
    motif: string,
    cle: string,
    confirme: boolean,
  ): Promise<void> {
    const { error } = await supabase().rpc('ajuster_stock', {
      p_variante_id: varianteId,
      p_delta: delta,
      p_motif: motif,
      p_cle_idempotence: cle,
      p_confirme: confirme,
    })
    if (error) throw versErreurApp(error)
  },
  async deverrouiller(varianteId: string, motif: string): Promise<void> {
    const { error } = await supabase().rpc('deverrouiller_stock', {
      p_variante_id: varianteId,
      p_motif: motif,
    })
    if (error) throw versErreurApp(error)
  },
  async creerProduit(n: NouveauProduit): Promise<string> {
    const { data, error } = await supabase().rpc('creer_produit', {
      p: {
        nom: n.nom,
        categorie_id: n.categorieId,
        nouvelle_categorie: n.nouvelleCategorie,
        type_categorie: n.typeCategorie,
        unite: n.unite,
        prix_fcfa: n.prix,
        seuil_alerte: n.seuil,
        stock_initial: n.stockInitial,
        publie: n.publie,
        description: n.description,
        cle_idempotence: n.cle,
      },
    })
    if (error) throw versErreurApp(error)
    return data
  },
  async ajouterFormat(f: {
    produitId: string
    unite: string
    prix: number | null
    stockInitial: number
    cle: string
  }): Promise<string> {
    const { data, error } = await supabase().rpc('ajouter_format', {
      p: {
        produit_id: f.produitId,
        unite: f.unite,
        prix_fcfa: f.prix,
        stock_initial: f.stockInitial,
        cle_idempotence: f.cle,
      },
    })
    if (error) throw versErreurApp(error)
    return data
  },
  async modifierArticle(a: {
    varianteId: string
    nom: string
    categorieId: string | null
    nouvelleCategorie: string
    typeCategorie: 'perruque' | 'cils' | 'produit'
    unite: string
    seuil: number
  }): Promise<void> {
    const { error } = await supabase().rpc('modifier_article', {
      p: {
        variante_id: a.varianteId,
        nom: a.nom,
        categorie_id: a.categorieId,
        nouvelle_categorie: a.nouvelleCategorie,
        type_categorie: a.typeCategorie,
        unite: a.unite,
        seuil_alerte: a.seuil,
      },
    })
    if (error) throw versErreurApp(error)
  },
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
