// tests/integration/partie-duel.test.jsx — flux complet d'un duel 1v1 local :
// écran « passe l'appareil » entre les tours, 6 questions par joueur,
// dernière manche en bonus x2, récapitulatif à 2 joueurs.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Partie from '@/components/Partie.jsx';

import { makeTheme, mulberry32, PREFS_TEST } from '../fixtures/questions.fixture.js';

function questionCourante() {
  return document.querySelector('.question').textContent.match(/Question (\S+) \?/)[1];
}

function repondreBonne() {
  fireEvent.click(screen.getByText(`R${questionCourante()}-0`));
}

function avancer() {
  act(() => {
    vi.advanceTimersByTime(2100);
  });
}

function pret() {
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

  it('2 joueurs x 6 questions, passe l\'appareil entre les tours, manches bonus x2', () => {
    const theme = makeTheme({ id: 'test', parNiveau: 10 }); // 30 questions au total
    const onTerminer = vi.fn();
    render(
      <Partie
        config={{ mode: 'duel', theme, joueurs: ['Alice', 'Bob'] }}
        prefs={PREFS_TEST}
        onTerminer={onTerminer}
      />
    );

    // En duel, les joueurs alternent question par question : 12 tours au total
    // (6 questions par joueur), avec un écran « passe l'appareil » entre chaque tour.
    expect(screen.getByText(/Passe l'appareil à/)).toBeTruthy();
    for (let tour = 0; tour < 12; tour++) {
      if (screen.queryByText(/Passe l'appareil à/)) pret();
      repondreBonne();
      avancer();
    }

    expect(onTerminer).toHaveBeenCalledTimes(1);
    const res = onTerminer.mock.calls[0][0];
    expect(res.mode).toBe('duel');
    expect(res.joueurs).toEqual(['Alice', 'Bob']);
    expect(res.total).toBe(6);
    expect(res.bonnes).toEqual([6, 6]);
    // Duel 6 questions = manches 2+2+2 : index 0..3 = 20+streak, index 4,5 en x2
    // (bonus de série ajouté APRÈS le doublement) : 20,21,22,23, 40+4=44, 40+5=45 -> 175.
    expect(res.scores).toEqual([175, 175]);
    expect(res.details).toHaveLength(12);
  });
});
