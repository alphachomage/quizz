// scoring.ts — constantes du jeu, niveaux de difficulté, score arcade, manches.
// Module PUR : aucune dépendance au stockage ni au DOM.
import type { LevelId } from './types.js';

export const SECONDS_PER_QUESTION = 10; // secondes par question
export const SOLO_QUESTIONS = 10; // plafond de questions en solo (le pool réel peut être plus court)
export const DUEL_QUESTIONS = 6; // nombre de questions PAR JOUEUR en mode duel
export const DAILY_QUESTIONS = 10; // questions du quizz du jour
export const ROGUE_MAX = 100; // plafond de questions en mode Rogue Quizz (1re faute = fin)
export const ROGUE_STEP = 10; // Rogue Quizz : un choix de relique tous les ROGUE_STEP questions

/** Un niveau de difficulté (utilisé en mode solo). */
export interface Level {
  id: LevelId;
  nom: string;
  couleur: string;
}

// Les 3 niveaux de difficulté (utilisés en mode solo).
export const LEVELS: Level[] = [
  {
    id: 'facile',
    nom: 'Facile',
    couleur: '#4ade80',
  },
  {
    id: 'moyen',
    nom: 'Moyen',
    couleur: '#fbbf24',
  },
  {
    id: 'dur',
    nom: 'Difficile',
    couleur: '#fb7185',
  },
];
export function levelName(id: string | null | undefined): string {
  const n = LEVELS.find((x) => x.id === id);
  return n ? n.nom : 'Tous niveaux'; // rogue = paliers de niveaux progressifs (clé "mix")
}
function levelColor(id: string | null | undefined): string {
  const n = LEVELS.find((x) => x.id === id);
  return n ? n.couleur : '#a78bfa';
}

// --- Score façon arcade ---
// Bonne réponse : 20 pts de base, -1 pt par seconde écoulée (minimum 10 pts).
// Faux ou temps écoulé : 0 pt. En manche bonus, les points sont doublés.
// (max solo : 8x20 + 2x40 = 240 pts, hors bonus de série)
export { levelColor };
export function pointsFor(correct: boolean, secondsElapsed: number, bonus = false): number {
  if (!correct) return 0;
  const base = Math.max(10, 20 - Math.floor(secondsElapsed));
  return bonus ? base * 2 : base;
}

/** Manche d'une question : numéro de manche (1 à 3) et indicateur bonus (3e manche). */
export interface RoundInfo {
  round: number;
  bonus: boolean;
}

// --- Structure en manches ---
// Une partie = 3 manches ; la 3e manche est « bonus » (points x2).
export function roundInfo(index: number, total: number): RoundInfo {
  const taille = Math.ceil(total / 3);
  const round = Math.min(3, Math.floor(index / taille) + 1);
  return {
    round: round,
    bonus: round === 3,
  };
}
