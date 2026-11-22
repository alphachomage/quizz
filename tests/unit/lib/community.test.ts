// Tests de src/lib/community.ts : chargement paginé des questions communautaires
// validées (mock de l'API), validation zod des données reçues (donnée externe),
// mapping theme_id -> themeId, dédup par texte normalisé, best-effort hors-ligne.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiCommunityQuestions = vi.fn();
vi.mock('@lib/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lib/api.js')>();
  return {
    ...actual,
    apiCommunityQuestions: (...args: unknown[]) => apiCommunityQuestions(...args),
  };
});

// STORAGE_MODE = 'd1' par défaut (pas de ?stockage=local dans l'URL de test).
beforeEach(() => {
  vi.resetModules();
  apiCommunityQuestions.mockReset();
  window.localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function ligneD1(id: string, themeId: string, q: string, reponses: unknown = ['a', 'b']) {
  return {
    id,
    pseudo: 'testeur',
    theme_id: themeId,
    q,
    reponses, // déjà parsé côté serveur
    bonne: 0,
    niveau: 'moyen',
    info: null,
    etat: 'validee',
    date: '2025-01-01',
  };
}

describe('loadCommunityQuestions', () => {
  it('mappe theme_id -> themeId, valide par zod, groupe par thème', async () => {
    apiCommunityQuestions.mockResolvedValue({
      ok: true,
      total: 2,
      page: 0,
      limit: 100,
      questions: [
        ligneD1('q1', 'histoire', 'Révolution française ?'),
        ligneD1('q2', 'histoire', 'Premier empereur romain ?'),
        ligneD1('q3', 'sport', 'Joueurs au foot ?'),
      ],
    });
    const { loadCommunityQuestions } = await import('@lib/community.js');
    const themes = await loadCommunityQuestions();
    expect(themes).toHaveLength(2);
    const hist = themes.find((t) => t.id === 'histoire')!;
    expect(hist.questions).toHaveLength(2);
    expect(hist.questions[0]).toEqual({
      q: 'Révolution française ?',
      reponses: ['a', 'b'],
      bonne: 0,
      niveau: 'moyen',
    });
  });

  it('récupère toutes les pages (total > limit)', async () => {
    apiCommunityQuestions
      .mockResolvedValueOnce({
        ok: true,
        total: 150,
        page: 0,
        limit: 100,
        questions: Array.from({ length: 100 }, (_, i) => ligneD1(`q${i}`, 'histoire', `Question ${i} ?`)),
      })
      .mockResolvedValueOnce({
        ok: true,
        total: 150,
        page: 1,
        limit: 100,
        questions: Array.from({ length: 50 }, (_, i) => ligneD1(`q${100 + i}`, 'histoire', `Question ${100 + i} ?`)),
      });
    const { loadCommunityQuestions } = await import('@lib/community.js');
    const themes = await loadCommunityQuestions();
    expect(apiCommunityQuestions).toHaveBeenCalledTimes(2);
    expect(themes[0].questions).toHaveLength(150);
  });

  it('ignore les lignes invalides (zod) et dédup par texte normalisé', async () => {
    apiCommunityQuestions.mockResolvedValue({
      ok: true,
      total: 3,
      page: 0,
      limit: 100,
      questions: [
        ligneD1('q1', 'histoire', 'Capitale de la France ?'),
        ligneD1('q2', 'histoire', '  CAPITALE de la france ! '), // même question, normalisée
        { ...ligneD1('q3', 'histoire', 'Invalide'), bonne: 99 }, // bonne hors limites -> zod refuse
      ],
    });
    const { loadCommunityQuestions } = await import('@lib/community.js');
    const themes = await loadCommunityQuestions();
    expect(themes[0].questions).toHaveLength(1);
    expect(themes[0].questions[0].q).toBe('Capitale de la France ?');
  });

  it('best-effort : erreur réseau -> [] (le jeu continue)', async () => {
    apiCommunityQuestions.mockRejectedValue(new Error('offline'));
    const { loadCommunityQuestions } = await import('@lib/community.js');
    expect(await loadCommunityQuestions()).toEqual([]);
  });
});
