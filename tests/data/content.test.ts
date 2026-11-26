// tests/data/content.test.ts — structure du corpus vivant dans content/ :
// themes.json valide, un fichier par thème, ids stables uniques et bien formés,
// schéma zod de chaque question, cohérence du total avec `npm run count:questions`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const ROOT = path.resolve(__dirname, '..', '..');
const CONTENT = path.join(ROOT, 'content');

const themeMetaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nom: z.string().min(1),
  icone: z.string().min(1),
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  actif: z.boolean(),
});
// Schéma structurel du corpus (mêmes bornes que `count:questions`). Le schéma strict de
// src/lib/schema.ts (réponses <= 200 caractères...) n'est pas appliqué ici : des questions
// historiques le dépassent, et on ne les modifie pas dans la migration de format.
const schemaQuestion = z
  .object({
    id: z.string(),
    q: z.string().min(1),
    reponses: z.array(z.string().min(1)).min(2).max(4),
    bonne: z.number().int().min(0),
    niveau: z.enum(['facile', 'moyen', 'dur']),
    info: z.string().optional(),
  })
  .strict()
  .refine((q) => q.bonne < q.reponses.length);
const themeFileSchema = z.object({ theme: z.string(), questions: z.array(z.unknown()) });

const themes = z
  .array(themeMetaSchema)
  .parse(JSON.parse(fs.readFileSync(path.join(CONTENT, 'themes.json'), 'utf8')));
const files = fs.readdirSync(path.join(CONTENT, 'questions')).filter((f) => f.endsWith('.json'));
const lire = (id: string) =>
  themeFileSchema.parse(
    JSON.parse(fs.readFileSync(path.join(CONTENT, 'questions', `${id}.json`), 'utf8'))
  );

describe('content/themes.json', () => {
  it('ids de thèmes uniques', () => {
    expect(new Set(themes.map((t) => t.id)).size).toBe(themes.length);
  });

  it('un fichier de questions par thème, et réciproquement', () => {
    expect(files.map((f) => f.replace(/\.json$/, '')).sort()).toEqual(
      themes.map((t) => t.id).sort()
    );
  });

  it('les thèmes actifs précèdent les thèmes retirés', () => {
    const actifs = themes.map((t) => t.actif);
    expect(actifs.join()).toBe([...actifs].sort((a, b) => Number(b) - Number(a)).join());
  });
});

describe('content/questions/*.json', () => {
  it('chaque fichier déclare son thème, ids uniques globalement au format <theme>-<hex>', () => {
    const vus = new Set<string>();
    for (const t of themes) {
      const fichier = lire(t.id);
      expect(fichier.theme).toBe(t.id);
      const re = new RegExp(`^${t.id}-[0-9a-f]{6,}$`);
      for (const q of fichier.questions as Array<{ id?: string }>) {
        expect(q.id, `question sans id dans ${t.id}`).toMatch(re);
        expect(vus.has(q.id as string), `id en double ${q.id}`).toBe(false);
        vus.add(q.id as string);
      }
    }
  });

  it('chaque question respecte le schéma (zod, bornes de count:questions)', () => {
    for (const t of themes) {
      for (const q of lire(t.id).questions) {
        const r = schemaQuestion.safeParse(q);
        expect(r.success, `${t.id} : ${JSON.stringify(q).slice(0, 80)}`).toBe(true);
      }
    }
  });

  it('total des thèmes actifs = total servi rapporté par count:questions', () => {
    const total = themes
      .filter((t) => t.actif)
      .reduce((n, t) => n + lire(t.id).questions.length, 0);
    const sortie = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'count-questions.mjs')], {
      encoding: 'utf8',
    });
    expect(sortie).toContain(`TOTAL servi : ${total} |`);
  });
});
