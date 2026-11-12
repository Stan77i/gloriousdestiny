import type { ReactNode } from 'react'

/**
 * Les cinq étapes de chaque prestation, d'après les méthodes de pose et d'entretien
 * couramment pratiquées (guides de pose lace frontale, confection et soin des perruques).
 * Chaque étape : un nom court, une phrase, une icône au trait (grille 24 px).
 */
export type Etape = { nom: string; texte: string; icone: ReactNode }

/** Teintes des médaillons, dans l'ordre de l'arc : rose, bleu, violet, pêche, champagne. */
export const TEINTES = [
  { fond: '#f8d7e3', trait: '#a83a64', halo: 'rgb(214 92 140 / 0.45)' },
  { fond: '#d6e4f8', trait: '#2f5f9e', halo: 'rgb(84 136 214 / 0.45)' },
  { fond: '#e4d9f6', trait: '#6a45ad', halo: 'rgb(138 100 214 / 0.45)' },
  { fond: '#fbe2cf', trait: '#a8552a', halo: 'rgb(226 140 84 / 0.45)' },
  { fond: '#f5e6bd', trait: '#8a5d10', halo: 'rgb(214 167 86 / 0.5)' },
] as const

const i = (children: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

// Icônes partagées
const peigne = i(
  <>
    <rect x={3} y={8} width={18} height={4} rx={1.5} />
    <path d="M5.5 12v6M8.5 12v6M11.5 12v6M14.5 12v6M17.5 12v6" />
  </>,
)
const eclat = i(
  <>
    <path d="M12 3c.5 4 2 5.5 6 6-4 .5-5.5 2-6 6-.5-4-2-5.5-6-6 4-.5 5.5-2 6-6Z" />
    <path d="M18.5 15c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5Z" />
  </>,
)
const ciseaux = i(
  <>
    <circle cx={6} cy={17.5} r={2.5} />
    <circle cx={17.5} cy={17.5} r={2.5} />
    <path d="M7.8 15.8 18 4M15.7 15.8 5.5 4" />
  </>,
)

const goutte = i(
  <>
    <path d="M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9Z" />
    <path d="M9.5 13a2.5 2.5 0 0 0 2.5 2.5" />
  </>,
)

export const ETAPES: Record<string, Etape[]> = {
  // Ventilation : les cheveux sont noués un à un dans la dentelle, au crochet à ventiler.
  'ventilation-frontale-perruque': [
    {
      nom: 'Examiner',
      texte: 'On repère les zones clairsemées et la dentelle usée.',
      icone: i(
        <>
          <circle cx={10.5} cy={10.5} r={6} />
          <path d="m15 15 5.5 5.5" />
          <path d="M8 10.5h5M10.5 8v5" strokeDasharray="1.5 1.5" />
        </>,
      ),
    },
    { nom: 'Nettoyer', texte: 'Lavage doux et démêlage avant le travail.', icone: goutte },
    {
      nom: 'Ventiler',
      texte: 'Au crochet, les cheveux sont noués un à un dans la dentelle.',
      icone: i(
        <>
          <path d="M5 19 17 7" />
          <path d="M17 7c1.5-1.5 3.5-.5 3 1.3-.3 1-1.4 1.4-2.2.9" />
          <path d="M4 21l2-2" />
          <path d="M14 17c1 1.5 3 1.5 4 0" strokeDasharray="1.5 2" />
        </>,
      ),
    },
    {
      nom: 'Densifier',
      texte: 'Les manques sont comblés, la ligne frontale redessinée.',
      icone: i(
        <>
          <path d="M4 16c3-6 13-6 16 0" />
          <path d="M6.5 13.5v-3M9.5 11.8V8M12 11.2V7.5M14.5 11.8V8M17.5 13.5v-3" />
          <circle cx={6.5} cy={9.5} r={0.8} />
          <circle cx={17.5} cy={9.5} r={0.8} />
        </>,
      ),
    },
    { nom: 'Prête à porter', texte: 'Coiffage final : elle revit, prête à porter.', icone: eclat },
  ],
  'pose-frontale': [
    {
      nom: 'Préparer',
      texte: 'Cheveux tressés ou plaqués à plat sous un bonnet fin.',
      icone: i(
        <>
          <path d="M5 14a7 7 0 0 1 14 0" />
          <path d="M4 14h16" />
          <path d="M9 9.5c1 1 1 2.5 0 3.5M12 8.5c1 1 1 3 0 4.5M15 9.5c1 1 1 2.5 0 3.5" />
          <path d="M8 18c1.3 1.3 6.7 1.3 8 0" />
        </>,
      ),
    },
    {
      nom: 'Ajuster',
      texte: 'La dentelle est placée sur la lisière, l’excédent découpé.',
      icone: ciseaux,
    },
    {
      nom: 'Fixer',
      texte: 'Une fine couche de colle le long de la ligne frontale.',
      icone: i(
        <>
          <path d="M10 3h4v3h-4z" />
          <path d="M9 6h6l1 3v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9Z" />
          <path d="M12 12.5c1 1.2 1.5 2 1.5 2.7a1.5 1.5 0 0 1-3 0c0-.7.5-1.5 1.5-2.7Z" />
        </>,
      ),
    },
    {
      nom: 'Fondre',
      texte: 'La bande élastique fond la lace dans la peau.',
      icone: i(
        <>
          <path d="M3 12c3-3 15-3 18 0" />
          <path d="M3 12c3 3 15 3 18 0" />
          <path d="M3 9v6M21 9v6" />
          <path d="M8 12h8" strokeDasharray="1.5 2.5" />
        </>,
      ),
    },
    { nom: 'Coiffer', texte: 'Baby hair dessinés, finition naturelle.', icone: eclat },
  ],
  'traitement-de-perruque': [
    { nom: 'Démêler', texte: 'Pointes d’abord, au peigne à dents larges.', icone: peigne },
    {
      nom: 'Laver',
      texte: 'Shampoing doux, sans frotter les fibres.',
      icone: i(
        <>
          <path d="M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9Z" />
          <path d="M9.5 13a2.5 2.5 0 0 0 2.5 2.5" />
          <circle cx={18.5} cy={18} r={1.5} />
          <circle cx={5} cy={18.5} r={1} />
        </>,
      ),
    },
    {
      nom: 'Nourrir',
      texte: 'Un soin hydratant pénètre les fibres.',
      icone: i(
        <>
          <path d="M5 10h14v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z" />
          <path d="M4 7h16v3H4z" />
          <path d="M9 14.5c1.5 1 4.5 1 6 0" />
        </>,
      ),
    },
    {
      nom: 'Sécher',
      texte: 'Séchage doux, à l’air ou à basse température.',
      icone: i(
        <>
          <path d="M4 7.5A3.5 3.5 0 0 1 7.5 4H15v7H7.5A3.5 3.5 0 0 1 4 7.5Z" />
          <path d="M15 5.5h3M15 9.5h3M10 11l1.5 9h2L12 11" />
          <path d="M19.5 6c.8.8.8 2.2 0 3" />
        </>,
      ),
    },
    { nom: 'Sublimer', texte: 'Brillance et mise en forme, comme neuve.', icone: eclat },
  ],
  'coloration-de-perruque': [
    {
      nom: 'Choisir',
      texte: 'La nuance se choisit sur le nuancier, avec vous.',
      icone: i(
        <>
          <path d="M5 4h4v16H5z" />
          <path d="m9 7 4-2.5 2 3.5-6 4" />
          <path d="m9 14 7-3 1.5 3.7L9 19" />
          <circle cx={7} cy={17} r={0.8} />
        </>,
      ),
    },
    {
      nom: 'Préparer',
      texte: 'Le mélange est préparé selon la teinte voulue.',
      icone: i(
        <>
          <path d="M3 11h18a9 9 0 0 1-18 0Z" />
          <path d="M7 11c1-2 3-3 5-3s4 1 5 3" />
          <path d="M16 3l-3 6" />
        </>,
      ),
    },
    {
      nom: 'Appliquer',
      texte: 'Mèche par mèche, au pinceau, de façon homogène.',
      icone: i(
        <>
          <path d="m14 4 6 6-8.5 8.5a2 2 0 0 1-2.8 0L5.5 15.3a2 2 0 0 1 0-2.8Z" />
          <path d="m5 15-2 6 6-2" />
          <path d="m11 7 6 6" />
        </>,
      ),
    },
    {
      nom: 'Poser',
      texte: 'Temps de pose surveillé, puis rinçage soigneux.',
      icone: i(
        <>
          <path d="M7 3h10M7 21h10" />
          <path d="M8 3c0 4 8 5 8 9s-8 5-8 9M16 3c0 4-8 5-8 9s8 5 8 9" />
        </>,
      ),
    },
    { nom: 'Révéler', texte: 'Un soin fixe la couleur et la brillance.', icone: eclat },
  ],
  'montage-de-perruque': [
    {
      nom: 'Mesurer',
      texte: 'Tour de tête et longueurs, pour un ajustement parfait.',
      icone: i(
        <>
          <rect x={3} y={8} width={18} height={8} rx={2} />
          <path d="M7 8v3M11 8v4M15 8v3M19 8v2" />
        </>,
      ),
    },
    {
      nom: 'Préparer',
      texte: 'Le bonnet est tendu sur la tête de montage.',
      icone: i(
        <>
          <path d="M5 15a7 7 0 0 1 14 0Z" />
          <path d="M8 9.5 16 15M16 9.5 8 15M12 8v7M5.5 12.5h13" />
          <path d="M10 15v5h4v-5" />
        </>,
      ),
    },
    {
      nom: 'Placer',
      texte: 'La frontale ou la closure est positionnée et épinglée.',
      icone: i(
        <>
          <path d="M4 15c2-5 14-5 16 0" />
          <path d="M4 15c2 2 14 2 16 0" />
          <circle cx={8} cy={8} r={1.5} />
          <path d="M8 9.5V14" />
          <circle cx={16} cy={8} r={1.5} />
          <path d="M16 9.5V14" />
        </>,
      ),
    },
    {
      nom: 'Coudre',
      texte: 'Les tissages sont cousus rang par rang.',
      icone: i(
        <>
          <path d="M19 3 7 15" />
          <ellipse cx={18} cy={4.5} rx={1} ry={2} transform="rotate(45 18 4.5)" />
          <path d="M7 15c-3 2-3 5 0 5s3-3 6-3 4 2 6 1" strokeDasharray="2 2.2" />
        </>,
      ),
    },
    { nom: 'Finir', texte: 'Élastique, peignes et coupe de finition.', icone: ciseaux },
  ],
}
