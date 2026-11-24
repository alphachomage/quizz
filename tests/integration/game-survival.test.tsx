// tests/integration/game-survival.test.tsx — mode survie : tous thèmes/niveaux
// mélangés, 1 seule vie, la première mauvaise réponse termine la partie.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Game from '@features/game/Game.jsx';
import type { GameLaunchConfig } from '@features/game/draw.js';
import type { GameResult } from '@lib/types.js';
import { makeThemes, mulberry32, TEST_PREFS } from '../fixtures/questions.fixture.js';
function currentQuestion(): string {
  return document.querySelector('.question')!.textContent!.match(/Question (\S+) \?/)![1];
}
function answerCorrect(): void {
  fireEvent.click(screen.getByText(`R${currentQuestion()}-0`));
}
function answerWrong(): void {
  fireEvent.click(screen.getByText(`R${currentQuestion()}-2`));
}
function avancer(): void {
  act(() => {
    vi.advanceTimersByTime(2100);
  });
}
describe('partie survie (flux complet)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(99));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('la première mauvaise réponse termine la partie (1 vie)', () => {
    const themes = makeThemes(3, 10); // 90 questions au total
    const onFinish = vi.fn<(result: GameResult) => void>();
    const onQuit = vi.fn<(result: GameResult) => void>();
    render(
      <Game
        config={
          // En survie aucun niveau n'est choisi : cast car GameLaunchConfig déclare `niveau` requis.
          {
            mode: 'survie',
            theme: themes[0],
            allThemes: themes,
            players: ['testeur'],
          } as unknown as GameLaunchConfig
        }
        prefs={TEST_PREFS}
        onFinish={onFinish}
        onQuit={onQuit}
      />
    );
    answerCorrect(); // index 0 : 20 pts (pas de bonus de manche en survie)
    avancer();
    expect(onFinish).not.toHaveBeenCalled();
    answerWrong(); // index 1 : raté -> fin de partie
    avancer();
    expect(onFinish).toHaveBeenCalledTimes(1);
    const res = onFinish.mock.calls[0][0];
    expect(res.mode).toBe('survie');
    expect(res.scores).toEqual([20]);
    expect(res.bonnes).toEqual([1]);
    expect(res.total).toBe(2); // questions répondues avant la faute
    expect(res.details).toHaveLength(2);
    expect(res.details![1].correct).toBe(false);
  });
  it('le chip "Tous niveaux" est affiché', () => {
    const themes = makeThemes(3, 10);
    render(
      <Game
        config={
          {
            mode: 'survie',
            theme: themes[0],
            allThemes: themes,
            players: ['testeur'],
          } as unknown as GameLaunchConfig
        }
        prefs={TEST_PREFS}
        onFinish={() => {}}
        onQuit={() => {}}
      />
    );
    expect(screen.getByText('Tous niveaux')).toBeTruthy();
  });
});
