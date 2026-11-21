// game-history.ts — historique des parties (leaderboard + stats).
// Chaque partie terminée est enregistrée : 500 dernières max, en local (sync_client)
// ET, en mode 'd1', dans la table D1 « parties » (best-effort, pour le futur
// classement global et GET /api/parties?pseudo=).
import { GamesRepo } from './repositories.js';
import type { StoredGame } from './repositories.js';
import { STORAGE_MODE } from './storage.js';
import { apiAddGame } from './api.js';
import { currentSession } from './accounts.js';

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
  const stockee: StoredGame = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    date: new Date().toISOString(),
    ...game,
  };
  GamesRepo.save([...list, stockee].slice(-GamesRepo.LIMITE)); // on garde les 500 dernières max
  // Mode 'd1' : la partie part aussi dans la table D1 « parties » (colonne pseudo
  // indexée). Best-effort : en cas d'échec, elle reste dans sync_client (voltquiz_parties).
  if (STORAGE_MODE === 'd1') {
    const pseudo = currentSession()?.pseudo ?? null;
    const joueurs = stockee.players || [];
    void apiAddGame({
      ...stockee,
      pseudo,
      players: joueurs,
      scores: joueurs.map((p) => p.score),
      bonnes: joueurs.map((p) => p.bonnes),
    }).catch(() => {});
  }
}
