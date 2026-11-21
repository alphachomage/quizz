// Tests du tirage d'une partie (src/features/game/draw.ts) — fonction pure.
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { drawGameQuestions, withShuffledAnswers, tagTheme } from '@/features/game/draw.js';
import type { GameLaunchConfig } from '@/features/game/draw.js';
import type { Question, Theme } from '@lib/types.js';
import { makeTheme, makeThemes, mulberry32 } from '../../fixtures/questions.fixture.js';
describe('tirerQuestionsPartie', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(42));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('solo : 1 joueur, 10 questions, toutes du niveau choisi', () => {
    const theme = makeTheme({
      id: 'test',
      perLevel: 10,
    });
    const [seriesN] = drawGameQuestions({
      mode: 'solo',
      niveau: 'moyen',
      theme,
      players: ['a'],
    });
    expect(seriesN).toHaveLength(10);
    expect(seriesN.every((q) => q.niveau === 'moyen')).toBe(true);
  });
  it('duel : 2 joueurs, 6 questions chacun, tous niveaux confondus', () => {
    const theme = makeTheme({
      id: 'test',
      perLevel: 10,
    });
    // En duel aucun niveau n'est choisi : cast car GameLaunchConfig déclare `niveau` requis.
    const series = drawGameQuestions({
      mode: 'duel',
      theme,
      players: ['a', 'b'],
    } as unknown as GameLaunchConfig);
    expect(series).toHaveLength(2);
    expect(series[0]).toHaveLength(6);
    expect(series[1]).toHaveLength(6);
  });
  it('survie : questions taguées avec leur thème, plafond 30', () => {
    const themes = makeThemes(3, 10); // 90 questions
    const [seriesN] = drawGameQuestions({
      mode: 'survie',
      theme: themes[0],
      allThemes: themes,
      players: ['a'],
    } as unknown as GameLaunchConfig);
    expect(seriesN).toHaveLength(30);
    expect(seriesN.every((q) => q.themeId && q.themeName)).toBe(true);
  });
  it('quotidien : même ensemble de questions pour la même date (ordre re-mélangé ensuite)', () => {
    const themes = makeThemes(6, 10);
    const cfg: GameLaunchConfig = {
      mode: 'quotidien',
      theme: themes[0],
      allThemes: themes,
      niveau: '2026-05-05',
      players: ['a'],
    };
    const a = drawGameQuestions(cfg);
    const b = drawGameQuestions(cfg);
    expect(a[0]).toHaveLength(10);
    // L'ensemble est seedé (identique pour tous le même jour) ; l'ordre final est re-mélangé.
    expect([...a[0].map((q) => q.q)].sort()).toEqual([...b[0].map((q) => q.q)].sort());
  });
  it('avecReponsesAleatoires : conserve les réponses, recalcule l’index de la bonne', () => {
    const q: Question = {
      q: 'Q ?',
      reponses: ['a', 'b', 'c', 'd'],
      bonne: 2,
      niveau: 'facile',
    };
    const melangee = withShuffledAnswers(q);
    expect([...melangee.reponses].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(melangee.reponses[melangee.bonne]).toBe('c'); // la bonne réponse est toujours "c"
  });
  it('taguerTheme : ajoute les infos du thème sans toucher à la question', () => {
    const t = {
      id: 'geo',
      nom: 'Géographie',
      couleur: '#2dd4bf',
      icone: 'globe',
    } as unknown as Theme; // tagTheme ne lit que id/nom/couleur/icone
    const taguee = tagTheme(
      {
        q: 'Q ?',
        reponses: ['a'],
        bonne: 0,
        niveau: 'facile',
      },
      t
    );
    expect(taguee.themeId).toBe('geo');
    expect(taguee.themeName).toBe('Géographie');
    expect(taguee.q).toBe('Q ?');
  });
});
