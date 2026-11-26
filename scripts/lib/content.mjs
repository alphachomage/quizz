// scripts/lib/content.mjs — accès partagé au corpus vivant dans content/ (JSON).
// content/themes.json = métadonnées + ordre des thèmes ; content/questions/<theme>.json = questions.
// Utilisé par gen-corpus-json, gen-manifest, count-questions, audit, dedupe, assign-ids.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT_DIR = path.join(ROOT, 'content');
export const QUESTIONS_DIR = path.join(CONTENT_DIR, 'questions');
export const THEMES_FILE = path.join(CONTENT_DIR, 'themes.json');

// Identique à normalizeQuestionText de src/lib/text.ts (module TS, non importable ici).
export function normalizeQuestionText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readThemes() {
  return JSON.parse(fs.readFileSync(THEMES_FILE, 'utf8'));
}

export function questionsFile(themeId) {
  return path.join(QUESTIONS_DIR, `${themeId}.json`);
}

export function readThemeQuestions(themeId) {
  return JSON.parse(fs.readFileSync(questionsFile(themeId), 'utf8')).questions;
}

// Thèmes (actifs ou non) avec leurs questions, dans l'ordre de themes.json.
export function readAll({ actifsSeulement = false } = {}) {
  return readThemes()
    .filter((t) => !actifsSeulement || t.actif)
    .map((t) => ({ ...t, questions: readThemeQuestions(t.id) }));
}

// Hash du contenu (themes.json + questions/*.json triés) : version du corpus servi.
export function contentHash() {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(THEMES_FILE));
  for (const f of fs.readdirSync(QUESTIONS_DIR).filter((n) => n.endsWith('.json')).sort()) {
    h.update(f);
    h.update(fs.readFileSync(path.join(QUESTIONS_DIR, f)));
  }
  return h.digest('hex').slice(0, 16);
}

// Sérialisation lisible en diff git : 1 question (ou 1 thème) par ligne.
export function serializeThemes(themes) {
  return `[\n${themes.map((t) => '  ' + JSON.stringify(t)).join(',\n')}\n]\n`;
}
export function serializeQuestions(themeId, questions) {
  const lignes = questions.map((q) => '    ' + JSON.stringify(q)).join(',\n');
  return `{\n  "theme": ${JSON.stringify(themeId)},\n  "questions": [\n${lignes}\n  ]\n}\n`;
}
export function writeThemeQuestions(themeId, questions) {
  fs.writeFileSync(questionsFile(themeId), serializeQuestions(themeId, questions));
}
