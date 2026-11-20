// prefs.js — préférences d'affichage (sons / musique / animations / vibrations)
// et accessibilité (thème clair, daltonien, dys). Stockées via lib/storage.js.
import { CLES, lire, ecrire } from './storage.js';

// Toutes les préférences sont ACTIVÉES par défaut (sauf accessibilité, OFF).
export function chargerPrefs() {
  const p = lire(CLES.prefs, {}) || {};
  return {
    sons: p.sons !== false,
    musique: p.musique !== false, // musique de fond (toggle séparé, ON par défaut)
    animations: p.animations !== false,
    vibrations: p.vibrations !== false,
    // Accessibilité : thème clair, mode daltonien, mode dys (tous OFF par défaut)
    themeClair: p.themeClair === true,
    daltonien: p.daltonien === true,
    dys: p.dys === true,
  };
}

export function sauverPrefs(prefs) {
  ecrire(CLES.prefs, {
    sons: prefs.sons !== false,
    musique: prefs.musique !== false,
    animations: prefs.animations !== false,
    vibrations: prefs.vibrations !== false,
    themeClair: prefs.themeClair === true,
    daltonien: prefs.daltonien === true,
    dys: prefs.dys === true,
  });
}
