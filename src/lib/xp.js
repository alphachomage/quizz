// xp.js — XP et niveaux par thème (courbe racine). Stockée via lib/storage.js.
import { XpRepo } from './repositories.js';
export function loadXp() {
  return XpRepo.all();
}

// Ajoute de l'XP à un thème (appelé à chaque partie terminée). Retourne le nouveau total.
export function addXp(themeId, montant) {
  const xp = loadXp();
  xp[themeId] = (xp[themeId] || 0) + montant;
  XpRepo.save(xp);
  return xp[themeId];
}

// Niveau d'un thème (courbe racine) : niv. 2 à 100 XP, niv. 3 à 400 XP, niv. 4 à 900 XP...
export function themeLevel(xp) {
  return 1 + Math.floor(Math.sqrt((xp || 0) / 100));
}

// XP total requise pour atteindre un niveau.
export function xpForLevel(n) {
  return 100 * (n - 1) * (n - 1);
}
