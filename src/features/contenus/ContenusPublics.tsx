import { Quote } from 'lucide-react'
import type { TypeContenu } from '@/services/contenus.service'
import { Media } from './Media'
import { useContenusPublics } from './requetes'

/**
 * Contenus publiés (témoignages, transformations, vidéos, photos). Rien à publier : la section
 * ne s'affiche pas. Aucun faux témoignage n'est jamais montré.
 */
export function ContenusPublics({
  titre,
  intro,
  types,
  produitId,
}: {
  titre: string
  intro?: string
  types?: TypeContenu[]
  produitId?: string
}) {
  const contenus = useContenusPublics({
    ...(types ? { types } : {}),
    ...(produitId ? { produitId } : {}),
  })
  if (!contenus.data || contenus.data.length === 0) return null
  return (
    <section aria-labelledby="titre-contenus" className="flex flex-col gap-6">
      <div>
        <h2 id="titre-contenus" className="titre-affiche text-[clamp(30px,4vw,44px)]">
          {titre}
        </h2>
        {intro && <p className="mt-3 max-w-2xl text-[17px] text-encre-2">{intro}</p>}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contenus.data.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-4 rounded-panneau bg-carte p-4 shadow-panneau"
          >
            <Media c={c} />
            {c.type === 'temoignage' && c.texte ? (
              <blockquote className="flex flex-col gap-3 px-1 pb-1">
                <Quote aria-hidden="true" className="size-6 text-or-texte" />
                <p className="text-[17px] leading-relaxed">{c.texte}</p>
                {c.auteur && (
                  <footer className="text-sm font-semibold text-encre-2">{c.auteur}</footer>
                )}
              </blockquote>
            ) : (
              <div className="px-1 pb-1">
                <p className="font-semibold">{c.titre}</p>
                {c.texte && <p className="mt-1 text-sm leading-relaxed text-encre-2">{c.texte}</p>}
                {c.auteur && <p className="mt-1 text-[13px] text-encre-3">{c.auteur}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
