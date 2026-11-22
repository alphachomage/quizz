// Tests de src/lib/overrides.ts : les overrides admin (supprimer/modifier une question
// du corpus) s'appliquent dans applyOverrides sans toucher aux fichiers source, indexés
// par le texte normalisé de la question d'origine.
import { beforeEach, describe, expect, it } from 'vitest';
import type { Theme } from '@lib/types.js';

// storage.ts lit localStorage (jsdom) : le setup global nettoie avant chaque test.
import {
  loadOverrides,
  setOverride,
  removeOverride,
  applyOverrides,
} from '@lib/overrides.js';

const THEMES: Theme[] = [
  {
    id: 'culture-generale',
    nom: 'Culture générale',
    questions: [
      { q: 'Capitale de la France ?', reponses: ['Paris', 'Lyon'], bonne: 0, niveau: 'moyen' },
      { q: 'Combien font 2+2 ?', reponses: ['3', '4'], bonne: 1, niveau: 'facile' },
    ],
  },
];

beforeEach(() => {
  window.localStorage.clear();
});

describe('overrides admin', () => {
  it('sans override, applyOverrides renvoie les thèmes tels quels', () => {
    const out = applyOverrides(THEMES);
    expect(out[0].questions).toHaveLength(2);
  });

  it("override 'supprimer' retire la question du pool (clé = texte normalisé)", () => {
    setOverride('Capitale de la France ?', { action: 'supprimer' });
    const out = applyOverrides(THEMES);
    expect(out[0].questions).toHaveLength(1);
    expect(out[0].questions[0].q).toBe('Combien font 2+2 ?');
  });

  it("override 'modifier' remplace la question (réponses, bonne, niveau, info)", () => {
    setOverride('Capitale de la France ?', {
      action: 'modifier',
      question: {
        q: 'Quelle est la capitale de la France ?',
        reponses: ['Marseille', 'Paris', 'Lyon'],
        bonne: 1,
        niveau: 'facile',
        info: 'Paris depuis 508.',
      },
    });
    const out = applyOverrides(THEMES);
    expect(out[0].questions).toHaveLength(2);
    const mod = out[0].questions.find((q) => q.q.includes('capitale'))!;
    expect(mod.reponses).toEqual(['Marseille', 'Paris', 'Lyon']);
    expect(mod.bonne).toBe(1);
    expect(mod.niveau).toBe('facile');
    expect(mod.info).toBe('Paris depuis 508.');
  });

  it('la clé est normalisée (casse/accents/ponctuation ignorés)', () => {
    setOverride('  CAPITALE de la france ! ', { action: 'supprimer' });
    const out = applyOverrides(THEMES);
    expect(out[0].questions).toHaveLength(1);
  });

  it("removeOverride restaure la question d'origine dans le pool", () => {
    setOverride('Combien font 2+2 ?', { action: 'supprimer' });
    expect(applyOverrides(THEMES)[0].questions).toHaveLength(1);
    removeOverride('Combien font 2+2 ?');
    expect(applyOverrides(THEMES)[0].questions).toHaveLength(2);
  });

  it('loadOverrides reflète setOverride (persisté via le repo)', () => {
    expect(loadOverrides()).toEqual({});
    setOverride('Capitale de la France ?', { action: 'supprimer' });
    expect(Object.keys(loadOverrides())).toHaveLength(1);
  });
});
