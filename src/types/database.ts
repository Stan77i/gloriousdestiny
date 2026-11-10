// Fichier GÉNÉRÉ depuis le projet Supabase (npm run db:types). Ne pas modifier à la main.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      adresses_clientes: {
        Row: {
          adresse: string | null
          cliente_id: string
          created_at: string
          id: string
          point_de_repere: string
          quartier: string
          telephone_alternatif: string | null
          ville_id: number
        }
        Insert: {
          adresse?: string | null
          cliente_id: string
          created_at?: string
          id?: string
          point_de_repere: string
          quartier: string
          telephone_alternatif?: string | null
          ville_id: number
        }
        Update: {
          adresse?: string | null
          cliente_id?: string
          created_at?: string
          id?: string
          point_de_repere?: string
          quartier?: string
          telephone_alternatif?: string | null
          ville_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "adresses_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adresses_clientes_ville_id_fkey"
            columns: ["ville_id"]
            isOneToOne: false
            referencedRelation: "villes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          apres: Json | null
          auteur_id: string | null
          avant: Json | null
          created_at: string
          entite: string
          entite_id: string | null
          id: number
        }
        Insert: {
          action: string
          apres?: Json | null
          auteur_id?: string | null
          avant?: Json | null
          created_at?: string
          entite: string
          entite_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          apres?: Json | null
          auteur_id?: string | null
          avant?: Json | null
          created_at?: string
          entite?: string
          entite_id?: string | null
          id?: never
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          nom: string
          ordre: number
          publiee: boolean
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          ordre?: number
          publiee?: boolean
          slug: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          ordre?: number
          publiee?: boolean
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          fusionnee_dans: string | null
          id: string
          nom: string
          notes_internes: string | null
          telephone: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          fusionnee_dans?: string | null
          id?: string
          nom: string
          notes_internes?: string | null
          telephone: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          fusionnee_dans?: string | null
          id?: string
          nom?: string
          notes_internes?: string | null
          telephone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_fusionnee_dans_fkey"
            columns: ["fusionnee_dans"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      commande_historique: {
        Row: {
          auteur_id: string | null
          commande_id: string
          created_at: string
          evenement: string
          id: number
          motif: string | null
          statut_apres: string
          statut_avant: string | null
        }
        Insert: {
          auteur_id?: string | null
          commande_id: string
          created_at?: string
          evenement: string
          id?: never
          motif?: string | null
          statut_apres: string
          statut_avant?: string | null
        }
        Update: {
          auteur_id?: string | null
          commande_id?: string
          created_at?: string
          evenement?: string
          id?: never
          motif?: string | null
          statut_apres?: string
          statut_avant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commande_historique_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
        ]
      }
      commande_lignes: {
        Row: {
          commande_id: string
          id: string
          nom_snapshot: string
          prix_unitaire_snapshot_fcfa: number
          quantite: number
          quantite_retournee: number
          total_ligne_fcfa: number
          variante_id: string
        }
        Insert: {
          commande_id: string
          id?: string
          nom_snapshot: string
          prix_unitaire_snapshot_fcfa: number
          quantite: number
          quantite_retournee?: number
          total_ligne_fcfa: number
          variante_id: string
        }
        Update: {
          commande_id?: string
          id?: string
          nom_snapshot?: string
          prix_unitaire_snapshot_fcfa?: number
          quantite?: number
          quantite_retournee?: number
          total_ligne_fcfa?: number
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commande_lignes_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commande_lignes_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
        ]
      }
      commandes: {
        Row: {
          annulee_at: string | null
          canal: string
          cle_idempotence: string
          cliente_id: string
          confirmee_at: string | null
          created_at: string
          devise: string
          encaisse_par: string | null
          frais_livraison_fcfa: number
          id: string
          message_whatsapp_genere_at: string | null
          message_whatsapp_ouvert_at: string | null
          mode_paiement: string | null
          montant_encaisse_fcfa: number | null
          motif_annulation: string | null
          notes_internes: string | null
          paye_at: string | null
          reference: string
          reference_paiement: string | null
          reservation_expire_at: string | null
          sous_total_fcfa: number
          statut: string
          statut_paiement: string
          total_fcfa: number
          updated_at: string
          ville_id: number
        }
        Insert: {
          annulee_at?: string | null
          canal?: string
          cle_idempotence: string
          cliente_id: string
          confirmee_at?: string | null
          created_at?: string
          devise: string
          encaisse_par?: string | null
          frais_livraison_fcfa?: number
          id?: string
          message_whatsapp_genere_at?: string | null
          message_whatsapp_ouvert_at?: string | null
          mode_paiement?: string | null
          montant_encaisse_fcfa?: number | null
          motif_annulation?: string | null
          notes_internes?: string | null
          paye_at?: string | null
          reference: string
          reference_paiement?: string | null
          reservation_expire_at?: string | null
          sous_total_fcfa: number
          statut?: string
          statut_paiement?: string
          total_fcfa: number
          updated_at?: string
          ville_id: number
        }
        Update: {
          annulee_at?: string | null
          canal?: string
          cle_idempotence?: string
          cliente_id?: string
          confirmee_at?: string | null
          created_at?: string
          devise?: string
          encaisse_par?: string | null
          frais_livraison_fcfa?: number
          id?: string
          message_whatsapp_genere_at?: string | null
          message_whatsapp_ouvert_at?: string | null
          mode_paiement?: string | null
          montant_encaisse_fcfa?: number | null
          motif_annulation?: string | null
          notes_internes?: string | null
          paye_at?: string | null
          reference?: string
          reference_paiement?: string | null
          reservation_expire_at?: string | null
          sous_total_fcfa?: number
          statut?: string
          statut_paiement?: string
          total_fcfa?: number
          updated_at?: string
          ville_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "commandes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_ville_id_fkey"
            columns: ["ville_id"]
            isOneToOne: false
            referencedRelation: "villes"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilites_services: {
        Row: {
          actif: boolean
          heure_debut: string
          heure_fin: string
          id: string
          jour_semaine: number
          pas_minutes: number
        }
        Insert: {
          actif?: boolean
          heure_debut: string
          heure_fin: string
          id?: string
          jour_semaine: number
          pas_minutes?: number
        }
        Update: {
          actif?: boolean
          heure_debut?: string
          heure_fin?: string
          id?: string
          jour_semaine?: number
          pas_minutes?: number
        }
        Relationships: []
      }
      emplacements: {
        Row: {
          actif: boolean
          code: string
          id: number
          nom: string
        }
        Insert: {
          actif?: boolean
          code: string
          id?: never
          nom: string
        }
        Update: {
          actif?: boolean
          code?: string
          id?: never
          nom?: string
        }
        Relationships: []
      }
      exceptions_disponibilite: {
        Row: {
          date: string
          ferme: boolean
          heure_debut: string | null
          heure_fin: string | null
          id: string
          motif: string | null
        }
        Insert: {
          date: string
          ferme?: boolean
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          motif?: string | null
        }
        Update: {
          date?: string
          ferme?: boolean
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          motif?: string | null
        }
        Relationships: []
      }
      fournisseurs: {
        Row: {
          archive_at: string | null
          created_at: string
          id: string
          nom: string
          notes: string | null
          telephone: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          archive_at?: string | null
          created_at?: string
          id?: string
          nom: string
          notes?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          archive_at?: string | null
          created_at?: string
          id?: string
          nom?: string
          notes?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      images_produits: {
        Row: {
          chemin_storage: string
          created_at: string
          id: string
          position: number
          produit_id: string
          texte_alternatif: string
          variante_id: string | null
        }
        Insert: {
          chemin_storage: string
          created_at?: string
          id?: string
          position?: number
          produit_id: string
          texte_alternatif: string
          variante_id?: string | null
        }
        Update: {
          chemin_storage?: string
          created_at?: string
          id?: string
          position?: number
          produit_id?: string
          texte_alternatif?: string
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "images_produits_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_produits_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
        ]
      }
      livraisons: {
        Row: {
          adresse: string | null
          commande_id: string
          created_at: string
          expediee_at: string | null
          id: string
          livree_at: string | null
          motif_echec: string | null
          point_de_repere: string
          quartier: string
          statut: string
          telephone: string
          updated_at: string
          ville_id: number
        }
        Insert: {
          adresse?: string | null
          commande_id: string
          created_at?: string
          expediee_at?: string | null
          id?: string
          livree_at?: string | null
          motif_echec?: string | null
          point_de_repere: string
          quartier: string
          statut?: string
          telephone: string
          updated_at?: string
          ville_id: number
        }
        Update: {
          adresse?: string | null
          commande_id?: string
          created_at?: string
          expediee_at?: string | null
          id?: string
          livree_at?: string | null
          motif_echec?: string | null
          point_de_repere?: string
          quartier?: string
          statut?: string
          telephone?: string
          updated_at?: string
          ville_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "livraisons_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livraisons_ville_id_fkey"
            columns: ["ville_id"]
            isOneToOne: false
            referencedRelation: "villes"
            referencedColumns: ["id"]
          },
        ]
      }
      mouvements_stock: {
        Row: {
          auteur_id: string | null
          cle_idempotence: string | null
          created_at: string
          delta_physique: number
          delta_reserve: number
          emplacement_id: number
          id: number
          motif: string | null
          reference_id: string | null
          reference_type: string | null
          type: string
          variante_id: string
        }
        Insert: {
          auteur_id?: string | null
          cle_idempotence?: string | null
          created_at?: string
          delta_physique: number
          delta_reserve: number
          emplacement_id: number
          id?: never
          motif?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          variante_id: string
        }
        Update: {
          auteur_id?: string | null
          cle_idempotence?: string | null
          created_at?: string
          delta_physique?: number
          delta_reserve?: number
          emplacement_id?: number
          id?: never
          motif?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_stock_emplacement_id_fkey"
            columns: ["emplacement_id"]
            isOneToOne: false
            referencedRelation: "emplacements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
        ]
      }
      parametres: {
        Row: {
          cle: string
          modifie_par: string | null
          public: boolean
          updated_at: string
          valeur: Json
        }
        Insert: {
          cle: string
          modifie_par?: string | null
          public?: boolean
          updated_at?: string
          valeur: Json
        }
        Update: {
          cle?: string
          modifie_par?: string | null
          public?: boolean
          updated_at?: string
          valeur?: Json
        }
        Relationships: []
      }
      produits: {
        Row: {
          archive_at: string | null
          categorie_id: string
          created_at: string
          delai_appro_jours: number | null
          description: string | null
          fiche: Json
          id: string
          nom: string
          prix_fcfa: number
          publie: boolean
          seuil_alerte: number
          sku: string
          slug: string
          stock_securite_jours: number | null
          type: string
          updated_at: string
        }
        Insert: {
          archive_at?: string | null
          categorie_id: string
          created_at?: string
          delai_appro_jours?: number | null
          description?: string | null
          fiche?: Json
          id?: string
          nom: string
          prix_fcfa: number
          publie?: boolean
          seuil_alerte?: number
          sku: string
          slug: string
          stock_securite_jours?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          archive_at?: string | null
          categorie_id?: string
          created_at?: string
          delai_appro_jours?: number | null
          description?: string | null
          fiche?: Json
          id?: string
          nom?: string
          prix_fcfa?: number
          publie?: boolean
          seuil_alerte?: number
          sku?: string
          slug?: string
          stock_securite_jours?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produits_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          actif: boolean
          created_at: string
          id: string
          nom: string
          role: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          id: string
          nom: string
          role: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          id?: string
          nom?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      reception_lignes: {
        Row: {
          cout_unitaire_fcfa: number | null
          id: string
          quantite: number
          reception_id: string
          variante_id: string
        }
        Insert: {
          cout_unitaire_fcfa?: number | null
          id?: string
          quantite: number
          reception_id: string
          variante_id: string
        }
        Update: {
          cout_unitaire_fcfa?: number | null
          id?: string
          quantite?: number
          reception_id?: string
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reception_lignes_reception_id_fkey"
            columns: ["reception_id"]
            isOneToOne: false
            referencedRelation: "receptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_lignes_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
        ]
      }
      receptions: {
        Row: {
          auteur_id: string | null
          created_at: string
          date_reception: string
          fournisseur_id: string | null
          id: string
          reference_fournisseur: string | null
        }
        Insert: {
          auteur_id?: string | null
          created_at?: string
          date_reception?: string
          fournisseur_id?: string | null
          id?: string
          reference_fournisseur?: string | null
        }
        Update: {
          auteur_id?: string | null
          created_at?: string
          date_reception?: string
          fournisseur_id?: string | null
          id?: string
          reference_fournisseur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receptions_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      rendez_vous: {
        Row: {
          cliente_id: string
          created_at: string
          debut: string
          fin: string
          id: string
          motif_annulation: string | null
          notes: string | null
          occupe_debut: string
          occupe_fin: string
          service_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          debut: string
          fin: string
          id?: string
          motif_annulation?: string | null
          notes?: string | null
          occupe_debut: string
          occupe_fin: string
          service_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          debut?: string
          fin?: string
          id?: string
          motif_annulation?: string | null
          notes?: string | null
          occupe_debut?: string
          occupe_fin?: string
          service_id?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rendez_vous_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rendez_vous_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archive_at: string | null
          created_at: string
          description: string | null
          duree_minutes: number
          id: string
          nom: string
          prix_fcfa: number
          publie: boolean
          slug: string
          tampon_apres_minutes: number
          tampon_avant_minutes: number
          type: string
          updated_at: string
        }
        Insert: {
          archive_at?: string | null
          created_at?: string
          description?: string | null
          duree_minutes: number
          id?: string
          nom: string
          prix_fcfa: number
          publie?: boolean
          slug: string
          tampon_apres_minutes?: number
          tampon_avant_minutes?: number
          type: string
          updated_at?: string
        }
        Update: {
          archive_at?: string | null
          created_at?: string
          description?: string | null
          duree_minutes?: number
          id?: string
          nom?: string
          prix_fcfa?: number
          publie?: boolean
          slug?: string
          tampon_apres_minutes?: number
          tampon_avant_minutes?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      stocks: {
        Row: {
          disponible: number | null
          emplacement_id: number
          physique: number
          reserve: number
          updated_at: string
          variante_id: string
        }
        Insert: {
          disponible?: number | null
          emplacement_id: number
          physique?: number
          reserve?: number
          updated_at?: string
          variante_id: string
        }
        Update: {
          disponible?: number | null
          emplacement_id?: number
          physique?: number
          reserve?: number
          updated_at?: string
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stocks_emplacement_id_fkey"
            columns: ["emplacement_id"]
            isOneToOne: false
            referencedRelation: "emplacements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocks_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
        ]
      }
      variantes: {
        Row: {
          actif: boolean
          attributs: Json
          created_at: string
          id: string
          libelle: string
          prix_fcfa: number | null
          produit_id: string
          sku: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          attributs?: Json
          created_at?: string
          id?: string
          libelle: string
          prix_fcfa?: number | null
          produit_id: string
          sku: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          attributs?: Json
          created_at?: string
          id?: string
          libelle?: string
          prix_fcfa?: number | null
          produit_id?: string
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variantes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      villes: {
        Row: {
          actif: boolean
          devise: string
          fuseau: string
          id: number
          indicatif: string
          nom: string
          ordre: number
          pays: string
        }
        Insert: {
          actif?: boolean
          devise: string
          fuseau: string
          id?: never
          indicatif: string
          nom: string
          ordre?: number
          pays: string
        }
        Update: {
          actif?: boolean
          devise?: string
          fuseau?: string
          id?: never
          indicatif?: string
          nom?: string
          ordre?: number
          pays?: string
        }
        Relationships: []
      }
    }
    Views: {
      vue_stock: {
        Row: {
          categorie: string | null
          delai_appro_jours: number | null
          disponible: number | null
          libelle: string | null
          mis_a_jour_le: string | null
          physique: number | null
          produit: string | null
          produit_id: string | null
          publie: boolean | null
          reserve: number | null
          seuil_alerte: number | null
          sku: string | null
          slug: string | null
          statut: string | null
          stock_securite_jours: number | null
          variante_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      annoter_cliente: {
        Args: { p_id: string; p_notes: string }
        Returns: undefined
      }
      annoter_commande: {
        Args: { p_id: string; p_notes: string }
        Returns: undefined
      }
      annuler_commande: {
        Args: { p_id: string; p_motif: string }
        Returns: Json
      }
      confirmer_commande: { Args: { p_id: string }; Returns: Json }
      creer_commande: { Args: { p_commande: Json }; Returns: Json }
      corriger_inventaire: {
        Args: {
          p_cle_idempotence: string
          p_motif: string
          p_quantite_comptee: number
          p_variante_id: string
        }
        Returns: number
      }
      declarer_perte: {
        Args: {
          p_cle_idempotence: string
          p_motif: string
          p_quantite: number
          p_variante_id: string
        }
        Returns: number
      }
      disponibilite_variantes: {
        Args: { p_variante_ids: string[] }
        Returns: {
          statut: string
          variante_id: string
        }[]
      }
      entree_stock: {
        Args: {
          p_cle_idempotence: string
          p_motif?: string
          p_quantite: number
          p_reception_id?: string
          p_variante_id: string
        }
        Returns: number
      }
      enregistrer_paiement: {
        Args: {
          p_id: string
          p_mode: string
          p_montant_fcfa: number
          p_reference?: string
        }
        Returns: Json
      }
      expedier_commande: { Args: { p_id: string }; Returns: Json }
      livrer_commande: { Args: { p_id: string }; Returns: Json }
      message_whatsapp_commande: { Args: { p_id: string }; Returns: string }
      receptionner: { Args: { p_reception: Json }; Returns: string }
      regler_alertes_stock: {
        Args: {
          p_delai_appro_jours: number
          p_produit_id: string
          p_seuil_alerte: number
          p_stock_securite_jours: number
        }
        Returns: undefined
      }
      retourner_commande: {
        Args: { p_id: string; p_lignes: Json; p_motif: string }
        Returns: Json
      }
      signaler_ouverture_whatsapp: {
        Args: { p_reference: string; p_telephone: string }
        Returns: boolean
      }
      suivre_commande: {
        Args: { p_reference: string; p_telephone: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
