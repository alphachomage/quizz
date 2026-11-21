// xp.ts — XP et niveaux par thème (courbe racine). Stockée en local (sync_client)
// et, en mode 'd1', aussi dans la table D1 « xp » (clé pseudo:themeId).
import { XpRepo } from './repositories.js';
import { STORAGE_MODE } from './storage.js';
import { apiSaveXp } from './api.js';
import { currentSession } from './accounts.js';

/** XP cumulée par thème (clé = themeId, valeur = XP totale). */
export type XpMap = Record<string, number>;

export function loadXp(): XpMap {
  return XpRepo.all();
}

// Ajoute de l'XP à un thème (appelé à chaque partie terminée). Retourne le nouveau total.
export function addXp(themeId: string, montant: number): number {
  const xp = loadXp();
  xp[themeId] = (xp[themeId] || 0) + montant;
  XpRepo.save(xp);
  // Mode 'd1' : l'XP part aussi dans la table D1 « xp » (best-effort).
  if (STORAGE_MODE === 'd1') {
    const pseudo = currentSession()?.pseudo;
    if (pseudo) void apiSaveXp(pseudo, themeId, xp[themeId]).catch(() => {});
  }
  return xp[themeId];
}

// Niveau d'un thème (courbe racine) : niv. 2 à 100 XP, niv. 3 à 400 XP, niv. 4 à 900 XP...
export function themeLevel(xp: number): number {
  return 1 + Math.floor(Math.sqrt((xp || 0) / 100));
}

// XP total requise pour atteindre un niveau.
export function xpForLevel(n: number): number {
  return 100 * (n - 1) * (n - 1);
}
