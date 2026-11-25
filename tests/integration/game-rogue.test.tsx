// tests/integration/game-rogue.test.tsx — mode Rogue Quizz : tous thèmes mélangés,
// paliers de difficulté progressifs, 1 seule vie, choix de relique au départ puis
// tous les 10 paliers. La première mauvaise réponse termine la run.
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
// Choisit une carte « sûre » : on évite les reliques qui changent le déroulement du test
// (Recyclage/Spécialiste = sous-flux, 50/50 & Lunettes rouges & Domino = réponses retirées/barrées).
function choisirRelique(): void {
  const cartes = Array.from(document.querySelectorAll('.relique-carte'));
  expect(cartes.length).toBeGreaterThanOrEqual(3);
  const safe = cartes.find(
    (c) => !/Recyclage|Spécialiste|50\/50|Lunettes rouges|Domino/.test(c.textContent || '')
  );
  fireEvent.click(safe || cartes[0]);
}
function renderRogue(themes: ReturnType<typeof makeThemes>, onFinish: (r: GameResult) => void) {
  return render(
    <Game
      config={
        {
          mode: 'rogue',
          theme: themes[0],
          allThemes: themes,
          players: ['testeur'],
        } as unknown as GameLaunchConfig
      }
      prefs={TEST_PREFS}
      onFinish={onFinish}
      onQuit={() => {}}
    />
  );
}
describe('partie rogue (flux complet)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(99));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('choix de relique au départ, puis la première mauvaise réponse termine la run (1 vie)', () => {
    const themes = makeThemes(3, 10); // 90 questions au total
    const onFinish = vi.fn<(result: GameResult) => void>();
    renderRogue(themes, onFinish);
    // Écran de choix de relique au départ (3 propositions)
    expect(document.querySelector('.relique-overlay')).toBeTruthy();
    choisirRelique();
    expect(document.querySelector('.relique-overlay')).toBeNull();
    answerCorrect(); // index 0
    avancer();
    expect(onFinish).not.toHaveBeenCalled();
    answerWrong(); // index 1 : raté, plus de vie (1 vie de départ) -> fin de run
    avancer();
    expect(onFinish).toHaveBeenCalledTimes(1);
    const res = onFinish.mock.calls[0][0];
    expect(res.mode).toBe('rogue');
    // la relique de départ (aléatoire) peut modifier le score : au moins 10 pts de base
    expect(res.scores[0]).toBeGreaterThanOrEqual(10);
    expect(res.bonnes).toEqual([1]);
    expect(res.total).toBe(2); // questions répondues avant la faute
    expect(res.details).toHaveLength(2);
    expect(res.details![1].correct).toBe(false);
    expect(res.relics).toHaveLength(1); // la relique de départ
  });
  it('un nouveau choix de relique est proposé après 10 bonnes réponses (palier)', () => {
    const themes = makeThemes(3, 10);
    const onFinish = vi.fn<(result: GameResult) => void>();
    renderRogue(themes, onFinish);
    choisirRelique(); // relique de départ
    for (let i = 0; i < 10; i++) {
      answerCorrect();
      avancer();
    }
    // Après la 10e bonne réponse : retour à l'écran de choix de relique
    expect(document.querySelector('.relique-overlay')).toBeTruthy();
    choisirRelique();
    expect(document.querySelector('.relique-overlay')).toBeNull();
    expect(onFinish).not.toHaveBeenCalled();
  });
  it('sans clic, le timer de 20 s choisit automatiquement une relique', () => {
    const themes = makeThemes(3, 10);
    const onFinish = vi.fn<(result: GameResult) => void>();
    renderRogue(themes, onFinish);
    expect(document.querySelector('.relique-overlay')).toBeTruthy();
    // le compte à rebours de 20 s est affiché
    expect(document.querySelector('.relique-timer')?.textContent).toMatch(/20 s/);
    // après 20 s sans clic : une relique est choisie automatiquement, on passe à la question
    act(() => {
      vi.advanceTimersByTime(20100);
    });
    expect(document.querySelector('.relique-overlay')).toBeNull();
    expect(document.querySelector('.question')).toBeTruthy();
  });
  it('le chip « Palier 1/10 » est affiché', () => {
    const themes = makeThemes(3, 10);
    renderRogue(themes, () => {});
    choisirRelique();
    expect(screen.getByText('Palier 1/10')).toBeTruthy();
  });
});
