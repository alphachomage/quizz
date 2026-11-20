// soumissions.js — questions proposées par les joueurs et validation manuelle.
// - « en attente » (CLES.soumissions) : visibles dans la vue admin, PAS jouables.
// - « validées » (CLES.validees) : déplacées ici au clic sur valider -> jouables,
//   exportables en JSON, et elles disparaissent de la liste des propositions.
import { SoumissionsRepo, ValideesRepo } from './repositories.js';

// Proposer une question dans un thème demande d'y être niveau 3 (débloqueProgressif).
export const SEUIL_SOUMISSION_NIVEAU = 3;

export function chargerSoumissions() {
  return SoumissionsRepo.tout();
}

// Ajoute une question proposée. q = { themeId, q, reponses, bonne, niveau, info? }
export function ajouterSoumission(q) {
  const liste = chargerSoumissions();
  const soumission = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    date: new Date().toISOString(),
    ...q,
  };
  liste.push(soumission);
  SoumissionsRepo.sauver(liste);
  return soumission;
}

export function supprimerSoumission(id) {
  SoumissionsRepo.sauver(chargerSoumissions().filter((s) => s.id !== id));
}

export function chargerValidees() {
  return ValideesRepo.tout();
}

export function validerSoumission(id) {
  const enAttente = chargerSoumissions();
  const aValider = enAttente.find((s) => s.id === id);
  if (!aValider) return;
  const validees = chargerValidees();
  validees.push({ ...aValider, valideLe: new Date().toISOString() });
  ValideesRepo.sauver(validees);
  SoumissionsRepo.sauver(enAttente.filter((s) => s.id !== id));
}

// Construit le contenu JSON exportable (même format que questions-utilisateur.json)
// à partir des soumissions locales.
export function exporterSoumissionsJSON(soumissions, themes) {
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
