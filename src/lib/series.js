// series.js — anti-répétition : la dernière série de questions jouée est mémorisée
// par mode/niveau/thème, pour que « Rejouer » ne retombe JAMAIS sur la même série.
import { SeriesRepo } from './repositories.js';
import { normaliserTexteQuestion } from './texte.js';

export function cleSerie(mode, niveau, themeId) {
  return `${mode}:${niveau || 'mix'}:${themeId}`;
}

export function chargerSerie(cle) {
  const m = SeriesRepo.tout();
  return Array.isArray(m[cle]) ? m[cle] : [];
}

export function sauverSerie(cle, questions) {
  const m = SeriesRepo.tout();
  m[cle] = questions.map((q) => normaliserTexteQuestion(q.q));
  SeriesRepo.sauver(m);
}

// Retire du pool les questions de la dernière série jouée (si ça laisse assez de questions).
export function poolSansSeriePrecedente(pool, cle, nbMin) {
  const excl = new Set(chargerSerie(cle));
  if (excl.size === 0) return pool;
  const dispo = pool.filter((q) => !excl.has(normaliserTexteQuestion(q.q)));
  return dispo.length >= nbMin ? dispo : pool;
}
