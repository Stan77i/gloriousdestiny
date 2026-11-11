import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { CHEMINS } from '@/app/router/chemins'
import { Meches } from '@/components/marque/Meches'
import { Regard } from '@/components/marque/Regard'
import { GAMME } from '@/features/catalogue/gamme'
import { PHOTO_LA_GAMME, visuelProduit } from '@/features/catalogue/visuels'
import type { Produit } from '@/services/catalogue.service'
import { cx } from '@/lib/cx'
import { Revele } from '@/components/marque/Revele'
import { useRevele } from '@/hooks/useRevele'

/**
 * Les trois univers de la maison, en composition éditoriale : les perruques en grand portrait,
 * les cils et les soins en deux plans plus serrés. Les visuels sont les vraies photos de la
 * marque ; les chiffres viennent du catalogue publié.
 */
export function Univers({ produits }: { produits: Produit[] | undefined }) {
  const nb = (type: Produit['type']) => produits?.filter((p) => p.type === type).length
  const perruque = GAMME.find((p) => p.slug === 'lace-glue-remover-spray')?.photo
  const cils = visuelProduit('strip-lashes-fluffy-wispy').pleine
  const tuiles = [
    {
      cle: 'perruques',
      titre: 'Perruques',
      texte:
        'Lace wigs, pose frontale, traitement, coloration, montage : la perruque qui vous ressemble.',
      vers: CHEMINS.perruques,
      image: perruque?.grande,
      alt: 'Une cliente prend soin de sa lace wig longue et ondulée, posée sur une tête de présentation.',
      compte: null,
      decor: (
        <Meches ton="clair" className="absolute inset-y-0 right-[6%] h-full w-[34%] opacity-80" />
      ),
      classe: 'lg:col-span-7 lg:row-span-2 aspect-[4/5] lg:aspect-auto lg:min-h-[640px]',
      position: 'object-[30%_40%]',
    },
    {
      cle: 'cils',
      titre: 'Cils',
      texte: 'Bandes, grappes et kits pour un regard du naturel au spectaculaire.',
      vers: CHEMINS.cils,
      image: cils?.grande,
      alt: cils?.alt ?? '',
      compte: nb('accessoire_cils'),
      rupture: false,
      decor: (
        <Regard className="absolute top-[8%] right-[6%] w-[42%] max-w-[220px] drop-shadow-[0_2px_8px_rgb(0_0_0/0.35)]" />
      ),
      classe: 'lg:col-span-5 aspect-[16/11]',
      position: 'object-center',
    },
    {
      cle: 'soins',
      titre: 'Soins et pose',
      texte: 'La gamme professionnelle : fixer, fondre, coiffer, retirer.',
      vers: CHEMINS.produits,
      image: PHOTO_LA_GAMME.grande,
      alt: PHOTO_LA_GAMME.alt,
      compte: nb('produit'),
      rupture: false,
      decor: null,
      classe: 'lg:col-span-5 aspect-[16/11]',
      position: 'object-[50%_60%]',
    },
  ]
  return (
    <section
      aria-labelledby="titre-univers"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24"
    >
      <Revele className="mb-10 grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-end">
        <h2
          id="titre-univers"
          className="titre-affiche text-[40px] leading-[1.02] text-encre sm:text-[60px]"
        >
          Cheveux, regard,
          <br />
          <span className="text-or-texte">rituel.</span>
        </h2>
        <p className="max-w-md text-[17px] leading-relaxed text-encre-2 lg:justify-self-end">
          Trois univers, un même savoir-faire : nos prestations capillaires et les produits pour
          faire durer la pose chez vous.
        </p>
      </Revele>
      <ul className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
        {tuiles.map((t, i) => (
          <Tuile key={t.cle} indice={i} className={cx('relative', t.classe)}>
            <Link
              to={t.vers}
              className="group absolute inset-0 isolate overflow-hidden rounded-panneau bg-encre no-underline"
            >
              {t.image && (
                <span className="parallaxe absolute inset-0 -z-10 block">
                  <img
                    src={t.image}
                    alt={t.alt}
                    loading="lazy"
                    decoding="async"
                    className={cx(
                      'absolute inset-0 -z-10 size-full object-cover transition-transform duration-[1400ms] ease-(--ease-sortie) group-hover:scale-[1.05] motion-reduce:group-hover:scale-100',
                      t.position,
                    )}
                  />
                </span>
              )}
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(15_15_14/0)_35%,rgb(15_15_14/0.82)_100%)]"
              />
              {t.decor}
              {t.rupture && (
                <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-[#17140f]/80 px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.1em] text-[#f3d89f] uppercase backdrop-blur-sm">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-[#f3d89f]" />
                  Rupture de stock
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
                <span className="max-w-sm">
                  <span className="block text-[30px] font-semibold tracking-[-0.025em] text-[#fffaf0] sm:text-[40px]">
                    {t.titre}
                  </span>
                  <span className="mt-1.5 block text-[14px] leading-snug text-[#f1e7d4] sm:text-[15px]">
                    {t.texte}
                    {t.compte ? ` ${String(t.compte)} références.` : ''}
                  </span>
                </span>
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#fffaf0] text-[#17140f] transition-transform duration-500 group-hover:translate-x-1 [&_svg]:size-5">
                  <ArrowRight aria-hidden="true" />
                </span>
              </span>
            </Link>
          </Tuile>
        ))}
      </ul>
    </section>
  )
}

function Tuile({
  indice,
  className,
  children,
}: {
  indice: number
  className: string
  children: React.ReactNode
}) {
  const ref = useRevele(indice)
  return (
    <li ref={ref} className={className}>
      {children}
    </li>
  )
}
