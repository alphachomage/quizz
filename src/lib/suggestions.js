// suggestions.js — suggestions / remontées des joueurs.
// Stockées via lib/storage.js et visibles UNIQUEMENT dans la vue admin (?admin=1) :
// jamais affichées dans l'interface joueur.
import { SuggestionsRepo } from './repositories.js';

export function chargerSuggestions() {
  const l = SuggestionsRepo.tout();
  return Array.isArray(l) ? l : [];
}

export function ajouterSuggestion(texte, pseudo) {
  const t = String(texte || '').trim();
  if (!t) return null;
  const s = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    texte: t.slice(0, 2000),
    pseudo: String(pseudo || 'Anonyme').slice(0, 30),
    date: new Date().toISOString(),
  };
  const liste = chargerSuggestions();
  liste.unshift(s); // plus récente en premier
  SuggestionsRepo.sauver(liste.slice(0, 200));
  return s;
}

export function supprimerSuggestion(id) {
  SuggestionsRepo.sauver(chargerSuggestions().filter((s) => s.id !== id));
}
