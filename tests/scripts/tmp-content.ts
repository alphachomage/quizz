// Aide de tests : fabrique une racine de contenu jetable (themes.json + questions/<theme>.json + inbox/).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface Q {
  id?: string;
  q: string;
  reponses: string[];
  bonne: number;
  niveau: string;
  info?: string;
}

export const question = (q: string, bonne = 1, extra: Partial<Q> = {}): Q => ({
  q,
  reponses: ['Lyon', 'Paris', 'Nice', 'Lille'],
  bonne,
  niveau: 'facile',
  ...extra,
});

export function makeContent(questions: Q[], theme = 'geo'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vquizz-content-'));
  fs.mkdirSync(path.join(dir, 'questions'));
  fs.mkdirSync(path.join(dir, 'inbox'));
  fs.writeFileSync(
    path.join(dir, 'themes.json'),
    JSON.stringify([{ id: theme, nom: 'Géo', icone: 'globe', couleur: '#2dd4bf', actif: true }]),
  );
  writeTheme(dir, theme, questions);
  return dir;
}

export function writeTheme(dir: string, theme: string, questions: Q[]) {
  const lignes = questions.map((q) => '    ' + JSON.stringify(q)).join(',\n');
  fs.writeFileSync(
    path.join(dir, 'questions', `${theme}.json`),
    `{\n  "theme": ${JSON.stringify(theme)},\n  "questions": [\n${lignes}\n  ]\n}\n`,
  );
}

export const readTheme = (dir: string, theme = 'geo'): Q[] =>
  JSON.parse(fs.readFileSync(path.join(dir, 'questions', `${theme}.json`), 'utf8')).questions;

export const writeInbox = (dir: string, name: string, content: unknown) =>
  fs.writeFileSync(path.join(dir, 'inbox', name), typeof content === 'string' ? content : JSON.stringify(content));

export const inboxPath = (dir: string, name: string) => path.join(dir, 'inbox', name);
