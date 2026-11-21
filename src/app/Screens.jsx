// app/Ecrans.jsx — rendu des écrans de l'appli CONNECTÉE (routes lazy), extrait de App.jsx
// pour rester sous le plafond de 200 L/composant (R6). App.jsx garde les early returns
// (chargement, admin, compte) et délègue ici le reste.
import { ROUTES } from './routes.js';
import Tutorial from '@features/tutorial/Tutorial.jsx';
import UnlockModal from '@features/unlock/UnlockModal.jsx';
export default function Screens({
  nav,
  themes,
  session,
  prefs,
  isGuest: isGuest,
  tutoOuvert,
  closeTutorial: closeTutorial,
  deconnexion,
  start,
  finish: finish,
  changerPrefs,
  setTutoOuvert,
  allQuestions: allQuestions,
  addQuestion: addQuestion,
  celebration,
  closeCelebration: closeCelebration,
}) {
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
          onAdd={(q) => {
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
