// signalements.js — questions signalées (pouce rouge) et vérification admin.
// PAS affiché dans l'interface joueur : visible uniquement dans la vue admin (?admin=1).
// Stocké via lib/storage.js : { q, themeId, themeNom, count, date, dernier }
// « count » = nombre de signalements reçus pour cette question.
import { SignalesRepo } from './repositories.js';
import { normaliserTexteQuestion } from './texte.js';
import { ajouterExclusion, retirerExclusion } from './exclusions.js';

export function chargerSignales() {
  return SignalesRepo.tout();
}

export function ajouterSignalement(s) {
  const liste = chargerSignales();
  const existant = liste.find((x) => x.q === s.q);
  if (existant) {
    existant.count = (existant.count || 1) + 1;
    existant.dernier = new Date().toISOString();
  } else {
    liste.push({ id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, date: new Date().toISOString(), count: 1, ...s });
  }
  SignalesRepo.sauver(liste);
  return liste;
}

export function supprimerSignalement(q) {
  SignalesRepo.sauver(chargerSignales().filter((x) => x.q !== q));
}

export function viderSignales() {
  SignalesRepo.vider();
}

// Vérification admin d'un signalement : statut 'garder' (la question reste dans le pool)
// ou 'retirer' (la question est exclue du pool, via la liste des exclusions).
export function marquerSignalement(q, statut) {
  const liste = chargerSignales();
  const s = liste.find((x) => x.q === q);
  if (s) {
    s.statut = statut;
    s.revuLe = new Date().toISOString();
    SignalesRepo.sauver(liste);
  }
  const n = normaliserTexteQuestion(q);
  if (statut === 'retirer') ajouterExclusion(n);
  else retirerExclusion(n);
}
