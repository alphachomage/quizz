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
    // API serveur factice : admin check OK, health/stats OK, kv OK.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown) => {
        const url = String(input);
        const data = url.startsWith('/api/admin/check')
          ? { ok: true, admin: true }
          : url.startsWith('/api/health')
            ? { ok: true, app: 'VoltQuiz', version: '0.1.0', hour: new Date().toISOString() }
            : url.startsWith('/api/stats')
              ? { ok: true, rooms: 0, rapportsCsp: 0, hits429: 0 }
              : { ok: true };
        return { ok: true, status: 200, json: async () => data } as unknown as Response;
      })
    );
    startGuest(); // session invité posée avant le rendu
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('parcours invité complet : accueil -> mode Solo -> thème + niveau -> partie -> réponse', async () => {
    render(<App />);
    // Accueil : les 4 tuiles de mode apparaissent.
    await waitForText('Solo');

    // Le tuto de bienvenue s'ouvre à la première connexion : on le ferme.
    const tutorialButton = screen.queryByText("C'est parti");
    if (tutorialButton) fireEvent.click(tutorialButton);

    // Tuile Solo -> popin de choix du thème (carrousel) + difficulté.
    fireEvent.click(screen.getByRole('button', { name: 'Solo' }));
    await waitForText('Thème aléatoire');
    // Le carrousel boucle : chaque carte existe en plusieurs exemplaires, seul celui du
    // milieu est exposé aux lecteurs d'écran (les copies sont aria-hidden). La carte au
    // centre (la 1re au départ) est la carte choisie.
    expect(screen.getByRole('button', { name: /^Thème 1\b/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Thème 0\b/ }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Difficile' }));

    // « C'est parti ! » dans la popin.
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
  it('vue admin (?admin=1 + session compte autorisée côté serveur) : tableau de bord + sections', async () => {
    window.history.replaceState(null, '', '/?admin=1');
    // Session COMPTE (pas invité) : le gate appelle /api/admin/check (mocké OK ci-dessus).
    window.localStorage.setItem(
      'voltquiz_session',
      JSON.stringify({ pseudo: 'testeur', avatar: null })
    );
    try {
      render(<App />);
      // Le tableau de bord apparaît dès que les thèmes factices sont chargés.
      await waitForText('Tableau de bord');
      expect(screen.getByText('Parties jouées')).toBeTruthy();
      expect(screen.getByText('Serveur (API)')).toBeTruthy();
      expect(screen.getByText('Modération')).toBeTruthy();
      // Les sections existantes restent présentes sous le dashboard.
      expect(screen.getByText('Questions signalées')).toBeTruthy();
      expect(screen.getByText('Suggestions des joueurs')).toBeTruthy();
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });
  it('?admin=1 en mode invité : PAS de vue admin, l’accueil s’affiche', async () => {
    window.history.replaceState(null, '', '/?admin=1');
    try {
      render(<App />); // beforeEach a posé une session invité (startGuest)
      await waitForText('Solo'); // accueil normal (tuiles de mode)
      expect(screen.queryByText('Tableau de bord')).toBeNull();
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });
});
