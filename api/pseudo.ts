// api/pseudo.ts — normalisation serveur des pseudos.
import { normalizePseudo as normalizePseudoClient } from '../src/lib/moderation.js';

// Normalisation serveur = CELLE DU CLIENT (avec décodage leetspeak) :
// sinon "Joris" et "J0ris" seraient deux comptes distincts (doublon visuel).
// On garde un wrapper `unknown -> string` pour les appels existants.
export function normalizePseudo(p: unknown): string {
  return normalizePseudoClient(String(p || ''));
}
