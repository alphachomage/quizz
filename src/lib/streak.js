// streak.js — série de jours du quizz du jour (façon Snapchat, mais avec un éclair).
// { compte: N, dernierJour: 'AAAA-MM-JJ' } — +1 si joué hier, sinon recommence à 1.
import { StreakJourRepo } from './repositories.js';
import { dateAujourdhui, dateJour } from './dates.js';

export function chargerStreakJour() {
  return StreakJourRepo.lire();
}

// Pour l'affichage : si le dernier jour joué est antérieur à hier, la série est rompue.
export function streakJourActuelle() {
  const s = chargerStreakJour();
  if (!s.dernierJour || s.dernierJour < dateJour(-1)) return { compte: 0, dernierJour: s.dernierJour };
  return s;
}

// Appelé à la fin d'une partie « quizz du jour » : incrémente la série si joué hier.
export function enregistrerStreakJour() {
  const aujourdhui = dateAujourdhui();
  const hier = dateJour(-1);
  const s = chargerStreakJour();
  let compte = 1;
  if (s.dernierJour === hier) compte = (s.compte || 0) + 1;
  else if (s.dernierJour === aujourdhui) compte = s.compte || 1;
  const nouveau = { compte, dernierJour: aujourdhui };
  StreakJourRepo.sauver(nouveau);
  return nouveau;
}
