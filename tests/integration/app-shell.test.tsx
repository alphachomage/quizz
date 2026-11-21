// tests/integration/app-shell.test.tsx — test du shell app/ (providers + navigation) :
// invité -> accueil -> choix thème -> modale niveau -> partie -> 1re réponse.
// Le catalogue de données est remplacé par des fixtures (pas les 264 vrais fichiers).
//
// Note écrans en React.lazy (routes.ts) : sous fake timers, les import() dynamiques
// de Vitest ne se résolvent pas. On pré-charge donc le mock + les 9 écrans avec les
// VRAIS timers AVANT vi.useFakeTimers(), puis on avance les timers manuellement.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/app/App.jsx';
import { startGuest } from '@lib/accounts.js';
// makeThemes n'est utilisé que via le import() dynamique du vi.mock ci-dessous.
import { mulberry32 } from '../fixtures/questions.fixture.js';

// Catalogue factice : 3 thèmes x 30 questions (au lieu du vrai corpus).
vi.mock('@data/questions.js', async () => {
  const { makeThemes } = await import('../fixtures/questions.fixture.js');
  return {
    loadThemes: async () => makeThemes(3, 10),
    THEMES_META: makeThemes(3, 10),
  };
});

// Attend qu'un texte apparaisse en avançant les fake timers (scheduler React + chunks lazy).
async function waitForText(matcher: string | RegExp, max = 100): Promise<HTMLElement> {
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
async function preloadModules(): Promise<void> {
  await import('@data/questions.js');
  await Promise.all([
    import('@features/home/Home.jsx'),
    import('@features/account/Account.jsx'),
    import('@features/game/Game.jsx'),
    import('@features/results/Results.jsx'),
    import('@features/leaderboard/Leaderboard.jsx'),
    import('@features/stats/Stats.jsx'),
    import('@features/badges/Badges.jsx'),
    import('@features/question-form/QuestionForm.jsx'),
    import('@features/admin/AdminReports.jsx'),
  ]);
}
describe("shell de l'application (app/)", () => {
  beforeEach(async () => {
    await preloadModules();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(2026));
    // Préférences silencieuses (pas de musique/sons en test).
    window.localStorage.setItem(
      'voltquiz_prefs',
      JSON.stringify({
        sons: false,
        music: false,
        animations: false,
        vibrations: false,
      })
    );
    startGuest(); // session invité posée avant le rendu
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('parcours invité complet : accueil -> thème -> niveau -> partie -> réponse', async () => {
    render(<App />);
    // Accueil : les thèmes factices apparaissent (catalogue + chunk lazy résolus).
    await waitForText('Thème 0');
    expect(screen.getByText('Thème 1')).toBeTruthy();

    // Le tuto de bienvenue s'ouvre à la première connexion : on le ferme.
    const tutorialButton = screen.queryByText("C'est parti");
    if (tutorialButton) fireEvent.click(tutorialButton);

    // Clic sur un thème -> modale de choix du niveau (solo).
    fireEvent.click(screen.getByText('Thème 0'));
    expect(screen.getByText('Choisis la difficulté :')).toBeTruthy();

    // Clic sur "C'est parti" DANS LA MODALE (le CTA fixe du bas a le même libellé).
    fireEvent.click(document.querySelector('.modal .btn-principal')!);
    // Navigation vers l'écran Partie (lazy) : on avance les timers jusqu'à la 1re question.
    await waitForText(/Question \S+ \?/);
    expect(document.querySelector('.question')).toBeTruthy();
    expect(document.querySelectorAll('.reponse')).toHaveLength(4);

    // On répond à la bonne réponse (fixture : bonne = "R<tag>-0") -> feedback +N pts.
    const tag = document.querySelector('.question')!.textContent!.match(/Question (\S+) \?/)![1];
    fireEvent.click(screen.getByText(`R${tag}-0`));
    expect(document.querySelector('.gain')).toBeTruthy();

    // La partie avance automatiquement après 2 s.
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(document.querySelector('.question')).toBeTruthy();
  });
  it("sans session, l'écran de compte s'affiche d'abord", async () => {
    window.localStorage.clear(); // pas de session
    render(<App />);
    // L'écran compte (chunk lazy) propose le mode invité.
    await waitForText(/invité/i);
    expect(screen.getAllByText(/invité/i).length).toBeGreaterThan(0);
  });
  it('vue admin (?admin=1) : tableau de bord en haut + sections de modération', async () => {
    window.history.replaceState(null, '', '/?admin=1');
    try {
      render(<App />);
      // Le tableau de bord apparaît dès que les thèmes factices sont chargés.
      await waitForText('Tableau de bord');
      expect(screen.getByText('Parties jouées')).toBeTruthy();
      expect(screen.getByText('Serveur (V2)')).toBeTruthy();
      expect(screen.getByText('Modération')).toBeTruthy();
      // Les sections existantes restent présentes sous le dashboard.
      expect(screen.getByText('Questions signalées')).toBeTruthy();
      expect(screen.getByText('Suggestions des joueurs')).toBeTruthy();
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });
});
