// prefs.ts — préférences d'affichage (sons / musique / animations / vibrations)
// et accessibilité (thème clair, daltonien, dys). Stockées via lib/storage.ts.
import { PrefsRepo } from './repositories.js';
import type { Prefs } from './types.js';

// Toutes les préférences sont ACTIVÉES par défaut (sauf accessibilité, OFF).
export function loadPrefs(): Prefs {
  const p = PrefsRepo.all();
  return {
    sons: p.sons !== false,
    music: p.music !== false,
    // musique de fond (toggle séparé, ON par défaut)
    animations: p.animations !== false,
    vibrations: p.vibrations !== false,
    // Accessibilité : thème clair, mode daltonien, mode dys (tous OFF par défaut)
    themeClair: p.themeClair === true,
    daltonien: p.daltonien === true,
    dys: p.dys === true,
  };
}
function savePrefs(prefs: Partial<Prefs>): void {
  PrefsRepo.save({
    sons: prefs.sons !== false,
    music: prefs.music !== false,
    animations: prefs.animations !== false,
    vibrations: prefs.vibrations !== false,
    themeClair: prefs.themeClair === true,
    daltonien: prefs.daltonien === true,
    dys: prefs.dys === true,
  });
}
export { savePrefs };
