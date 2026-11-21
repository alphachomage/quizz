// reports.ts — questions signalées (pouce rouge) et vérification admin.
// PAS affiché dans l'interface joueur : visible uniquement dans la vue admin (?admin=1).
// Stocké via lib/storage.js : { q, themeId, themeName, count, date, last, statut, revuLe }
// « count » = nombre de signalements reçus pour cette question.
import { ReportsRepo } from './repositories.js';
import { normalizeQuestionText } from './text.js';
import { addExclusion, removeExclusion } from './exclusions.js';
import type { Report } from './types.js';

// Signalement tel que persisté : le type métier Report + les champs d'historique
// et de modération (id, themeName, last, revuLe).
export interface StoredReport extends Report {
  id?: string;
  themeName?: string;
  last?: string;
  revuLe?: string;
}

// Données d'un nouveau signalement (envoyé par le pouce rouge pendant une partie).
export interface NewReport {
  q: string;
  themeId: string;
  themeName?: string;
}

// Décision admin sur un signalement : la question reste dans le pool ou en est retirée.
export type ReportStatut = 'garder' | 'retirer';

export function loadReports(): StoredReport[] {
  return ReportsRepo.all();
}
export function addReport(s: NewReport): StoredReport[] {
  const list = loadReports();
  const existant = list.find((x) => x.q === s.q);
  if (existant) {
    existant.count = (existant.count || 1) + 1;
    existant.last = new Date().toISOString();
  } else {
    list.push({
      id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      date: new Date().toISOString(),
      count: 1,
      ...s,
    });
  }
  ReportsRepo.save(list);
  return list;
}
export function removeReport(q: string): void {
  ReportsRepo.save(loadReports().filter((x) => x.q !== q));
}
export function clearReports(): void {
  ReportsRepo.clear();
}

// Vérification admin d'un signalement : statut 'garder' (la question reste dans le pool)
// ou 'retirer' (la question est exclue du pool, via la liste des exclusions).
export function markReport(q: string, statut: ReportStatut): void {
  const list = loadReports();
  const s = list.find((x) => x.q === q);
  if (s) {
    s.statut = statut;
    s.revuLe = new Date().toISOString();
    ReportsRepo.save(list);
  }
  const n = normalizeQuestionText(q);
  if (statut === 'retirer') addExclusion(n);
  else removeExclusion(n);
}
