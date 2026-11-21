// tests/integration/game-duel.test.tsx — flux complet d'un duel 1v1 local :
// écran « passe l'appareil » entre les tours, 6 questions par joueur,
// dernière manche en bonus x2, récapitulatif à 2 joueurs.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Game from '@features/game/Game.jsx';
import type { GameLaunchConfig } from '@features/game/draw.js';
import type { GameResult } from '@lib/types.js';
import { makeTheme, mulberry32, TEST_PREFS } from '../fixtures/questions.fixture.js';
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
function pret(): void {
  fireEvent.click(screen.getByText(/Je suis prêt/));
}
describe('partie duel 1v1 (flux complet)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(7));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it("2 joueurs x 6 questions, passe l'appareil entre les tours, manches bonus x2", () => {
    const theme = makeTheme({
      id: 'test',
      perLevel: 10,
    }); // 30 questions au total
    const onFinish = vi.fn<(result: GameResult) => void>();
    render(
      <Game
        config={
          // En duel aucun niveau n'est choisi : cast car GameLaunchConfig déclare `niveau` requis.
          {
            mode: 'duel',
            theme,
            players: ['Alice', 'Bob'],
          } as unknown as GameLaunchConfig
        }
        prefs={TEST_PREFS}
        onFinish={onFinish}
      />
    );

    // En duel, les joueurs alternent question par question : 12 tours au total
    // (6 questions par joueur), avec un écran « passe l'appareil » entre chaque tour.
    expect(screen.getByText(/Passe l'appareil à/)).toBeTruthy();
    for (let turn = 0; turn < 12; turn++) {
      if (screen.queryByText(/Passe l'appareil à/)) pret();
      answerCorrect();
      avancer();
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
    const res = onFinish.mock.calls[0][0];
    expect(res.mode).toBe('duel');
    expect(res.players).toEqual(['Alice', 'Bob']);
    expect(res.total).toBe(6);
    expect(res.bonnes).toEqual([6, 6]);
    // Duel 6 questions = manches 2+2+2 : index 0..3 = 20+streak, index 4,5 en x2
    // (bonus de série ajouté APRÈS le doublement) : 20,21,22,23, 40+4=44, 40+5=45 -> 175.
    expect(res.scores).toEqual([175, 175]);
    expect(res.details).toHaveLength(12);
  });
});
