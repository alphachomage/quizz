// exclusions.js — questions retirées du pool par l'admin (signalées puis validées
// comme mauvaises). Le filtre est appliqué au chargement des questions.
import { ExcluesRepo } from './repositories.js';

export function chargerExclues() {
  return ExcluesRepo.tout();
}

function sauverExclues(liste) {
  ExcluesRepo.sauver(liste);
}

export function ajouterExclusion(texteNormalise) {
  const liste = chargerExclues();
  if (!liste.includes(texteNormalise)) {
    liste.push(texteNormalise);
    sauverExclues(liste);
  }
}

export function retirerExclusion(texteNormalise) {
  sauverExclues(chargerExclues().filter((x) => x !== texteNormalise));
}
