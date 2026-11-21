// soumissions.js — questions proposées par les joueurs et validation manuelle.
// - « en attente » (CLES.soumissions) : visibles dans la vue admin, PAS jouables.
// - « validées » (CLES.validees) : déplacées ici au clic sur valider -> jouables,
//   exportables en JSON, et elles disparaissent de la liste des propositions.
import { SubmissionsRepo, ApprovedRepo } from './repositories.js';

// Proposer une question dans un thème demande d'y être niveau 3 (débloqueProgressif).
export const SUBMISSION_LEVEL_THRESHOLD = 3;

export function loadSubmissions() {
  return SubmissionsRepo.tout();
}

// Ajoute une question proposée. q = { themeId, q, reponses, bonne, niveau, info? }
export function addSubmission(q) {
  const list = loadSubmissions();
  const submission = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    date: new Date().toISOString(),
    ...q,
  };
  list.push(submission);
  SubmissionsRepo.sauver(list);
  return submission;
}

export function removeSubmission(id) {
  SubmissionsRepo.sauver(loadSubmissions().filter((s) => s.id !== id));
}

export function loadApproved() {
  return ApprovedRepo.tout();
}

export function approveSubmission(id) {
  const enAttente = loadSubmissions();
  const aValider = enAttente.find((s) => s.id === id);
  if (!aValider) return;
  const validees = loadApproved();
  validees.push({ ...aValider, valideLe: new Date().toISOString() });
  ApprovedRepo.sauver(validees);
  SubmissionsRepo.sauver(enAttente.filter((s) => s.id !== id));
}

// Construit le contenu JSON exportable (même format que questions-utilisateur.json)
// à partir des soumissions locales.
export function exportSubmissionsJson(soumissions, themes) {
  const map = new Map();
  for (const s of soumissions) {
    if (!map.has(s.themeId)) {
      const t = themes.find((x) => x.id === s.themeId);
      map.set(s.themeId, {
        id: s.themeId,
        nom: t ? t.nom : s.themeId,
        icone: t ? t.icone : 'question',
        couleur: t ? t.couleur : '#8b5cf6',
        questions: [],
      });
    }
    const entree = {
      q: s.q,
      reponses: s.reponses,
      bonne: s.bonne,
      niveau: s.niveau,
    };
    if (s.info) entree.info = s.info;
    map.get(s.themeId).questions.push(entree);
  }
  return JSON.stringify({ themes: [...map.values()] }, null, 2);
}
