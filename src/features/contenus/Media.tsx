import { Play } from 'lucide-react'
import { idYoutube, urlContenu, type Contenu } from '@/services/contenus.service'

/** Affiche le média d'un contenu : image, vidéo hébergée, YouTube (sans cookies) ou lien. */
export function Media({ c, className }: { c: Contenu; className?: string }) {
  if (c.type === 'transformation' && c.fichier && c.fichierAvant) {
    return (
      <div className={`grid grid-cols-2 gap-1.5 ${className ?? ''}`}>
        <figure className="relative">
          <img
            src={urlContenu(c.fichierAvant)}
            alt={`Avant : ${c.texteAlternatif ?? c.titre}`}
            loading="lazy"
            className="aspect-[4/5] w-full rounded-[18px] object-cover"
          />
          <figcaption className="absolute top-2 left-2 rounded-full bg-carte/90 px-2.5 py-0.5 text-[12px] font-semibold">
            Avant
          </figcaption>
        </figure>
        <figure className="relative">
          <img
            src={urlContenu(c.fichier)}
            alt={`Après : ${c.texteAlternatif ?? c.titre}`}
            loading="lazy"
            className="aspect-[4/5] w-full rounded-[18px] object-cover"
          />
          <figcaption className="degrade-or absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-[12px] font-semibold text-sur-or">
            Après
          </figcaption>
        </figure>
      </div>
    )
  }
  if (c.fichier && c.typeFichier === 'video') {
    return (
      <video
        src={urlContenu(c.fichier)}
        controls
        preload="metadata"
        playsInline
        className={`aspect-video w-full rounded-[18px] bg-encre object-cover ${className ?? ''}`}
      />
    )
  }
  if (c.fichier) {
    return (
      <img
        src={urlContenu(c.fichier)}
        alt={c.texteAlternatif ?? c.titre}
        loading="lazy"
        className={`aspect-[4/3] w-full rounded-[18px] object-cover ${className ?? ''}`}
      />
    )
  }
  if (c.videoUrl) {
    const yt = idYoutube(c.videoUrl)
    if (yt) {
      return (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt}`}
          title={c.titre}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={`aspect-video w-full rounded-[18px] bg-encre ${className ?? ''}`}
        />
      )
    }
    return (
      <a
        href={c.videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex aspect-video w-full items-center justify-center gap-2 rounded-[18px] bg-encre font-semibold text-fond no-underline [&_svg]:size-5 ${className ?? ''}`}
      >
        <Play aria-hidden="true" />
        Voir la vidéo
      </a>
    )
  }
  return null
}
