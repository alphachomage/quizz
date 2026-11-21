// tests/integration/partie-solo.test.jsx — flux complet d'une partie SOLO :
// 10 questions, minuteur gelé (réponses instantanées), enchaînement auto,
// score exact attendu, puis appel de onTerminer avec le bon récapitulatif.
// C'est la commande `npm run test:partie` : elle doit rester verte à chaque commit.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Game from '@features/game/Game.jsx';
import { makeTheme, mulberry32, TEST_PREFS } from '../fixtures/questions.fixture.js';

// Tag de la question affichée dans le <h1 class="question">.
function currentQuestion() {
  const h1 = document.querySelector('.question');
  const m = h1.textContent.match(/Question (\S+) \?/);
  return m[1];
}

// Texte de la bonne réponse de la question courante (fixture : bonne = "R<tag>-0").
function goodAnswer() {
  return `R${currentQuestion()}-0`;
}
function answerCorrect() {
  fireEvent.click(screen.getByText(goodAnswer()));
}

// Lit le gain affiché dans le feedback ("+N pts") et le renvoie en nombre.
function gainAffiche() {
  const el = document.querySelector('.gain');
  return Number(el.textContent.match(/\+(\d+) pts/)[1]);
}
function avancer() {
  act(() => {
    vi.advanceTimersByTime(2100); // enchaînement auto après 2 s
  });
}
describe('partie solo (flux complet)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(2026));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it("10 bonnes réponses d'affilée : score exact 302, récapitulatif complet", () => {
    const theme = makeTheme({
      id: 'test',
      perLevel: 10,
    }); // 20 questions "facile"
    const onFinish = vi.fn();
    render(
      <Game
        config={{
          mode: 'solo',
          niveau: 'facile',
          theme,
          players: ['testeur'],
        }}
        prefs={TEST_PREFS}
        onFinish={onFinish}
      />
    );
    const gains = [];
    for (let i = 0; i < 10; i++) {
      expect(document.querySelector('.question')).toBeTruthy();
      answerCorrect();
      gains.push(gainAffiche());
      avancer();
    }

    // Score attendu : manches 1-2 (index 0..7) = 20 + bonus de série (0..7) ;
    // manche 3 bonus (index 8..9) = 20 x2 + bonus de série (8 et 9, non doublé).
    expect(gains).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 48, 49]);
    expect(onFinish).toHaveBeenCalledTimes(1);
    const res = onFinish.mock.calls[0][0];
    expect(res.mode).toBe('solo');
    expect(res.scores).toEqual([285]);
    expect(res.bonnes).toEqual([10]);
    expect(res.total).toBe(10);
    expect(res.details).toHaveLength(10);
    expect(res.details.every((d) => d.correct)).toBe(true);
    expect(res.details.every((d) => d.themeId === 'test')).toBe(true);
  });
  it('une mauvaise réponse rapporte 0 pt et la partie continue', () => {
    const theme = makeTheme({
      id: 'test',
      perLevel: 10,
    });
    const onFinish = vi.fn();
    render(
      <Game
        config={{
          mode: 'solo',
          niveau: 'facile',
          theme,
          players: ['testeur'],
        }}
        prefs={TEST_PREFS}
        onFinish={onFinish}
      />
    );

    // Mauvaise réponse à la 1re question : on clique une réponse qui n'est PAS la bonne.
    const wrong = `R${currentQuestion()}-1`;
    fireEvent.click(screen.getByText(wrong));
    expect(document.querySelector('.rate')).toBeTruthy();
    avancer();

    // Puis 9 bonnes réponses.
    for (let i = 0; i < 9; i++) {
      answerCorrect();
      avancer();
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
    const res = onFinish.mock.calls[0][0];
    // 1re question à 0 (série remise à 0), puis index 1..9 corrects :
    // index 1..7 = 20 + bonus de série (0..6) ; index 8,9 = 20 x2 + bonus (7, 8).
    const attendu = [0, 20, 21, 22, 23, 24, 25, 26, 47, 48];
    expect(res.scores[0]).toBe(attendu.reduce((a, b) => a + b, 0));
    expect(res.bonnes).toEqual([9]);
    expect(res.details[0].correct).toBe(false);
    expect(res.details[0].gain).toBe(0);
  });
});
