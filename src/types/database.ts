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
      abonnements_push: {
        Row: {
          auth: string
          consentement_at: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          revoque_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          consentement_at?: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          revoque_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          consentement_at?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          revoque_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      alertes_retour_stock: {
        Row: {
          annulee_at: string | null
          consentement_at: string
          created_at: string
          id: string
          nom: string
          prevenue_at: string | null
          telephone: string
          variante_id: string
        }
        Insert: {
          annulee_at?: string | null
          consentement_at: string
          created_at?: string
          id?: string
          nom: string
          prevenue_at?: string | null
          telephone: string
          variante_id: string
        }
        Update: {
          annulee_at?: string | null
          consentement_at?: string
          created_at?: string
          id?: string
          nom?: string
          prevenue_at?: string | null
          telephone?: string
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertes_retour_stock_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertes_retour_stock_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["variante_id"]
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
      blocages_agenda: {
        Row: {
          created_at: string
          cree_par: string | null
          debut: string
          fin: string
          id: string
          motif: string
          retire_at: string | null
          retire_par: string | null
        }
        Insert: {
          created_at?: string
          cree_par?: string | null
          debut: string
          fin: string
          id?: string
          motif: string
          retire_at?: string | null
          retire_par?: string | null
        }
        Update: {
          created_at?: string
          cree_par?: string | null
          debut?: string
          fin?: string
          id?: string
          motif?: string
          retire_at?: string | null
          retire_par?: string | null
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
          {
            foreignKeyName: "commande_lignes_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["variante_id"]
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
      contenus: {
        Row: {
          auteur: string | null
          consentement_cliente: boolean
          created_at: string
          cree_par: string | null
          fichier: string | null
          fichier_avant: string | null
          id: string
          mis_en_avant: boolean
          ordre: number
          produit_id: string | null
          publie_at: string | null
          service_id: string | null
          statut: string
          texte: string | null
          texte_alternatif: string | null
          titre: string
          type: string
          type_fichier: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          auteur?: string | null
          consentement_cliente?: boolean
          created_at?: string
          cree_par?: string | null
          fichier?: string | null
          fichier_avant?: string | null
          id?: string
          mis_en_avant?: boolean
          ordre?: number
          produit_id?: string | null
          publie_at?: string | null
          service_id?: string | null
          statut?: string
          texte?: string | null
          texte_alternatif?: string | null
          titre: string
          type: string
          type_fichier?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          auteur?: string | null
          consentement_cliente?: boolean
          created_at?: string
          cree_par?: string | null
          fichier?: string | null
          fichier_avant?: string | null
          id?: string
          mis_en_avant?: boolean
          ordre?: number
          produit_id?: string | null
          publie_at?: string | null
          service_id?: string | null
          statut?: string
          texte?: string | null
          texte_alternatif?: string | null
          titre?: string
          type?: string
          type_fichier?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contenus_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contenus_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["produit_id"]
          },
          {
            foreignKeyName: "contenus_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_prestations: {
        Row: {
          cle_idempotence: string
          created_at: string
          date_souhaitee: string
          heure_souhaitee: string
          id: string
          nom_cliente: string
          nom_prestation: string
          precision: string | null
          prix_fcfa: number
          reference: string
          service_id: string
          statut: string
          telephone: string
          traitee_at: string | null
          traitee_par: string | null
        }
        Insert: {
          cle_idempotence: string
          created_at?: string
          date_souhaitee: string
          heure_souhaitee: string
          id?: string
          nom_cliente: string
          nom_prestation: string
          precision?: string | null
          prix_fcfa: number
          reference: string
          service_id: string
          statut?: string
          telephone: string
          traitee_at?: string | null
          traitee_par?: string | null
        }
        Update: {
          cle_idempotence?: string
          created_at?: string
          date_souhaitee?: string
          heure_souhaitee?: string
          id?: string
          nom_cliente?: string
          nom_prestation?: string
          precision?: string | null
          prix_fcfa?: number
          reference?: string
          service_id?: string
          statut?: string
          telephone?: string
          traitee_at?: string | null
          traitee_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_prestations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      deverrouillages_stock: {
        Row: {
          auteur_id: string | null
          created_at: string
          id: number
          motif: string
          variante_id: string
        }
        Insert: {
          auteur_id?: string | null
          created_at?: string
          id?: never
          motif: string
          variante_id: string
        }
        Update: {
          auteur_id?: string | null
          created_at?: string
          id?: never
          motif?: string
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deverrouillages_stock_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deverrouillages_stock_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["variante_id"]
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
            foreignKeyName: "images_produits_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["produit_id"]
          },
          {
            foreignKeyName: "images_produits_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_produits_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["variante_id"]
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
          physique_apres: number | null
          physique_avant: number | null
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
          physique_apres?: number | null
          physique_avant?: number | null
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
          physique_apres?: number | null
          physique_avant?: number | null
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
          {
            foreignKeyName: "mouvements_stock_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      notifications: {
        Row: {
          cle_dedup: string
          corps: string
          created_at: string
          donnees: Json
          id: number
          lien: string | null
          role_cible: string | null
          titre: string
          type: string
        }
        Insert: {
          cle_dedup: string
          corps: string
          created_at?: string
          donnees?: Json
          id?: never
          lien?: string | null
          role_cible?: string | null
          titre: string
          type: string
        }
        Update: {
          cle_dedup?: string
          corps?: string
          created_at?: string
          donnees?: Json
          id?: never
          lien?: string | null
          role_cible?: string | null
          titre?: string
          type?: string
        }
        Relationships: []
      }
      notifications_lues: {
        Row: {
          lu_at: string
          notification_id: number
          user_id: string
        }
        Insert: {
          lu_at?: string
          notification_id: number
          user_id: string
        }
        Update: {
          lu_at?: string
          notification_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lues_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
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
      pays: {
        Row: {
          actif: boolean
          chiffres_max: number
          chiffres_min: number
          code: string
          indicatif: string
          nom: string
          ordre: number
          zero_initial_retire: boolean
        }
        Insert: {
          actif?: boolean
          chiffres_max: number
          chiffres_min: number
          code: string
          indicatif: string
          nom: string
          ordre?: number
          zero_initial_retire?: boolean
        }
        Update: {
          actif?: boolean
          chiffres_max?: number
          chiffres_min?: number
          code?: string
          indicatif?: string
          nom?: string
          ordre?: number
          zero_initial_retire?: boolean
        }
        Relationships: []
      }
      preferences_notifications: {
        Row: {
          heures_calmes_debut: string | null
          heures_calmes_fin: string | null
          push_actif: boolean
          types_coupes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          heures_calmes_debut?: string | null
          heures_calmes_fin?: string | null
          push_actif?: boolean
          types_coupes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          heures_calmes_debut?: string | null
          heures_calmes_fin?: string | null
          push_actif?: boolean
          types_coupes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      produits: {
        Row: {
          archive_at: string | null
          categorie_id: string
          coup_de_coeur: boolean
          created_at: string
          delai_appro_jours: number | null
          description: string | null
          fiche: Json
          id: string
          nom: string
          nouveau_jusqu_au: string | null
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
          coup_de_coeur?: boolean
          created_at?: string
          delai_appro_jours?: number | null
          description?: string | null
          fiche?: Json
          id?: string
          nom: string
          nouveau_jusqu_au?: string | null
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
          coup_de_coeur?: boolean
          created_at?: string
          delai_appro_jours?: number | null
          description?: string | null
          fiche?: Json
          id?: string
          nom?: string
          nouveau_jusqu_au?: string | null
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
      promotions: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string | null
          debut: string
          fin: string | null
          id: string
          libelle: string | null
          mode: string
          produit_id: string
          updated_at: string
          valeur: number
          variante_id: string | null
        }
        Insert: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          debut?: string
          fin?: string | null
          id?: string
          libelle?: string | null
          mode: string
          produit_id: string
          updated_at?: string
          valeur: number
          variante_id?: string | null
        }
        Update: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          debut?: string
          fin?: string | null
          id?: string
          libelle?: string | null
          mode?: string
          produit_id?: string
          updated_at?: string
          valeur?: number
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["produit_id"]
          },
          {
            foreignKeyName: "promotions_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["variante_id"]
          },
        ]
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
          {
            foreignKeyName: "reception_lignes_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["variante_id"]
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
          annule_at: string | null
          annule_par: string | null
          cle_idempotence: string | null
          cliente_id: string
          cloture_at: string | null
          confirme_at: string | null
          created_at: string
          debut: string
          fin: string
          id: string
          message_whatsapp_ouvert_at: string | null
          motif_annulation: string | null
          notes: string | null
          occupe_debut: string
          occupe_fin: string
          prix_snapshot_fcfa: number | null
          rappel_envoye_at: string | null
          reference: string
          service_id: string
          service_nom_snapshot: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          annule_at?: string | null
          annule_par?: string | null
          cle_idempotence?: string | null
          cliente_id: string
          cloture_at?: string | null
          confirme_at?: string | null
          created_at?: string
          debut: string
          fin: string
          id?: string
          message_whatsapp_ouvert_at?: string | null
          motif_annulation?: string | null
          notes?: string | null
          occupe_debut: string
          occupe_fin: string
          prix_snapshot_fcfa?: number | null
          rappel_envoye_at?: string | null
          reference?: string
          service_id: string
          service_nom_snapshot?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          annule_at?: string | null
          annule_par?: string | null
          cle_idempotence?: string | null
          cliente_id?: string
          cloture_at?: string | null
          confirme_at?: string | null
          created_at?: string
          debut?: string
          fin?: string
          id?: string
          message_whatsapp_ouvert_at?: string | null
          motif_annulation?: string | null
          notes?: string | null
          occupe_debut?: string
          occupe_fin?: string
          prix_snapshot_fcfa?: number | null
          rappel_envoye_at?: string | null
          reference?: string
          service_id?: string
          service_nom_snapshot?: string | null
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
      rendez_vous_historique: {
        Row: {
          auteur_id: string | null
          created_at: string
          evenement: string
          id: number
          motif: string | null
          rendez_vous_id: string
          statut_apres: string
          statut_avant: string | null
        }
        Insert: {
          auteur_id?: string | null
          created_at?: string
          evenement: string
          id?: never
          motif?: string | null
          rendez_vous_id: string
          statut_apres: string
          statut_avant?: string | null
        }
        Update: {
          auteur_id?: string | null
          created_at?: string
          evenement?: string
          id?: never
          motif?: string | null
          rendez_vous_id?: string
          statut_apres?: string
          statut_avant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rendez_vous_historique_rendez_vous_id_fkey"
            columns: ["rendez_vous_id"]
            isOneToOne: false
            referencedRelation: "rendez_vous"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archive_at: string | null
          coup_de_coeur: boolean
          created_at: string
          description: string | null
          duree_minutes: number | null
          id: string
          image: string | null
          mode_reservation: string
          nom: string
          ordre: number
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
          coup_de_coeur?: boolean
          created_at?: string
          description?: string | null
          duree_minutes?: number | null
          id?: string
          image?: string | null
          mode_reservation?: string
          nom: string
          ordre?: number
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
          coup_de_coeur?: boolean
          created_at?: string
          description?: string | null
          duree_minutes?: number | null
          id?: string
          image?: string | null
          mode_reservation?: string
          nom?: string
          ordre?: number
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
          {
            foreignKeyName: "stocks_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["variante_id"]
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
          {
            foreignKeyName: "variantes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "vue_stock"
            referencedColumns: ["produit_id"]
          },
        ]
      }
      verrous_stock: {
        Row: {
          modifiable_jusqu_a: string
          modifie_at: string
          modifie_par: string | null
          variante_id: string
        }
        Insert: {
          modifiable_jusqu_a: string
          modifie_at: string
          modifie_par?: string | null
          variante_id: string
        }
        Update: {
          modifiable_jusqu_a?: string
          modifie_at?: string
          modifie_par?: string | null
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verrous_stock_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: true
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verrous_stock_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: true
            referencedRelation: "vue_stock"
            referencedColumns: ["variante_id"]
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
          latitude: number | null
          longitude: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          latitude?: number | null
          longitude?: number | null
          nom?: string
          ordre?: number
          pays?: string
        }
        Relationships: [
          {
            foreignKeyName: "villes_pays_fk"
            columns: ["pays"]
            isOneToOne: false
            referencedRelation: "pays"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      vue_stock: {
        Row: {
          categorie: string | null
          categorie_id: string | null
          delai_appro_jours: number | null
          disponible: number | null
          libelle: string | null
          mis_a_jour_le: string | null
          modifiable_jusqu_a: string | null
          modifie_at: string | null
          modifie_par: string | null
          physique: number | null
          prix_fcfa: number | null
          produit: string | null
          produit_id: string | null
          publie: boolean | null
          reserve: number | null
          secondes_restantes: number | null
          seuil_alerte: number | null
          sku: string | null
          slug: string | null
          statut: string | null
          stock_securite_jours: number | null
          variante_id: string | null
          vendus: number | null
          vendus_30j: number | null
          verrouille: boolean | null
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
    }
    Functions: {
      ajouter_format: { Args: { p: Json }; Returns: string }
      ajuster_stock: {
        Args: {
          p_cle_idempotence: string
          p_confirme?: boolean
          p_delta: number
          p_motif: string
          p_variante_id: string
        }
        Returns: Json
      }
      alertes_a_prevenir: { Args: never; Returns: Json }
      analyse_produits: { Args: never; Returns: Json }
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
      annuler_rendez_vous: {
        Args: { p_id: string; p_motif: string }
        Returns: Json
      }
      annuler_rendez_vous_cliente: {
        Args: { p_reference: string; p_telephone: string }
        Returns: Json
      }
      bloquer_creneau: {
        Args: { p_debut: string; p_fin: string; p_motif: string }
        Returns: string
      }
      carte_activite: { Args: { p_au: string; p_du: string }; Returns: Json }
      carte_publique: { Args: never; Returns: Json }
      cloturer_rendez_vous: {
        Args: { p_id: string; p_issue: string }
        Returns: Json
      }
      confirmer_commande: { Args: { p_id: string }; Returns: Json }
      confirmer_rendez_vous: { Args: { p_id: string }; Returns: Json }
      corriger_inventaire: {
        Args: {
          p_cle_idempotence: string
          p_motif: string
          p_quantite_comptee: number
          p_variante_id: string
        }
        Returns: number
      }
      creer_commande: { Args: { p_commande: Json }; Returns: Json }
      creer_produit: { Args: { p: Json }; Returns: string }
      creneaux_disponibles: {
        Args: { p_au: string; p_du: string; p_service_id: string }
        Returns: string[]
      }
      creneaux_report: {
        Args: { p_id: string; p_jour: string }
        Returns: string[]
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
      demander_alerte_retour_stock: {
        Args: {
          p_consentement: boolean
          p_nom: string
          p_telephone: string
          p_variante_id: string
        }
        Returns: string
      }
      demander_prestation: { Args: { p: Json }; Returns: Json }
      desactiver_promotion: { Args: { p_id: string }; Returns: undefined }
      deverrouiller_stock: {
        Args: { p_motif: string; p_variante_id: string }
        Returns: string
      }
      disponibilite_variantes: {
        Args: { p_variante_ids: string[] }
        Returns: {
          statut: string
          variante_id: string
        }[]
      }
      enregistrer_abonnement_push: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: undefined
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
      enregistrer_preferences_notifications: {
        Args: {
          p_heures_calmes_debut?: string
          p_heures_calmes_fin?: string
          p_types_coupes: string[]
        }
        Returns: undefined
      }
      enregistrer_promotion: { Args: { p: Json }; Returns: string }
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
      expedier_commande: { Args: { p_id: string }; Returns: Json }
      fermer_journee: {
        Args: { p_date: string; p_motif: string }
        Returns: undefined
      }
      historique_reglages: { Args: { p_variante_id: string }; Returns: Json }
      livrer_commande: { Args: { p_id: string }; Returns: Json }
      marquer_alerte_prevenue: { Args: { p_id: string }; Returns: undefined }
      marquer_notifications_lues: {
        Args: { p_ids?: number[] }
        Returns: undefined
      }
      marquer_rappel_envoye: { Args: { p_id: string }; Returns: undefined }
      meilleures_ventes: { Args: never; Returns: string[] }
      mes_notifications: { Args: { p_limite?: number }; Returns: Json }
      message_whatsapp_commande: { Args: { p_id: string }; Returns: string }
      modifier_article: { Args: { p: Json }; Returns: undefined }
      prestations_tres_demandees: { Args: never; Returns: string[] }
      promotions_en_cours: {
        Args: never
        Returns: {
          fin: string
          libelle: string
          prix_base: number
          prix_promo: number
          reduction: number
          variante_id: string
        }[]
      }
      rappels_a_envoyer: { Args: never; Returns: Json }
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
      reprogrammer_rendez_vous: {
        Args: { p_debut: string; p_id: string; p_motif?: string }
        Returns: Json
      }
      reserver_rendez_vous: { Args: { p_rdv: Json }; Returns: Json }
      retirer_blocage: { Args: { p_id: string }; Returns: undefined }
      retourner_commande: {
        Args: { p_id: string; p_lignes: Json; p_motif: string }
        Returns: Json
      }
      rouvrir_journee: { Args: { p_date: string }; Returns: undefined }
      signaler_ouverture_whatsapp: {
        Args: { p_reference: string; p_telephone: string }
        Returns: boolean
      }
      signaler_ouverture_whatsapp_rdv: {
        Args: { p_reference: string; p_telephone: string }
        Returns: boolean
      }
      suivre_commande: {
        Args: { p_reference: string; p_telephone: string }
        Returns: Json
      }
      suivre_rendez_vous: {
        Args: { p_reference: string; p_telephone: string }
        Returns: Json
      }
      tableau_de_bord: { Args: { p_au: string; p_du: string }; Returns: Json }
      tableau_stock: { Args: never; Returns: Json }
      traiter_demande_prestation: {
        Args: { p_id: string; p_statut: string }
        Returns: undefined
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
