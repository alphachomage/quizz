// schema.js — validation (zod) de TOUTE donnée externe avant usage :
// fichier questions-utilisateur.json (fetch), soumissions/validées (localStorage,
// modifiables à la main), thèmes perso. Garantit aussi bonne < reponses.length.
// La base intégrée (src/data) est validée par tests/data/questions-schema.test.js.
import { z } from 'zod';

const LEVEL_IDS = ['facile', 'moyen', 'dur'];

// Une question valide : texte non vide, 2 à 4 réponses non vides, bonne réponse
// dans les limites, niveau connu, info optionnelle.
export const schemaQuestion = z.object({
  q: z.string().trim().min(4).max(500),
  reponses: z.array(z.string().trim().min(1).max(200)).min(2).max(4),
  bonne: z.number().int().min(0),
  niveau: z.enum(LEVEL_IDS),
  info: z.string().max(1000).optional(),
}).refine((q) => q.bonne < q.reponses.length, {
  message: 'bonne réponse hors limites (bonne < reponses.length requis)',
});

const schemaTheme = z.object({
  id: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/, 'id en minuscules, chiffres et tirets'),
  nom: z.string().trim().min(1).max(80).optional(),
  icone: z.string().trim().max(40).optional(),
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  questions: z.array(schemaQuestion).min(1),
});

// Fichier questions-utilisateur.json complet.
const schemaFichierPerso = z.object({
  themes: z.array(schemaTheme).min(1),
});

// Une soumission stockée en localStorage (peut avoir été modifiée à la main).
const schemaSoumission = schemaQuestion.extend({
  themeId: z.string().trim().min(1).max(60),
  id: z.string().optional(),
  date: z.string().optional(),
});

// Valide un fichier perso (fetch) : renvoie les thèmes valides, ou null si invalide.
// Les thèmes invalides sont ignorés plutôt que de faire planter l'appli.
export function validatePersonalFile(data) {
  const result = schemaFichierPerso.safeParse(data);
  if (!result.success) return null;
  return result.data;
}

// Valide une liste de soumissions (localStorage) : ne garde que les valides.
export function validateSubmissions(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((s) => schemaSoumission.safeParse(s).success);
}
