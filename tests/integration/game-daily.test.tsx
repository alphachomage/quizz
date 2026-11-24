// tests/integration/game-daily.test.tsx — quizz du jour : tirage seedé
// (identique pour tout le monde le même jour), 10 questions, pas de manche bonus.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Game from '@features/game/Game.jsx';
import type { GameResult } from '@lib/types.js';
import { makeThemes, mulberry32, TEST_PREFS } from '../fixtures/questions.fixture.js';
function currentQuestion(): string {
  return document.querySelector('.question')!.textContent!.match(/Question (\S+) \?/)![1];
}
function answerCorrect(): void {
  fireEvent.click(screen.getByText(`R${currentQuestion()}-0`));
}
function avancer(): void {
  act(() => {
    vi.advanceTimersByTime(2100);
  });
}
describe('quizz du jour (flux complet)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(11));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('10 questions seedées, 10 bonnes réponses, score 245 (20 x 10 + bonus de série)', () => {
    const themes = makeThemes(6, 10); // 180 questions brassées par le tirage seedé
    const onFinish = vi.fn<(result: GameResult) => void>();
    const onQuit = vi.fn<(result: GameResult) => void>();
    render(
      <Game
        config={{
          mode: 'quotidien',
          theme: themes[0],
          allThemes: themes,
          niveau: '2026-05-05',
          players: ['testeur'],
        }}
        prefs={TEST_PREFS}
        onFinish={onFinish}
        onQuit={onQuit}
      />
    );

    // Le tirage du jour est déterministe : il dépend de la date, pas de Math.random.
    expect(screen.getByText(/Quizz du 2026-05-05/)).toBeTruthy();
    const gains: number[] = [];
    for (let i = 0; i < 10; i++) {
      answerCorrect();
      const el = document.querySelector('.gain');
      gains.push(Number(el!.textContent!.match(/\+(\d+) pts/)![1]));
      avancer();
    }

    // Pas de manche bonus en quotidien : 20 pts + bonus de série (0..9), pas de x1,5
    // (série de jours à 0 dans les tests).
    expect(gains).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
    expect(onFinish).toHaveBeenCalledTimes(1);
    const res = onFinish.mock.calls[0][0];
    expect(res.mode).toBe('quotidien');
    expect(res.scores).toEqual([245]);
    expect(res.bonnes).toEqual([10]);
    expect(res.total).toBe(10);
    // Chaque question du jour porte son thème d'origine.
    const touchedThemes = new Set(res.details!.map((d) => d.themeId));
    expect(touchedThemes.size).toBeGreaterThan(1);
  });
});
