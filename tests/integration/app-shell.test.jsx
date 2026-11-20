// tests/integration/app-shell.test.jsx — test du shell app/ (providers + navigation) :
// invité -> accueil -> choix thème -> modale niveau -> partie -> 1re réponse.
// Le catalogue de données est remplacé par des fixtures (pas les 264 vrais fichiers).
//
// Note écrans en React.lazy (routes.js) : sous fake timers, les import() dynamiques
// de Vitest ne se résolvent pas. On pré-charge donc le mock + les 9 écrans avec les
// VRAIS timers AVANT vi.useFakeTimers(), puis on avance les timers manuellement.
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

// Attend qu'un texte apparaisse en avançant les fake timers (scheduler React + chunks lazy).
async function attendreTexte(matcher, max = 100) {
  for (let i = 0; i < max; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
    const el = screen.queryAllByText(matcher)[0];
    if (el) return el;
  }
  throw new Error('texte introuvable: ' + String(matcher));
}

// Pré-chargement (vrais timers) : le vi.mock de @data/questions.js + les 9 écrans lazy.
async function prechargerModules() {
  await import('@data/questions.js');
  await Promise.all([
    import('@features/accueil/Accueil.jsx'),
    import('@features/compte/Compte.jsx'),
    import('@features/partie/Partie.jsx'),
    import('@features/resultat/Resultat.jsx'),
    import('@features/classement/Classement.jsx'),
    import('@features/stats/Stats.jsx'),
    import('@features/badges/Badges.jsx'),
    import('@features/formulaire/FormulaireQuestion.jsx'),
    import('@features/admin/AdminSignales.jsx'),
  ]);
}

describe('shell de l\'application (app/)', () => {
  beforeEach(async () => {
    await prechargerModules();
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
    // Accueil : les thèmes factices apparaissent (catalogue + chunk lazy résolus).
    await attendreTexte('Thème 0');
    expect(screen.getByText('Thème 1')).toBeTruthy();

    // Le tuto de bienvenue s'ouvre à la première connexion : on le ferme.
    const boutonTuto = screen.queryByText("C'est parti");
    if (boutonTuto) fireEvent.click(boutonTuto);

    // Clic sur un thème -> modale de choix du niveau (solo).
    fireEvent.click(screen.getByText('Thème 0'));
    expect(screen.getByText('Choisis la difficulté :')).toBeTruthy();

    // Clic sur "C'est parti" DANS LA MODALE (le CTA fixe du bas a le même libellé).
    fireEvent.click(document.querySelector('.modal .btn-principal'));
    // Navigation vers l'écran Partie (lazy) : on avance les timers jusqu'à la 1re question.
    await attendreTexte(/Question \S+ \?/);
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

  it('sans session, l\'écran de compte s\'affiche d\'abord', async () => {
    localStorage.clear(); // pas de session
    render(<App />);
    // L'écran compte (chunk lazy) propose le mode invité.
    await attendreTexte(/invité/i);
    expect(screen.getAllByText(/invité/i).length).toBeGreaterThan(0);
  });
});
