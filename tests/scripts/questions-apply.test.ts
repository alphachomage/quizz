// tests/scripts/questions-apply.test.ts — corrections en place (scripts/questions-apply.mjs).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { run } from '../../scripts/questions-apply.mjs';
import { makeContent, question, readTheme, type Q } from './tmp-content';

const silence = () => {};
const base = (): Q[] => [
  { id: 'geo-aaaaaa', ...question('Quelle est la capitale de la France ?') },
  { id: 'geo-bbbbbb', ...question('Quelle ville est surnommée la Ville Lumière, Paris ?') },
  { id: 'geo-cccccc', ...question('Quelle est la capitale de la France ?') },
];
function appliquer(dir: string, corrections: unknown[], dryRun = false) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vquizz-patch-')), 'p.json');
  fs.writeFileSync(file, JSON.stringify({ corrections }));
  return run({ file, dir, dryRun, log: silence }) as { code: number };
}

describe('questions-apply', () => {
  it('corrige en place en conservant id et position', () => {
    const dir = makeContent(base());
    const r = appliquer(dir, [{ id: 'geo-bbbbbb', q: 'Quelle ville est surnommée la Ville Lumière ?' }]);
    expect(r.code).toBe(0);
    const qs = readTheme(dir);
    expect(qs.map((q) => q.id)).toEqual(['geo-aaaaaa', 'geo-bbbbbb', 'geo-cccccc']);
    expect(qs[1].q).toBe('Quelle ville est surnommée la Ville Lumière ?');
    expect(qs[1].reponses).toEqual(base()[1].reponses);
  });

  it('remplace un doublon à la même place avec un nouvel id', () => {
    const dir = makeContent(base());
    const nouvelle = { q: 'Quel fleuve traverse Budapest ?', reponses: ['Seine', 'Danube', 'Rhin', 'Tage'], bonne: 1, niveau: 'moyen' };
    expect(appliquer(dir, [{ id: 'geo-cccccc', remplacer: true, ...nouvelle }]).code).toBe(0);
    const qs = readTheme(dir);
    expect(qs).toHaveLength(3);
    expect(qs[2].q).toBe(nouvelle.q);
    expect(qs[2].id).toMatch(/^geo-[0-9a-f]{6,}$/);
    expect(qs[2].id).not.toBe('geo-cccccc');
  });

  it('refuse une correction qui ajoute un défaut, et n’écrit rien (tout ou rien)', () => {
    const dir = makeContent(base());
    const avant = fs.readFileSync(path.join(dir, 'questions', 'geo.json'), 'utf8');
    const r = appliquer(dir, [
      { id: 'geo-bbbbbb', q: 'Quelle ville est surnommée la Ville Lumière ?' },
      { id: 'geo-aaaaaa', reponses: ['Paris', 'Paris', 'Nice', 'Lille'] },
    ]);
    expect(r.code).toBe(1);
    expect(fs.readFileSync(path.join(dir, 'questions', 'geo.json'), 'utf8')).toBe(avant);
  });

  it('refuse un remplacement qui est un quasi-doublon du thème', () => {
    const dir = makeContent(base());
    const r = appliquer(dir, [{ id: 'geo-cccccc', remplacer: true, ...question('Quelle est donc la capitale de la France ?') }]);
    expect(r.code).toBe(1);
  });

  it('refuse un id inconnu et une double correction', () => {
    const dir = makeContent(base());
    expect(appliquer(dir, [{ id: 'geo-zzzzzz', q: 'x' }]).code).toBe(1);
    const q = 'Quelle ville est surnommée la Ville Lumière ?';
    expect(appliquer(dir, [{ id: 'geo-bbbbbb', q }, { id: 'geo-bbbbbb', q }]).code).toBe(1);
  });

  it('dry-run : n’écrit rien', () => {
    const dir = makeContent(base());
    const avant = fs.readFileSync(path.join(dir, 'questions', 'geo.json'), 'utf8');
    expect(appliquer(dir, [{ id: 'geo-bbbbbb', q: 'Quelle ville est surnommée la Ville Lumière ?' }], true).code).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'questions', 'geo.json'), 'utf8')).toBe(avant);
  });

  it('refuse une correction ou un remplacement qui ajoute une annotation ou un quasi-doublon', () => {
    const dir = makeContent(base());
    const reponses = ['Lyon', 'Paris (capitale)', 'Nice', 'Lille'];
    expect(appliquer(dir, [{ id: 'geo-bbbbbb', reponses }]).code).toBe(1);
    expect(appliquer(dir, [{ id: 'geo-bbbbbb', q: 'Quelle est la capitale de la France actuelle ?' }]).code).toBe(1);
    const nouvelle = { q: 'Quel fleuve traverse Budapest ?', reponses, bonne: 1, niveau: 'moyen' };
    expect(appliquer(dir, [{ id: 'geo-cccccc', remplacer: true, ...nouvelle }]).code).toBe(1);
    expect(readTheme(dir).map((q) => q.q)).toEqual(base().map((q) => q.q));
  });
});
