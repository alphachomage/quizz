// game-history.ts — historique local des parties (leaderboard + stats).
// Chaque partie terminée est enregistrée : 500 dernières parties max.
import { GamesRepo } from './repositories.js';
import type { GameDetail, GameMode } from './types.js';

/** Score d'un joueur pour une partie enregistrée. */
export interface StoredPlayer {
  nom: string;
  score: number;
  bonnes: number;
}

/** Une partie telle que persistée dans l'historique local (clé voltquiz_parties). */
export interface StoredGame {
  id: string;
  date: string; // ISO 8601
  mode: GameMode;
  niveau: string | null;
  themeId: string;
  themeName?: string;
  total: number;
  details?: GameDetail[];
  players: StoredPlayer[];
}

/** Partie à enregistrer : `id` et `date` sont ajoutés automatiquement. */
export type NewGame = Omit<StoredGame, 'id' | 'date'>;

export function loadGames(): StoredGame[] {
  return GamesRepo.all();
}
export function addGame(game: NewGame): void {
  const list = loadGames();
  list.push({
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    date: new Date().toISOString(),
    ...game,
  });
  GamesRepo.save(list.slice(-GamesRepo.LIMITE)); // on garde les 500 dernières max
}
