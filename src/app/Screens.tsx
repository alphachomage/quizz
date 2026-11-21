// app/Screens.tsx — rendu des écrans de l'appli CONNECTÉE (routes lazy), extrait de App.tsx
// pour rester sous le plafond de 200 L/composant (R6). App.tsx garde les early returns
// (chargement, admin, compte) et délègue ici le reste.
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { ROUTES } from './routes.js';
import type { Navigation, NavConfig } from './useNavigation.js';
import type { Celebration } from './useUnlock.js';
import type { SessionStockee } from './contexts/SessionContext.js';
import type { GameResult, Prefs, Submission, TaggedQuestion, Theme } from '@lib/types.js';
import Tutorial from '@features/tutorial/Tutorial.jsx';
import UnlockModal from '@features/unlock/UnlockModal.jsx';

/** Props déléguées par App (Shell) au rendu des écrans connectés. */
export interface ScreensProps {
  nav: Navigation;
  themes: Theme[] | null;
  session: SessionStockee;
  prefs: Prefs;
  isGuest: boolean;
  tutoOuvert: boolean;
  closeTutorial: () => void;
  deconnexion: () => void;
  start: (cfg: NavConfig) => void;
  finish: (res: GameResult) => void;
  changerPrefs: (nouvelles: Prefs) => void;
  setTutoOuvert: Dispatch<SetStateAction<boolean>>;
  allQuestions: TaggedQuestion[];
  addQuestion: (q: Submission) => void;
  celebration: Celebration | null;
  closeCelebration: () => void;
}

export default function Screens({
  nav,
  themes,
  session,
  prefs,
  isGuest,
  tutoOuvert,
  closeTutorial,
  deconnexion,
  start,
  finish,
  changerPrefs,
  setTutoOuvert,
  allQuestions,
  addQuestion,
  celebration,
  closeCelebration,
}: ScreensProps): ReactElement {
  const Home = ROUTES.home;
  const Game = ROUTES.game;
  const Results = ROUTES.result;
  return (
    <>
      {tutoOuvert && <Tutorial onClose={closeTutorial} isGuest={isGuest} />}
      {nav.screen === 'accueil' && (
        <Home
          themes={themes}
          pseudo={session.pseudo}
          prefs={prefs}
          isAdmin={false}
          isGuest={isGuest}
          onLogout={() => {
            deconnexion();
            nav.navigateTo('accueil');
          }}
          onStart={start}
          onPropose={() => nav.navigateTo('formulaire')}
          onLeaderboard={() => nav.navigateTo('classement')}
          onStats={() => nav.navigateTo('stats')}
          onBadges={() => nav.navigateTo('badges')}
          onChangePrefs={changerPrefs}
          onTutorial={() => setTutoOuvert(true)}
        />
      )}
      {nav.screen === 'classement' && (
        <ROUTES.leaderboard
          themes={themes}
          onHome={() => nav.navigateTo('accueil')}
          onStats={() => nav.navigateTo('stats')}
        />
      )}
      {nav.screen === 'stats' && (
        <ROUTES.stats
          themes={themes}
          pseudo={session.pseudo}
          onHome={() => nav.navigateTo('accueil')}
        />
      )}
      {nav.screen === 'badges' && (
        <ROUTES.badges themes={themes} onHome={() => nav.navigateTo('accueil')} />
      )}
      {nav.screen === 'partie' && nav.config && (
        <Game config={nav.config} prefs={prefs} onFinish={finish} />
      )}
      {nav.screen === 'resultat' && nav.result && nav.config && (
        <Results
          result={nav.result}
          themes={themes}
          isGuest={isGuest}
          onReplay={() => nav.navigateTo('partie')}
          onHome={() => nav.navigateTo('accueil')}
        />
      )}
      {nav.screen === 'formulaire' && (
        <ROUTES.form
          themes={themes}
          allQuestions={allQuestions}
          onAdd={(q: Submission) => {
            addQuestion(q);
            nav.navigateTo('accueil');
          }}
          onCancel={() => nav.navigateTo('accueil')}
        />
      )}
      {nav.screen === 'accueil' && celebration && (
        <UnlockModal
          celebration={celebration}
          onClose={closeCelebration}
          onSeeBadges={() => {
            closeCelebration();
            nav.navigateTo('badges');
          }}
        />
      )}
    </>
  );
}
