// schema.ts — validation (zod) de TOUTE donnée externe avant usage :
// fichier questions-utilisateur.json (fetch), soumissions/validées (localStorage,
// modifiables à la main), thèmes personal. Garantit aussi bonne < reponses.length.
// La base intégrée (src/data) est validée par tests/data/questions-schema.test.js.
import { z } from 'zod';
import type { Submission, Theme } from './types.js';

// Mode « jitless » : zod ne compile JAMAIS ses schémas via new Function()/eval, car la
// CSP de prod est script-src 'self' (sans 'unsafe-eval') — les rapports CSP montraient
// sinon des blocs eval sur le bundle. Le mode interprété est un peu plus lent au
// premier parse, mais compatible CSP et sans eval du tout.
z.config({ jitless: true });

const LEVEL_IDS = ['facile', 'moyen', 'dur'] as const;

// Une question valide : texte non vide, 2 à 4 réponses non vides, bonne réponse
// dans les limites, niveau connu, info optionnelle.
export const schemaQuestion = z
  .object({
    q: z.string().trim().min(4).max(500),
    reponses: z.array(z.string().trim().min(1).max(200)).min(2).max(4),
    bonne: z.number().int().min(0),
    niveau: z.enum(LEVEL_IDS),
    info: z.string().max(1000).optional(),
  })
  .refine((q) => q.bonne < q.reponses.length, {
    message: 'bonne réponse hors limites (bonne < reponses.length requis)',
  });

// Types déduits des schémas (z.infer) : structurellement alignés sur Question /
// Theme / Submission de src/lib/types.ts.
export type QuestionFromSchema = z.infer<typeof schemaQuestion>;

const themeSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'id en minuscules, chiffres et tirets'),
  nom: z.string().trim().min(1).max(80).optional(),
  icone: z.string().trim().max(40).optional(),
  couleur: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  questions: z.array(schemaQuestion).min(1),
});
export type ThemeFromSchema = z.infer<typeof themeSchema>;

// Fichier questions-utilisateur.json complet.
const personalFileSchema = z.object({
  themes: z.array(themeSchema).min(1),
});
export type PersonalFile = z.infer<typeof personalFileSchema>;

// Une soumission stockée en localStorage (peut avoir été modifiée à la main) ou reçue
// du serveur (table D1 soumissions, après mapping theme_id -> themeId).
export const submissionSchema = schemaQuestion.extend({
  themeId: z.string().trim().min(1).max(60),
  id: z.string().optional(),
  date: z.string().optional(),
});
export type SubmissionFromSchema = z.infer<typeof submissionSchema>;

// Valide un fichier personal (fetch) : renvoie les thèmes valides, ou null si invalide.
// Les thèmes invalides sont ignorés plutôt que de faire planter l'appli.
export function validatePersonalFile(data: unknown): { themes: Theme[] } | null {
  const result = personalFileSchema.safeParse(data);
  if (!result.success) return null;
  return result.data;
}

// Valide une liste de soumissions (localStorage) : ne garde que les valides.
export function validateSubmissions(list: unknown): Submission[] {
  if (!Array.isArray(list)) return [];
  return list.filter((s): s is Submission => submissionSchema.safeParse(s).success);
}
