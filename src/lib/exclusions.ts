// exclusions.ts — questions retirées du pool par l'admin (signalées puis validées
// comme mauvaises). Le filtre est appliqué au chargement des questions.
import { ExcludedRepo } from './repositories.js';

export function loadExcluded(): string[] {
  return ExcludedRepo.all();
}
function saveExcluded(list: string[]): void {
  ExcludedRepo.save(list);
}
export function addExclusion(normalizedText: string): void {
  const list = loadExcluded();
  if (!list.includes(normalizedText)) {
    list.push(normalizedText);
    saveExcluded(list);
  }
}
function removeExclusion(normalizedText: string): void {
  saveExcluded(loadExcluded().filter((x) => x !== normalizedText));
}
export { removeExclusion };
