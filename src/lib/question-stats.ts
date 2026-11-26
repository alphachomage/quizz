// question-stats.ts — statistiques de qualité des questions, calculées localement à
// partir de l'historique des parties (details[].correct + details[].q).
// Stockées via QuestionStatsRepo (clé voltquiz_stats_questions, sync D1 en mode 'd1'),
// indexées par le texte normalisé de la question.
//
// Usage : filterByQuality() retire du pool de tirage les questions « suspectes »
// (taux de réussite anormal après assez d'évaluations) — ex. une question mal
// formulée que personne ne réussit, ou une évidente que tout le monde réussit.
import { QuestionStatsRepo } from './repositories.js';
import type { QuestionStats } from './repositories.js';
import { normalizeQuestionText } from './text.js';
import type { GameDetail, Question } from './types.js';

/** Seuil minimal d'évaluations avant qu'une question puisse être jugée suspecte. */
export const MIN_EVALS = 20;
/** Taux de réussite en dessous duquel une question est considérée comme probablement fausse. */
export const TAUX_SUSPECT_FAUX = 0.05;
/** Taux de réussite au-dessus duquel une question est considérée comme trop facile (niveau dur). */
export const TAUX_SUSPECT_TROP_FACILE = 0.98;

type StatsMap = Record<string, QuestionStats>;

export function loadQuestionStats(): StatsMap {
  return QuestionStatsRepo.all();
}

// Enregistre le résultat des questions d'une partie (details avec q + correct).
export function recordResults(details: GameDetail[]): void {
  const map = loadQuestionStats();
  let dirty = false;
  for (const d of details) {
    if (!d.q) continue;
    const k = normalizeQuestionText(d.q);
    if (!k) continue;
    const s = map[k] || { total: 0, correct: 0 };
    s.total += 1;
    if (d.correct) s.correct += 1;
    map[k] = s;
    dirty = true;
  }
  if (dirty) QuestionStatsRepo.save(map);
}

// Retire du pool les questions suspectes (si ça laisse assez de questions).
export function filterByQuality<T extends Question>(
  pool: T[],
  niveau: string | null | undefined,
  nbMin: number
): T[] {
  const stats = loadQuestionStats();
  if (Object.keys(stats).length === 0) return pool;
  const dispo = pool.filter((q) => {
    const s = stats[normalizeQuestionText(q.q)];
    if (!s || s.total < MIN_EVALS) return true;
    const taux = s.correct / s.total;
    if (taux < TAUX_SUSPECT_FAUX) return false;
    if (niveau === 'dur' && taux > TAUX_SUSPECT_TROP_FACILE) return false;
    return true;
  });
  return dispo.length >= nbMin ? dispo : pool;
}
