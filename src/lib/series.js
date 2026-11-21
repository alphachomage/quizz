// series.js — anti-répétition : la dernière série de questions jouée est mémorisée
// par mode/niveau/thème, pour que « Rejouer » ne retombe JAMAIS sur la même série.
import { SeriesRepo } from './repositories.js';
import { normalizeQuestionText } from './text.js';
export function seriesKey(mode, niveau, themeId) {
  return `${mode}:${niveau || 'mix'}:${themeId}`;
}
export function loadSeries(key) {
  const m = SeriesRepo.all();
  return Array.isArray(m[key]) ? m[key] : [];
}
function saveSeries(key, questions) {
  const m = SeriesRepo.all();
  m[key] = questions.map((q) => normalizeQuestionText(q.q));
  SeriesRepo.save(m);
}

// Retire du pool les questions de la dernière série jouée (si ça laisse assez de questions).
export { saveSeries };
export function poolWithoutPreviousSeries(pool, key, nbMin) {
  const excl = new Set(loadSeries(key));
  if (excl.size === 0) return pool;
  const dispo = pool.filter((q) => !excl.has(normalizeQuestionText(q.q)));
  return dispo.length >= nbMin ? dispo : pool;
}
