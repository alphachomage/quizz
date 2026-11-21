// suggestions.js — suggestions / remontées des joueurs.
// Stockées via lib/storage.js et visibles UNIQUEMENT dans la vue admin (?admin=1) :
// jamais affichées dans l'interface joueur.
import { SuggestionsRepo } from './repositories.js';

export function loadSuggestions() {
  const l = SuggestionsRepo.tout();
  return Array.isArray(l) ? l : [];
}

export function addSuggestion(texte, pseudo) {
  const t = String(texte || '').trim();
  if (!t) return null;
  const s = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    texte: t.slice(0, 2000),
    pseudo: String(pseudo || 'Anonyme').slice(0, 30),
    date: new Date().toISOString(),
  };
  const list = loadSuggestions();
  list.unshift(s); // plus récente en premier
  SuggestionsRepo.sauver(list.slice(0, 200));
  return s;
}

export function removeSuggestion(id) {
  SuggestionsRepo.sauver(loadSuggestions().filter((s) => s.id !== id));
}
