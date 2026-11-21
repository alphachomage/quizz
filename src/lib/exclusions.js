// exclusions.js — questions retirées du pool par l'admin (signalées puis validées
// comme mauvaises). Le filtre est appliqué au chargement des questions.
import { ExcludedRepo } from './repositories.js';
export function loadExcluded() {
  return ExcludedRepo.all();
}
function saveExcluded(list) {
  ExcludedRepo.save(list);
}
export function addExclusion(normalizedText) {
  const list = loadExcluded();
  if (!list.includes(normalizedText)) {
    list.push(normalizedText);
    saveExcluded(list);
  }
}
function removeExclusion(normalizedText) {
  saveExcluded(loadExcluded().filter((x) => x !== normalizedText));
}
export { removeExclusion };
