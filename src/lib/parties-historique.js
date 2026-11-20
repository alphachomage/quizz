// parties-historique.js — historique local des parties (leaderboard + stats).
// Chaque partie terminée est enregistrée : 500 dernières parties max.
import { PartiesRepo } from './repositories.js';

export function chargerParties() {
  return PartiesRepo.tout();
}

export function ajouterPartie(partie) {
  const liste = chargerParties();
  liste.push({ id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, date: new Date().toISOString(), ...partie });
  PartiesRepo.sauver(liste.slice(-PartiesRepo.LIMITE)); // on garde les 500 dernières max
}
