// series.ts — anti-répétition : la dernière série de questions jouée est mémorisée
// par mode/niveau/thème, pour que « Rejouer » ne retombe JAMAIS sur la même série.
import { SeriesRepo } from './repositories.js';
import { normalizeQuestionText } from './text.js';

export function seriesKey(mode: string, niveau: string | null | undefined, themeId: string): string {
  return `${mode}:${niveau || 'mix'}:${themeId}`;
}
export function loadSeries(key: string): string[] {
  const m = SeriesRepo.all() as Record<string, string[]>;
  return Array.isArray(m[key]) ? m[key] : [];
}
function saveSeries(key: string, questions: { q: string }[]): void {
  const m = SeriesRepo.all() as Record<string, string[]>;
  m[key] = questions.map((q) => normalizeQuestionText(q.q));
  SeriesRepo.save(m);
}

// Retire du pool les questions de la dernière série jouée (si ça laisse assez de questions).
export { saveSeries };
export function poolWithoutPreviousSeries<T extends { q: string }>(
  pool: T[],
  key: string,
  nbMin: number
): T[] {
  const excl = new Set(loadSeries(key));
  if (excl.size === 0) return pool;
  const dispo = pool.filter((q) => !excl.has(normalizeQuestionText(q.q)));
  return dispo.length >= nbMin ? dispo : pool;
}
