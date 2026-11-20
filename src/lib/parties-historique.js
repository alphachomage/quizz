// parties-historique.js — historique local des parties (leaderboard + stats).
// Chaque partie terminée est enregistrée : 500 dernières parties max.
import { CLES, lire, ecrire } from './storage.js';

export function chargerParties() {
  return lire(CLES.parties, []) || [];
}

export function ajouterPartie(partie) {
  const liste = chargerParties();
  liste.push({ id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, date: new Date().toISOString(), ...partie });
  ecrire(CLES.parties, liste.slice(-500)); // on garde les 500 dernières parties max
}
