// features/game/constants.ts — constantes d'affichage de l'écran de jeu.

// Les 4 couleurs des réponses, comme dans QuizUp.
export const ANSWER_COLORS: string[] = ['#5b8def', '#ff5d73', '#ffb020', '#2fd27a'];

// Mode daltonien : palette Okabe-Ito (distinguable par toutes les formes de daltonisme)
// + lettres A/B/C/D sur chaque réponse pour ne pas dépendre que de la couleur.
export const COLORBLIND_COLORS: string[] = ['#0072B2', '#E69F00', '#009E73', '#D55E00'];

export const COLORBLIND_TF: { vrai: string; faux: string } = {
  vrai: '#0072B2',
  faux: '#D55E00',
};

export const LETTERS: string[] = ['A', 'B', 'C', 'D'];

export const CONFETTI_COLORS: string[] = [
  '#8b5cf6',
  '#f472b6',
  '#5b8def',
  '#2fd27a',
  '#ffb020',
  '#ffffff',
];
