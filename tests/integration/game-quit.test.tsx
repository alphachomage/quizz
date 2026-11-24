// tests/integration/game-quit.test.tsx — bouton croix "quitter" dans la TopBar :
// au clic, onQuit est appelé avec les résultats PARTIELS (questions répondues),
// onFinish n'est PAS appelé, et le score reflète uniquement les points gagnés.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Game from '@features/game/Game.jsx';
import type { GameResult } from '@lib/types.js';
import { makeTheme, mulberry32, TEST_PREFS } from '../fixtures/questions.fixture.js';

function currentQuestion(): string {
  const h1 = document.querySelector('.question');
  return h1!.textContent!.match(/Question (\S+) \?/)![1];
}
function goodAnswer(): string {
  return `R${currentQuestion()}-0`;
}
function repondreCorrect(): void {
  fireEvent.click(screen.getByText(goodAnswer()));
}
function avancer(): void {
  act(() => {
    vi.advanceTimersByTime(2100);
  });
}

describe('bouton quitter (abandon en cours de partie)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(2026));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('après 3 bonnes réponses, la croix appelle onQuit avec le score partiel', () => {
    const theme = makeTheme({ id: 'test', perLevel: 10 });
    const onFinish = vi.fn<(result: GameResult) => void>();
    const onQuit = vi.fn<(result: GameResult) => void>();
    render(
      <Game
        config={{ mode: 'solo', niveau: 'facile', theme, players: ['testeur'] }}
        prefs={TEST_PREFS}
        onFinish={onFinish}
        onQuit={onQuit}
      />
    );

    // 3 bonnes réponses (gains 20, 21, 22 = 63 pts).
    for (let i = 0; i < 3; i++) {
      repondreCorrect();
      avancer();
    }

    // Clic sur la croix.
    fireEvent.click(screen.getByRole('button', { name: /quitter la partie/i }));

    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
    const res = onQuit.mock.calls[0][0];
    expect(res.mode).toBe('solo');
    expect(res.scores).toEqual([63]);
    expect(res.bonnes).toEqual([3]);
    expect(res.total).toBe(3); // questions effectivement répondues
    expect(res.details).toHaveLength(3);
  });

  it('quitter dès la 1re question : score 0, total 0, aucun détail', () => {
    const theme = makeTheme({ id: 'test', perLevel: 10 });
    const onFinish = vi.fn<(result: GameResult) => void>();
    const onQuit = vi.fn<(result: GameResult) => void>();
    render(
      <Game
        config={{ mode: 'solo', niveau: 'facile', theme, players: ['testeur'] }}
        prefs={TEST_PREFS}
        onFinish={onFinish}
        onQuit={onQuit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /quitter la partie/i }));

    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
    const res = onQuit.mock.calls[0][0];
    expect(res.scores).toEqual([0]);
    expect(res.bonnes).toEqual([0]);
    expect(res.total).toBe(0);
    expect(res.details).toHaveLength(0);
  });
});
