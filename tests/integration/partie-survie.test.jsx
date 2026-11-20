// tests/integration/partie-survie.test.jsx — mode survie : tous thèmes/niveaux
// mélangés, 1 seule vie, la première mauvaise réponse termine la partie.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Partie from '@/components/Partie.jsx';

import { makeThemes, mulberry32, PREFS_TEST } from '../fixtures/questions.fixture.js';

function questionCourante() {
  return document.querySelector('.question').textContent.match(/Question (\S+) \?/)[1];
}

function repondreBonne() {
  fireEvent.click(screen.getByText(`R${questionCourante()}-0`));
}

function repondreFaux() {
  fireEvent.click(screen.getByText(`R${questionCourante()}-2`));
}

function avancer() {
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
    const onTerminer = vi.fn();
    render(
      <Partie
        config={{ mode: 'survie', theme: themes[0], tousThemes: themes, joueurs: ['testeur'] }}
        prefs={PREFS_TEST}
        onTerminer={onTerminer}
      />
    );

    repondreBonne(); // index 0 : 20 pts (pas de bonus de manche en survie)
    avancer();
    expect(onTerminer).not.toHaveBeenCalled();

    repondreFaux(); // index 1 : raté -> fin de partie
    avancer();

    expect(onTerminer).toHaveBeenCalledTimes(1);
    const res = onTerminer.mock.calls[0][0];
    expect(res.mode).toBe('survie');
    expect(res.scores).toEqual([20]);
    expect(res.bonnes).toEqual([1]);
    expect(res.total).toBe(2); // questions répondues avant la faute
    expect(res.details).toHaveLength(2);
    expect(res.details[1].correct).toBe(false);
  });

  it('le chip "Tous niveaux" est affiché', () => {
    const themes = makeThemes(3, 10);
    render(
      <Partie
        config={{ mode: 'survie', theme: themes[0], tousThemes: themes, joueurs: ['testeur'] }}
        prefs={PREFS_TEST}
        onTerminer={() => {}}
      />
    );
    expect(screen.getByText('Tous niveaux')).toBeTruthy();
  });
});
