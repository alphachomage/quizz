// tests/integration/app-shell.test.jsx — test du shell app/ (providers + navigation) :
// invité -> accueil -> choix thème -> modale niveau -> partie -> 1re réponse.
// Le catalogue de données est remplacé par des fixtures (pas les 264 vrais fichiers).
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/app/App.jsx';
import { demarrerInvite } from '@lib/comptes.js';

import { makeThemes, mulberry32 } from '../fixtures/questions.fixture.js';

// Catalogue factice : 3 thèmes x 30 questions (au lieu du vrai corpus).
vi.mock('@data/questions.js', async () => {
  const { makeThemes } = await import('../fixtures/questions.fixture.js');
  return { chargerThemes: async () => makeThemes(3, 10), THEMES_META: makeThemes(3, 10) };
});

describe('shell de l\'application (app/)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(2026));
    // Préférences silencieuses (pas de musique/sons en test).
    localStorage.setItem(
      'voltquiz_prefs',
      JSON.stringify({ sons: false, musique: false, animations: false, vibrations: false })
    );
    demarrerInvite(); // session invité posée avant le rendu
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('parcours invité complet : accueil -> thème -> niveau -> partie -> réponse', async () => {
    render(<App />);
    // Laisse résoudre le chargement async du catalogue (chunks lazy) : flush des micro-tâches.
    await act(async () => {});

    // Accueil : les 3 thèmes factices sont affichés (mode solo par défaut).
    expect(screen.getByText('Thème 0')).toBeTruthy();
    expect(screen.getByText('Thème 1')).toBeTruthy();

    // Le tuto de bienvenue s'ouvre à la première connexion : on le ferme.
    const boutonTuto = screen.queryByText("C'est parti");
    if (boutonTuto) fireEvent.click(boutonTuto);

    // Clic sur un thème -> modale de choix du niveau (solo).
    fireEvent.click(screen.getByText('Thème 0'));
    expect(screen.getByText('Choisis la difficulté :')).toBeTruthy();

    // Clic sur "C'est parti" DANS LA MODALE (le CTA fixe du bas a le même libellé).
    fireEvent.click(document.querySelector('.modal .btn-principal'));
    expect(document.querySelector('.question')).toBeTruthy();
    expect(document.querySelectorAll('.reponse')).toHaveLength(4);

    // On répond à la bonne réponse (fixture : bonne = "R<tag>-0") -> feedback +N pts.
    const tag = document.querySelector('.question').textContent.match(/Question (\S+) \?/)[1];
    fireEvent.click(screen.getByText(`R${tag}-0`));
    expect(document.querySelector('.gain')).toBeTruthy();

    // La partie avance automatiquement après 2 s.
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(document.querySelector('.question')).toBeTruthy();
  });

  it('sans session, l\'écran de compte s\'affiche d\'abord', () => {
    localStorage.clear(); // pas de session
    render(<App />);
    // L'écran compte propose le mode invité.
    expect(screen.getAllByText(/invité/i).length).toBeGreaterThan(0);
  });
});
