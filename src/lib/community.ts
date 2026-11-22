// community.ts — questions communautaires validées par l'admin, servies par le serveur
// (GET /api/questions, table D1 soumissions etat='validee'), paginées, validées par zod
// côté client avant usage (donnée externe). Fusionnées au catalogue dans ThemesContext.
// Best-effort : hors-ligne ou erreur réseau -> aucune question communautaire, le jeu
// continue avec le corpus intégré. Mode 'local' (?stockage=local) : indisponible.
import { apiCommunityQuestions } from './api.js';
import { submissionSchema } from './schema.js';
import { normalizeQuestionText } from './text.js';
import { STORAGE_MODE } from './storage.js';
import type { Question, Theme } from './types.js';

const PAGE_TAILLE = 100;

// Charge TOUTES les questions communautaires validées (toutes les pages) et les
// convertit en thèmes partiels (id + questions, sans métadonnées — celles-ci viennent
// du manifest pour les thèmes connus). Dédupliquées par texte normalisé.
export async function loadCommunityQuestions(): Promise<Theme[]> {
  if (STORAGE_MODE !== 'd1') return [];
  try {
    const first = await apiCommunityQuestions(undefined, 0, PAGE_TAILLE);
    const total = first.total || 0;
    const rows: unknown[] = [...first.questions];
    for (let page = 1; page * PAGE_TAILLE < total; page++) {
      const r = await apiCommunityQuestions(undefined, page, PAGE_TAILLE);
      rows.push(...r.questions);
    }
    const map = new Map<string, Theme>();
    const vus = new Set<string>();
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      // Mapping ligne D1 (theme_id) -> schéma client (themeId), puis validation zod.
      const parsed = submissionSchema.safeParse({
        themeId: r.theme_id,
        q: r.q,
        reponses: r.reponses,
        bonne: r.bonne,
        niveau: r.niveau,
        info: r.info ?? undefined,
        id: r.id,
        date: r.date,
      });
      if (!parsed.success) continue;
      const s = parsed.data;
      const cle = normalizeQuestionText(s.q);
      if (!cle || vus.has(cle)) continue;
      vus.add(cle);
      let t = map.get(s.themeId);
      if (!t) {
        t = { id: s.themeId, questions: [] };
        map.set(s.themeId, t);
      }
      const q: Question = { q: s.q, reponses: s.reponses, bonne: s.bonne, niveau: s.niveau };
      if (s.info) q.info = s.info;
      t.questions.push(q);
    }
    return [...map.values()];
  } catch {
    return []; // réseau coupé, 401, 5xx : le jeu continue sans questions communautaires
  }
}
