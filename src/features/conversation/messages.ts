import { CHEMINS } from '@/app/router/chemins'
import { lienProduit } from '@/features/catalogue/liens'
import { formaterFcfa } from '@/lib/format/montant'
import type { Prestation, Produit } from '@/services/catalogue.service'

/**
 * Les petites phrases que la maison glisse sous le logo, comme dans une conversation.
 * Toutes sont vraies : conseils écrits dans les fiches produits, prix et prestations de la
 * base, nouveautés et coups de cœur choisis par l'équipe, promotions réelles seulement.
 * Jamais de fausse preuve sociale (« Awa vient d'acheter… »), jamais de faux compte à rebours.
 */
export type Message = {
  cle: string
  texte: string
  /** Lien interne, ou externe (WhatsApp). */
  lien?: { vers: string; libelle: string; externe?: boolean }
}

export function composerMessages({
  produits,
  prestations,
  whatsapp,
}: {
  produits: Produit[] | undefined
  prestations: Prestation[] | undefined
  whatsapp: string | null
}): Message[] {
  const m: Message[] = []
  const liste = (produits ?? []).filter((p) => p.variantes.length > 0)

  // Promotions réelles d'abord.
  for (const p of liste) {
    const promo = p.variantes.find((v) => v.promo)?.promo
    if (promo) {
      m.push({
        cle: `promo:${p.slug}`,
        texte: `Bonne nouvelle : ${p.nom} est à −${String(promo.reduction)} % en ce moment.`,
        lien: { vers: lienProduit(p), libelle: 'J’en profite' },
      })
    }
  }

  // Secrets de pose : les conseils écrits dans les fiches.
  for (const p of liste) {
    if (p.fiche.conseil) {
      m.push({
        cle: `conseil:${p.slug}`,
        texte: `Petit secret de pose : ${p.fiche.conseil}`,
        lien: { vers: lienProduit(p), libelle: `Voir ${p.nom}` },
      })
    }
  }

  const coeur = liste.filter((p) => p.badges.coupDeCoeur)
  for (const p of coeur.slice(0, 2)) {
    m.push({
      cle: `coeur:${p.slug}`,
      texte: `Notre coup de cœur du moment ? ${p.nom}.${p.fiche.accroche ? ` ${p.fiche.accroche}` : ''}`,
      lien: { vers: lienProduit(p), libelle: 'Je regarde' },
    })
  }

  const presta = prestations?.find((x) => x.badges.coupDeCoeur) ?? prestations?.[0]
  if (presta) {
    m.push({
      cle: `presta:${presta.slug}`,
      texte: `${presta.nom} au salon : ${formaterFcfa(presta.prix)}. On vous garde un moment ?`,
      lien: { vers: `${CHEMINS.prestations}#${presta.slug}`, libelle: 'Réserver' },
    })
  }

  m.push({
    cle: 'livraison',
    texte: 'Ici, vous payez à la livraison : en espèces ou par Mobile Money. Zéro stress.',
    lien: { vers: CHEMINS.catalogue, libelle: 'Voir la boutique' },
  })

  if (whatsapp) {
    m.push({
      cle: 'conseil-whatsapp',
      texte: 'Vous hésitez entre deux produits ? Écrivez-nous, on vous répond comme une amie.',
      lien: { vers: whatsapp, libelle: 'Écrire sur WhatsApp', externe: true },
    })
  }

  // Ordre de conversation : on alterne les sujets plutôt que d'enchaîner les conseils.
  const parSujet = new Map<string, Message[]>()
  for (const x of m) {
    const sujet = x.cle.split(':')[0] ?? ''
    parSujet.set(sujet, [...(parSujet.get(sujet) ?? []), x])
  }
  const sortie: Message[] = []
  const files = [...parSujet.values()]
  while (files.some((f) => f.length > 0)) {
    for (const f of files) {
      const x = f.shift()
      if (x) sortie.push(x)
    }
  }
  return sortie
}
