// features/game/gameTypes.ts — types partagés de la logique de partie (useGame / useRogue).
import type { GameDetail, GameMode, LevelId, Theme } from '@lib/types.js';
import type { Relic, RogueBonus } from '@lib/relics.js';
import type { PalierRogue } from '@lib/rogueRun.js';
import type { DrawnQuestion, GameLaunchConfig } from './draw.js';

/** Phases d'une partie : attente (duel), question en cours, réponse verrouillée, choix de relique (rogue). */
export type GamePhase = 'attente' | 'question' | 'reponse' | 'relique';

/** Un morceau de confetti (positions/taille/couleur calculés au lancement). */
export interface ConfettiPiece {
  id: string;
  left: number;
  delay: number;
  couleur: string;
  taille: number;
  rotation: number;
}

/** Détail interne d'une question jouée : GameDetail + champs de stats avancées. */
export interface DetailPartie extends GameDetail {
  streak: number;
  bonusStreak: number;
  secondes: number;
}

/** État complet d'une partie exposé aux composants d'affichage. */
export interface GameState {
  config: GameLaunchConfig;
  mode: GameMode;
  niveau: LevelId | string | null;
  theme: Theme;
  players: string[];
  nbJoueurs: number;
  questions: DrawnQuestion[];
  question: DrawnQuestion;
  index: number;
  currentPlayer: number;
  phase: GamePhase;
  time: number;
  second: number;
  selection: number | null;
  scores: number[];
  bonnes: number[];
  lastGain: number;
  lastBonus: number;
  streaks: number[];
  confetti: ConfettiPiece[];
  isReported: boolean;
  answer: (i: number | null) => void;
  suivant: () => void;
  pret: () => void;
  finir: () => void;
  abandonner: () => void;
  reportQuestion: () => void;
  // --- Rogue Quizz ---
  relics: Relic[];
  proposals: Relic[];
  rogueBonus: RogueBonus;
  /** Question affichée (reliques 50/50, Domino, Miroir… appliquées). */
  questionAffichage: DrawnQuestion;
  /** Durée du timer de la question courante (niveau + reliques). */
  dureeQuestion: number;
  /** Secondes écoulées sur la question courante (pour Élimination / Brouillard). */
  ecoulees: number;
  /** Secondes restantes pour le choix de relique (auto-choix à 0). */
  tempsChoix: number;
  /** Vies restantes / vies max (mode rogue). */
  vies: number;
  viesMax: number;
  /** Compteurs du palier courant. */
  palier: PalierRogue;
  /** Mise placée sur la question courante (Pari). */
  pariPlacee: boolean;
  /** Gel du chrono en cours (Arrêt sur image), secondes restantes. */
  geleRestant: number;
  /** La bonne réponse est montrée (Rayon X). */
  bonneRevelee: boolean;
  /** Relique « Timer figé » (gel manuel) : le chrono est en pause. */
  timerFige: boolean;
  /** Indices de réponses surlignées (Loupe). */
  surbrillance: number[];
  /** Indice de la réponse barrée (Lunettes rouges). */
  barree: number | null;
  /** Pourcentages du Vote du public. */
  votePcts: number[] | null;
  /** La bonne réponse scintille (Intuition). */
  scintille: boolean;
  /** Choix de relique : étape recyclage ('sacrifice' = choisir une relique à retirer). */
  recyclageEtape: 'sacrifice' | 'nouveau' | null;
  /** Spécialiste : choisir le thème spécial (overlay de thèmes). */
  themeAPicker: boolean;
  /** Thème choisi par Spécialiste. */
  themeSpecialiste: string | null;
  choisirRelique: (id: string) => void;
  /** Refuser le choix de relique (Ascète : +150 pts). */
  refuserChoix: () => void;
  /** Retirer une relique possédée (Recyclage, étape sacrifice). */
  sacrifierRelique: (id: string) => void;
  /** Choisir le thème de Spécialiste. */
  choisirThemeSpecialiste: (themeId: string) => void;
  gelerChrono: () => void;
  miser: () => void;
  passerTheme: () => void;
  annulerReponse: () => void;
}

/** Pastille de thème affichée dans la barre du haut (champs optionnels : thème courant variable). */
export interface ThemeBadge {
  nom?: string;
  icone?: string;
  couleur?: string;
}

/** État de jeu enrichi pour l'affichage : GameState + manche en cours et thème courant. */
export interface GameViewState extends GameState {
  round: number;
  bonus: boolean;
  withRounds: boolean;
  currentTheme: ThemeBadge;
}
