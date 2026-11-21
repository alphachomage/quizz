// parties-historique.js — historique local des parties (leaderboard + stats).
// Chaque partie terminée est enregistrée : 500 dernières parties max.
import { GamesRepo } from './repositories.js';

export function loadGames() {
  return GamesRepo.tout();
}

export function addGame(game) {
  const list = loadGames();
  list.push({ id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, date: new Date().toISOString(), ...game });
  GamesRepo.sauver(list.slice(-GamesRepo.LIMITE)); // on garde les 500 dernières max
}
