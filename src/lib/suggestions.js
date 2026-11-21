// suggestions.js — suggestions / remontées des joueurs.
// Stockées via lib/storage.js et visibles UNIQUEMENT dans la vue admin (?admin=1) :
// jamais affichées dans l'interface joueur.
import { SuggestionsRepo } from './repositories.js';
export function loadSuggestions() {
  const l = SuggestionsRepo.all();
  return Array.isArray(l) ? l : [];
}
export function addSuggestion(text, pseudo) {
  const t = String(text || '').trim();
  if (!t) return null;
  const s = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    text: t.slice(0, 2000),
    pseudo: String(pseudo || 'Anonyme').slice(0, 30),
    date: new Date().toISOString(),
  };
  const list = loadSuggestions();
  list.unshift(s); // plus récente en premier
  SuggestionsRepo.save(list.slice(0, 200));
  return s;
}
export function removeSuggestion(id) {
  SuggestionsRepo.save(loadSuggestions().filter((s) => s.id !== id));
}
