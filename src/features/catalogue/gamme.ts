import braidGelPhoto from '@/assets/photos/braid-gel-800.webp'
import braidGelPhotoHd from '@/assets/photos/braid-gel-1600.webp'
import shampooPhoto from '@/assets/photos/glue-residue-remover-shampoo-800.webp'
import shampooPhotoHd from '@/assets/photos/glue-residue-remover-shampoo-1600.webp'
import laceGluePhoto from '@/assets/photos/lace-glue-800.webp'
import laceGluePhotoHd from '@/assets/photos/lace-glue-1600.webp'
import removerPhoto from '@/assets/photos/lace-glue-remover-spray-800.webp'
import removerPhotoHd from '@/assets/photos/lace-glue-remover-spray-1600.webp'
import meltingPhoto from '@/assets/photos/lace-melting-spray-800.webp'
import meltingPhotoHd from '@/assets/photos/lace-melting-spray-1600.webp'
import waxPhoto from '@/assets/photos/wax-stick-800.webp'
import waxPhotoHd from '@/assets/photos/wax-stick-1600.webp'
import braidGel from '@/assets/produits/braid-gel.webp'
import shampoo from '@/assets/produits/glue-residue-remover-shampoo.webp'
import hairCurlMousse from '@/assets/produits/hair-curl-mousse.webp'
import laceGlue from '@/assets/produits/lace-glue.webp'
import remover from '@/assets/produits/lace-glue-remover-spray.webp'
import melting from '@/assets/produits/lace-melting-spray.webp'
import waxStick from '@/assets/produits/wax-stick.webp'

/**
 * La gamme officielle : exactement 7 produits (brief client). Ne pas en ajouter ici :
 * les futurs produits sont créés depuis l'administration (table `produits`).
 * Ce fichier ne porte que l'identité visuelle fournie par le client (détourés + photos),
 * en attendant le stockage des images dans Supabase (Phase 4). Aucun prix ici.
 */
export type ProduitGamme = {
  slug: string
  nom: string
  format: string | null
  categorie: 'Pose de perruque' | 'Coiffage'
  detoure: string
  photo: { petite: string; grande: string; alt: string } | null
}

export const GAMME: ProduitGamme[] = [
  {
    slug: 'hair-curl-mousse',
    nom: 'Hair Curl Mousse',
    format: '200 ml',
    categorie: 'Coiffage',
    detoure: hairCurlMousse,
    photo: null,
  },
  {
    slug: 'glue-residue-remover-shampoo',
    nom: 'Glue Residue Remover Shampoo',
    format: '245 ml',
    categorie: 'Pose de perruque',
    detoure: shampoo,
    photo: {
      petite: shampooPhoto,
      grande: shampooPhotoHd,
      alt: 'Une femme verse le Glue Residue Remover Shampoo dans sa main sous la douche.',
    },
  },
  {
    slug: 'lace-melting-spray',
    nom: 'Lace Melting Spray',
    format: null,
    categorie: 'Pose de perruque',
    detoure: melting,
    photo: {
      petite: meltingPhoto,
      grande: meltingPhotoHd,
      alt: 'Une femme vaporise le Lace Melting Spray sur la dentelle de sa perruque devant un miroir.',
    },
  },
  {
    slug: 'lace-glue',
    nom: 'Lace Glue',
    format: null,
    categorie: 'Pose de perruque',
    detoure: laceGlue,
    photo: {
      petite: laceGluePhoto,
      grande: laceGluePhotoHd,
      alt: 'Application de la Lace Glue le long de la racine des cheveux.',
    },
  },
  {
    slug: 'wax-stick',
    nom: 'Wax Stick',
    format: null,
    categorie: 'Coiffage',
    detoure: waxStick,
    photo: {
      petite: waxPhoto,
      grande: waxPhotoHd,
      alt: 'Une femme lisse ses contours avec le Wax Stick.',
    },
  },
  {
    slug: 'lace-glue-remover-spray',
    nom: 'Lace Glue Remover Spray',
    format: '50 ml',
    categorie: 'Pose de perruque',
    detoure: remover,
    photo: {
      petite: removerPhoto,
      grande: removerPhotoHd,
      alt: 'Retrait de la colle d’une perruque avec le Lace Glue Remover Spray.',
    },
  },
  {
    slug: 'braid-gel',
    nom: 'Braid Gel',
    format: '250 g',
    categorie: 'Coiffage',
    detoure: braidGel,
    photo: {
      petite: braidGelPhoto,
      grande: braidGelPhotoHd,
      alt: 'Une cliente tient le pot de Braid Gel pendant la réalisation de ses tresses.',
    },
  },
]
