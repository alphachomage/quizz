// signalements.js — questions signalées (pouce rouge) et vérification admin.
// PAS affiché dans l'interface joueur : visible uniquement dans la vue admin (?admin=1).
// Stocké via lib/storage.js : { q, themeId, themeNom, count, date, dernier }
// « count » = nombre de signalements reçus pour cette question.
import { ReportsRepo } from './repositories.js';
import { normalizeQuestionText } from './texte.js';
import { addExclusion, retirerExclusion } from './exclusions.js';

export function loadReports() {
  return ReportsRepo.tout();
}

export function addReport(s) {
  const list = loadReports();
  const existant = list.find((x) => x.q === s.q);
  if (existant) {
    existant.count = (existant.count || 1) + 1;
    existant.dernier = new Date().toISOString();
  } else {
    list.push({ id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, date: new Date().toISOString(), count: 1, ...s });
  }
  ReportsRepo.sauver(list);
  return list;
}

export function removeReport(q) {
  ReportsRepo.sauver(loadReports().filter((x) => x.q !== q));
}

export function clearReports() {
  ReportsRepo.vider();
}

// Vérification admin d'un signalement : statut 'garder' (la question reste dans le pool)
// ou 'retirer' (la question est exclue du pool, via la liste des exclusions).
export function markReport(q, statut) {
  const list = loadReports();
  const s = list.find((x) => x.q === q);
  if (s) {
    s.statut = statut;
    s.revuLe = new Date().toISOString();
    ReportsRepo.sauver(list);
  }
  const n = normalizeQuestionText(q);
  if (statut === 'retirer') addExclusion(n);
  else retirerExclusion(n);
}
