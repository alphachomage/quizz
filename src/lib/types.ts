// types.ts — types métier cœur de VQuizz, partagés par tout src/.
// Rappel règle 2 : les CLÉS du schéma de données restent en français (q, reponses, bonne,
// niveau, info, nom, icone, couleur) car c'est le format JSON documenté pour le client ;
// le schéma zod (schema.ts) en reste la validation runtime (z.infer pour les types).

/** Niveaux de difficulté (ids persistés dans les records et clés de stockage). */
export type LevelId = 'facile' | 'moyen' | 'dur';

/** Une question (format JSON documenté — clés en français). */
export interface Question {
  /** Id stable (content/questions/*.json) ; absent des questions communautaires/utilisateur. */
  id?: string;
  q: string;
  reponses: string[];
  bonne: number;
  niveau: LevelId;
  info?: string;
}

/** Un thème du catalogue (base intégrée + fichier perso + questions validées). */
export interface Theme {
  id: string;
  nom?: string;
  icone?: string;
  couleur?: string;
  questions: Question[];
}

/** Question enrichie de son thème d'origine (modes multi-thèmes : rogue, quotidien). */
export interface TaggedQuestion extends Question {
  themeId: string;
  themeName?: string;
  themeColor?: string;
  themeIcon?: string;
}

/** Modes de jeu. */
export type GameMode = 'solo' | 'duel' | 'rogue' | 'quotidien';

/** Config de lancement d'une partie (depuis l'accueil). */
export interface GameConfig {
  mode: GameMode;
  niveau: LevelId | null;
  theme: Theme;
  /** Rogue / quizz du jour : tous les thèmes mélangés. */
  allThemes?: Theme[];
}

/** Détail question par question d'une partie (persisté dans l'historique). */
export interface GameDetail {
  themeId: string;
  themeName?: string;
  niveau: LevelId | string;
  correct: boolean;
  gain: number;
  /** Texte de la question (pour les stats de qualité : taux de réussite par question). */
  q?: string;
}

/** Résultat d'une partie terminée (persisté + affiché sur l'écran de résultats). */
export interface GameResult {
  mode: GameMode;
  niveau: LevelId | string | null;
  theme: Theme;
  players: string[];
  scores: number[];
  bonnes: number[];
  total: number;
  details?: GameDetail[];
  /** Rogue Quizz : ids des reliques choisies pendant la run (affichage résultats). */
  relics?: string[];
}

/** Préférences d'affichage + accessibilité (clés persistées en français, voir prefs.ts). */
export interface Prefs {
  sons: boolean;
  music: boolean;
  animations: boolean;
  vibrations: boolean;
  themeClair: boolean;
  daltonien: boolean;
  dys: boolean;
}

/** Compte local (mot de passe JAMAIS stocké en clair : hash + sel). */
export interface Account {
  pseudo: string;
  pseudoNormalise: string;
  email: string;
  hash: string;
  sel: string;
  hashVersion?: number;
  avatar?: string | null;
  creeLe?: string;
  dernierLogin?: string;
}

/** Session active (compte ou invité). */
export interface Session {
  pseudo: string;
  invite?: boolean;
  avatar?: string | null;
}

/** Soumission de question (en attente de validation manuelle). */
export interface Submission extends Question {
  themeId: string;
  id?: string;
  date?: string;
  auteur?: string;
}

/** Signalement d'une question (vue admin). */
export interface Report {
  q: string;
  themeId: string;
  count?: number;
  date?: string;
  statut?: 'garder' | 'retirer';
}

/** Override admin posé sur une question du corpus (clé = texte normalisé de la question). */
export type OverrideEntry = { action: 'supprimer' } | { action: 'modifier'; question: Question };

/** Suggestion de joueur (vue admin). */
export interface Suggestion {
  id: string;
  text: string;
  auteur?: string;
  date?: string;
}

/** Badge débloquable. */
export interface Badge {
  id: string;
  nom: string;
  description: string;
  icone: string;
  debloque: boolean;
  current?: number;
  target?: number;
}

/** Titre de profil débloquable. */
export interface Title {
  id: string;
  nom: string;
  debloque: boolean;
  current?: number;
  target?: number;
}
