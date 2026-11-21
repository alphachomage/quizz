// exclusions.js — questions retirées du pool par l'admin (signalées puis validées
// comme mauvaises). Le filtre est appliqué au chargement des questions.
import { ExcludedRepo } from './repositories.js';

export function loadExcluded() {
  return ExcludedRepo.tout();
}

function sauverExclues(list) {
  ExcludedRepo.sauver(list);
}

export function addExclusion(texteNormalise) {
  const list = loadExcluded();
  if (!list.includes(texteNormalise)) {
    list.push(texteNormalise);
    sauverExclues(list);
  }
}

export function retirerExclusion(texteNormalise) {
  sauverExclues(loadExcluded().filter((x) => x !== texteNormalise));
}
