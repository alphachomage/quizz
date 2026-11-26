// tests/scripts/questions-lint.test.ts — lint qualité avec liste de dette (scripts/questions-lint.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { run } from '../../scripts/questions-lint.mjs';
import { makeContent, question, type Q } from './tmp-content';

const propre = (): Q => ({ id: 'geo-aaaaaa', ...question('Quelle est la capitale de la France ?') });
// Viole question-trop-longue (id bbbbbb)
const longue = (): Q => ({ id: 'geo-bbbbbb', ...question('mot '.repeat(45) + '?') });
const silence = () => {};
const lint = (dir: string, args: string[] = []) => run({ dir, args, log: silence }) as number;
const detteFile = (dir: string) => path.join(dir, 'qualite-dette.json');
const lireDette = (dir: string) => JSON.parse(fs.readFileSync(detteFile(dir), 'utf8'));
const ecrireDette = (dir: string, d: unknown) => fs.writeFileSync(detteFile(dir), JSON.stringify(d));

describe('questions-lint', () => {
  it('corpus propre sans dette : OK', () => {
    expect(lint(makeContent([propre()]))).toBe(0);
  });

  it('nouvelle violation hors dette : échec', () => {
    const dir = makeContent([propre(), longue()]);
    expect(lint(dir)).toBe(1);
  });

  it('violation couverte par la dette : OK', () => {
    const dir = makeContent([propre(), longue()]);
    ecrireDette(dir, { 'question-trop-longue': ['geo-bbbbbb'] });
    expect(lint(dir)).toBe(0);
  });

  it('une autre règle violée par un id déjà en dette pour un autre code : échec', () => {
    const dir = makeContent([propre(), longue()]);
    ecrireDette(dir, { 'reponse-trop-longue': ['geo-bbbbbb'] });
    expect(lint(dir)).toBe(1);
  });

  it('question sans id : échec (npm run questions:ids)', () => {
    expect(lint(makeContent([question('Quelle est la capitale de la France ?')]))).toBe(1);
  });

  it('dette périmée (la question ne viole plus la règle) : échec', () => {
    const dir = makeContent([propre()]);
    ecrireDette(dir, { 'question-trop-longue': ['geo-aaaaaa'] });
    expect(lint(dir)).toBe(1);
  });

  it('dette périmée (id disparu) : échec', () => {
    const dir = makeContent([propre()]);
    ecrireDette(dir, { 'question-trop-longue': ['geo-inconnu'] });
    expect(lint(dir)).toBe(1);
  });

  it('--update-dette retire les entrées périmées, garde les valides, n’ajoute jamais', () => {
    const dir = makeContent([propre(), longue(), { id: 'geo-cccccc', ...question('Une autre question ?', 1, { reponses: ['Lyon', 'b'.repeat(70), 'Nice', 'Lille'] }) }]);
    ecrireDette(dir, { 'question-trop-longue': ['geo-aaaaaa', 'geo-bbbbbb', 'geo-disparu'] });
    // geo-cccccc viole reponse-trop-longue sans être en dette : elle ne doit PAS être ajoutée
    expect(lint(dir, ['--update-dette'])).toBe(1);
    expect(lireDette(dir)).toEqual({ 'question-trop-longue': ['geo-bbbbbb'] });
  });

  it('--update-dette sur une dette saine ne change rien', () => {
    const dir = makeContent([propre(), longue()]);
    ecrireDette(dir, { 'question-trop-longue': ['geo-bbbbbb'] });
    expect(lint(dir, ['--update-dette'])).toBe(0);
    expect(lireDette(dir)).toEqual({ 'question-trop-longue': ['geo-bbbbbb'] });
  });

  it('--init-dette crée la dette (ids triés) puis refuse de l’écraser', () => {
    const dir = makeContent([propre(), longue(), { id: 'geo-000000', ...question('mots '.repeat(45) + '?') }]);
    expect(lint(dir, ['--init-dette'])).toBe(0);
    expect(lireDette(dir)).toEqual({ 'question-trop-longue': ['geo-000000', 'geo-bbbbbb'] });
    expect(lint(dir)).toBe(0);
    expect(lint(dir, ['--init-dette'])).toBe(1);
  });
});
