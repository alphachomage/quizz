// game-history.ts — historique local des parties (leaderboard + stats).
// Chaque partie terminée est enregistrée : 500 dernières parties max.
import { GamesRepo } from './repositories.js';
import type { StoredGame } from './repositories.js';

// StoredGame est défini dans repositories.ts (couche persistance) et ré-exporté ici.
export type { StoredGame };

/** Score d'un joueur pour une partie enregistrée. */
export type StoredPlayer = StoredGame['players'][number];

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
