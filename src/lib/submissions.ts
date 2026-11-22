// submissions.ts — questions proposées par les joueurs et validation manuelle.
// - « en attente » (CLES.soumissions) : visibles dans la vue admin, PAS jouables.
// - « validées » (CLES.validees) : déplacées ici au clic sur valider -> jouables,
//   exportables en JSON, et elles disparaissent de la liste des propositions.
import { SubmissionsRepo, ApprovedRepo } from './repositories.js';
import { STORAGE_MODE } from './storage.js';
import { apiAddSubmission, apiValidateSubmission, apiRefuseSubmission } from './api.js';
import { currentSession } from './accounts.js';
import type { Question, Submission, Theme } from './types.js';

// Soumission validée par l'admin :rajoute la date de validation (valideLe).
export interface ApprovedSubmission extends Submission {
  valideLe?: string;
}

// Proposer une question dans un thème demande d'y être niveau 3 (débloqueProgressif).
export const SUBMISSION_LEVEL_THRESHOLD = 3;
export function loadSubmissions(): Submission[] {
  return SubmissionsRepo.all();
}

// Ajoute une question proposée. q = { themeId, q, reponses, bonne, niveau, info? }
export function addSubmission(q: Submission): Submission {
  const list = loadSubmissions();
  const submission: Submission = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    date: new Date().toISOString(),
    ...q,
  };
  list.push(submission);
  SubmissionsRepo.save(list);
  // Mode 'd1' : la soumission part aussi dans la table D1 « soumissions » (best-effort),
  // pour la modération admin cross-device (GET /api/soumissions?etat=attente).
  if (STORAGE_MODE === 'd1') {
    void apiAddSubmission({
      id: submission.id || '',
      pseudo: currentSession()?.pseudo ?? null,
      themeId: submission.themeId,
      q: submission.q,
      reponses: submission.reponses,
      bonne: submission.bonne,
      niveau: submission.niveau,
      info: submission.info,
      date: submission.date,
    }).catch(() => {});
  }
  return submission;
}
export function loadApproved(): ApprovedSubmission[] {
  return ApprovedRepo.all();
}
export function approveSubmission(id: string): void {
  const enAttente = loadSubmissions();
  const toApprove = enAttente.find((s) => s.id === id);
  if (!toApprove) return;
  const validees = loadApproved();
  validees.push({
    ...toApprove,
    valideLe: new Date().toISOString(),
  });
  ApprovedRepo.save(validees);
  SubmissionsRepo.save(enAttente.filter((s) => s.id !== id));
  // Mode 'd1' : validation aussi côté serveur (etat='validee') pour que la question soit
  // servie à tous les joueurs via GET /api/questions (best-effort).
  if (STORAGE_MODE === 'd1') {
    void apiValidateSubmission(id).catch(() => {});
  }
}

// Refuse une soumission : retirée de la liste d'attente + etat='refusee' côté serveur.
export function refuseSubmission(id: string): void {
  SubmissionsRepo.save(loadSubmissions().filter((s) => s.id !== id));
  if (STORAGE_MODE === 'd1') {
    void apiRefuseSubmission(id).catch(() => {});
  }
}

// Construit le contenu JSON exportable (même format que questions-utilisateur.json)
// à partir des soumissions locales.
export function exportSubmissionsJson(submissions: Submission[], themes: Theme[]): string {
  const map = new Map<string, Theme>();
  for (const s of submissions) {
    let groupe = map.get(s.themeId);
    if (!groupe) {
      const t = themes.find((x) => x.id === s.themeId);
      groupe = {
        id: s.themeId,
        nom: t ? t.nom : s.themeId,
        icone: t ? t.icone : 'question',
        couleur: t ? t.couleur : '#8b5cf6',
        questions: [],
      };
      map.set(s.themeId, groupe);
    }
    const entree: Question = {
      q: s.q,
      reponses: s.reponses,
      bonne: s.bonne,
      niveau: s.niveau,
    };
    if (s.info) entree.info = s.info;
    groupe.questions.push(entree);
  }
  return JSON.stringify(
    {
      themes: [...map.values()],
    },
    null,
    2
  );
}
