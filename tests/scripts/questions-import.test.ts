// tests/scripts/questions-import.test.ts — import via content/inbox (scripts/questions-import.mjs).
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { run } from '../../scripts/questions-import.mjs';
import { run as runLint } from '../../scripts/questions-lint.mjs';
import { inboxPath, makeContent, question, readTheme, writeInbox, type Q } from './tmp-content';

const existante = (): Q => ({
  id: 'geo-aaaaaa',
  ...question('Quelle est la capitale de la France ?'),
});
const nouvelle = (): Q => ({
  q: 'Quel fleuve traverse la ville de Budapest ?',
  reponses: ['La Seine', 'Le Danube', 'Le Rhin', 'Le Tage'],
  bonne: 1,
  niveau: 'moyen',
});
const silence = () => {};
type Retour = { code: number };
const importer = (dir: string, dryRun = false) => run({ dir, dryRun, log: silence }) as Retour;

describe('questions-import', () => {
  it('inbox vide : rien à faire, code 0', () => {
    const dir = makeContent([existante()]);
    expect(importer(dir).code).toBe(0);
  });

  it('thème inconnu : fichier entier refusé et laissé intact, code 1', () => {
    const dir = makeContent([existante()]);
    const brut = JSON.stringify({ theme: 'inconnu', questions: [nouvelle()] });
    writeInbox(dir, 'a.json', brut);
    expect(importer(dir).code).toBe(1);
    expect(fs.readFileSync(inboxPath(dir, 'a.json'), 'utf8')).toBe(brut);
    expect(readTheme(dir)).toHaveLength(1);
  });

  it('JSON invalide : fichier laissé tel quel, code 1', () => {
    const dir = makeContent([existante()]);
    writeInbox(dir, 'a.json', '{ pas du json');
    expect(importer(dir).code).toBe(1);
    expect(fs.readFileSync(inboxPath(dir, 'a.json'), 'utf8')).toBe('{ pas du json');
  });

  it('acceptation : ajoutée EN FIN, ordre et ids existants intacts, id attribué, inbox supprimé', () => {
    const dir = makeContent([existante(), { id: 'geo-bbbbbb', ...question('Quelle est la capitale de l’Italie ?', 1) }]);
    writeInbox(dir, 'a.json', { theme: 'geo', questions: [nouvelle()] });
    expect(importer(dir).code).toBe(0);
    const qs = readTheme(dir);
    expect(qs.map((q) => q.id)).toEqual(['geo-aaaaaa', 'geo-bbbbbb', qs[2].id]);
    expect(qs[2].id).toMatch(/^geo-[0-9a-f]{6}$/);
    expect(qs[2].q).toBe(nouvelle().q);
    expect(fs.existsSync(inboxPath(dir, 'a.json'))).toBe(false);
  });

  it('le résultat respecte le lint qualité (aucune dette nécessaire)', () => {
    const dir = makeContent([existante()]);
    writeInbox(dir, 'a.json', { theme: 'geo', questions: [nouvelle()] });
    importer(dir);
    expect(runLint({ dir, log: silence })).toBe(0);
  });

  it('doublon exact contre le thème : refusé, annoté, fichier réécrit avec les seules refusées', () => {
    const dir = makeContent([existante()]);
    const doublon = question('QUELLE est la capitale de la France');
    writeInbox(dir, 'a.json', { theme: 'geo', questions: [doublon, nouvelle()] });
    expect(importer(dir).code).toBe(1);
    expect(readTheme(dir)).toHaveLength(2); // la bonne a été importée
    const reste = JSON.parse(fs.readFileSync(inboxPath(dir, 'a.json'), 'utf8'));
    expect(reste.theme).toBe('geo');
    expect(reste.questions).toHaveLength(1);
    expect(reste.questions[0].rejet[0]).toMatch(/^doublon-exact: /);
  });

  it('doublon exact dans le lot : seul le 2e est refusé', () => {
    const dir = makeContent([existante()]);
    writeInbox(dir, 'a.json', { theme: 'geo', questions: [nouvelle(), nouvelle()] });
    expect(importer(dir).code).toBe(1);
    expect(readTheme(dir)).toHaveLength(2);
    const reste = JSON.parse(fs.readFileSync(inboxPath(dir, 'a.json'), 'utf8'));
    expect(reste.questions).toHaveLength(1);
    expect(reste.questions[0].rejet[0]).toMatch(/^doublon-exact: /);
  });

  it('doublon exact entre deux fichiers du même passage', () => {
    const dir = makeContent([existante()]);
    writeInbox(dir, 'a.json', { theme: 'geo', questions: [nouvelle()] });
    writeInbox(dir, 'b.json', { theme: 'geo', questions: [nouvelle()] });
    expect(importer(dir).code).toBe(1);
    expect(readTheme(dir)).toHaveLength(2);
    expect(fs.existsSync(inboxPath(dir, 'a.json'))).toBe(false);
    expect(fs.existsSync(inboxPath(dir, 'b.json'))).toBe(true);
  });

  it('quasi-doublon : refusé avec le code quasi-doublon', () => {
    const dir = makeContent([existante()]);
    const proche = question('Quelle est la capitale de la France actuelle ?');
    writeInbox(dir, 'a.json', { theme: 'geo', questions: [proche] });
    expect(importer(dir).code).toBe(1);
    const reste = JSON.parse(fs.readFileSync(inboxPath(dir, 'a.json'), 'utf8'));
    expect(reste.questions[0].rejet.join(' ')).toMatch(/quasi-doublon: /);
    expect(readTheme(dir)).toHaveLength(1);
  });

  it('règle qualité bloquante : réponse dans la question, question trop longue', () => {
    const dir = makeContent([existante()]);
    const trahie = { q: 'Quelle ville est la capitale du Japon, Tokyo ?', reponses: ['Kyoto', 'Osaka', 'Tokyo', 'Nagoya'], bonne: 2, niveau: 'facile' };
    const longue = question('Q'.repeat(10) + ' ' + 'mot '.repeat(40) + '?');
    writeInbox(dir, 'a.json', { theme: 'geo', questions: [trahie, longue] });
    expect(importer(dir).code).toBe(1);
    const reste = JSON.parse(fs.readFileSync(inboxPath(dir, 'a.json'), 'utf8'));
    expect(reste.questions[0].rejet[0]).toMatch(/^reponse-dans-question: /);
    expect(reste.questions[1].rejet.join(' ')).toMatch(/question-trop-longue: /);
  });

  it('un fichier refusé puis corrigé se réimporte (rejet et id ignorés)', () => {
    const dir = makeContent([existante()]);
    writeInbox(dir, 'a.json', { theme: 'geo', questions: [{ ...nouvelle(), id: 'geo-zzzzzz', rejet: ['x: y'] }] });
    expect(importer(dir).code).toBe(0);
    const qs = readTheme(dir);
    expect(qs[1].id).not.toBe('geo-zzzzzz');
    expect(qs[1]).not.toHaveProperty('rejet');
  });

  it('--dry-run : aucune écriture (thème et inbox intacts) mais code de sortie fidèle', () => {
    const dir = makeContent([existante()]);
    const brut = JSON.stringify({ theme: 'geo', questions: [nouvelle(), question('Quelle est la capitale de la France ?')] });
    writeInbox(dir, 'a.json', brut);
    const avant = fs.readFileSync(`${dir}/questions/geo.json`, 'utf8');
    expect(importer(dir, true).code).toBe(1);
    expect(fs.readFileSync(`${dir}/questions/geo.json`, 'utf8')).toBe(avant);
    expect(fs.readFileSync(inboxPath(dir, 'a.json'), 'utf8')).toBe(brut);
  });

  it('reponse-annotee : refusée à l’import', () => {
    const dir = makeContent([existante()]);
    writeInbox(dir, 'a.json', { theme: 'geo', questions: [{ ...nouvelle(), reponses: ['La Seine', 'Le Danube (fleuve)', 'Le Rhin', 'Le Tage'] }] });
    expect(importer(dir).code).toBe(1);
    expect(readTheme(dir)).toHaveLength(1);
    expect(JSON.parse(fs.readFileSync(inboxPath(dir, 'a.json'), 'utf8')).questions[0].rejet.join(' ')).toMatch(/reponse-annotee: /);
  });
});
