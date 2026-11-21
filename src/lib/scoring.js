// scoring.js — constantes du jeu, niveaux de difficulté, score arcade, manches.
// Module PUR : aucune dépendance au stockage ni au DOM.

export const SECONDS_PER_QUESTION = 10; // secondes par question
export const SOLO_QUESTIONS = 10; // plafond de questions en solo (le pool réel peut être plus court)
export const DUEL_QUESTIONS = 6; // nombre de questions PAR JOUEUR en mode duel
export const DAILY_QUESTIONS = 10; // questions du quizz du jour
export const SURVIVAL_MAX = 30; // plafond de questions en mode survie (1re faute = fin)

// Les 3 niveaux de difficulté (utilisés en mode solo).
export const LEVELS = [
  { id: 'facile', nom: 'Facile', couleur: '#4ade80' },
  { id: 'moyen', nom: 'Moyen', couleur: '#fbbf24' },
  { id: 'dur', nom: 'Difficile', couleur: '#fb7185' },
];

export function levelName(id) {
  const n = LEVELS.find((x) => x.id === id);
  return n ? n.nom : 'Tous niveaux'; // survie = tous niveaux mélangés (clé "mix")
}

export function couleurNiveau(id) {
  const n = LEVELS.find((x) => x.id === id);
  return n ? n.couleur : '#a78bfa';
}

// --- Score façon arcade ---
// Bonne réponse : 20 pts de base, -1 pt par seconde écoulée (minimum 10 pts).
// Faux ou temps écoulé : 0 pt. En manche bonus, les points sont doublés.
// (max solo : 8x20 + 2x40 = 240 pts, hors bonus de série)
export function pointsFor(correct, secondesEcoulees, bonus = false) {
  if (!correct) return 0;
  const base = Math.max(10, 20 - Math.floor(secondesEcoulees));
  return bonus ? base * 2 : base;
}

// --- Structure en manches ---
// Une partie = 3 manches ; la 3e manche est « bonus » (points x2).
export function roundInfo(index, total) {
  const taille = Math.ceil(total / 3);
  const manche = Math.min(3, Math.floor(index / taille) + 1);
  return { manche, bonus: manche === 3 };
}
