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
  estInvite,
  tutoOuvert,
  fermerTuto,
  deconnexion,
  start,
  terminer,
  changerPrefs,
  setTutoOuvert,
  toutesQuestions,
  ajouterQuestion,
  celebration,
  fermerCelebration,
}) {
  const Home = ROUTES.home;
  const Game = ROUTES.game;
  const Results = ROUTES.result;

  return (
    <>
      {tutoOuvert && <Tutorial onFermer={fermerTuto} estInvite={estInvite} />}
      {nav.screen === 'accueil' && (
        <Home
          themes={themes}
          pseudo={session.pseudo}
          prefs={prefs}
          estAdmin={false}
          estInvite={estInvite}
          onDeconnexion={() => { deconnexion(); nav.allerVers('accueil'); }}
          onDemarrer={start}
          onProposer={() => nav.allerVers('formulaire')}
          onClassement={() => nav.allerVers('classement')}
          onStats={() => nav.allerVers('stats')}
          onBadges={() => nav.allerVers('badges')}
          onChangerPrefs={changerPrefs}
          onTuto={() => setTutoOuvert(true)}
        />
      )}
      {nav.screen === 'classement' && <ROUTES.leaderboard themes={themes} onAccueil={() => nav.allerVers('accueil')} onStats={() => nav.allerVers('stats')} />}
      {nav.screen === 'stats' && <ROUTES.stats themes={themes} pseudo={session.pseudo} onAccueil={() => nav.allerVers('accueil')} />}
      {nav.screen === 'badges' && <ROUTES.badges themes={themes} onAccueil={() => nav.allerVers('accueil')} />}
      {nav.screen === 'partie' && nav.config && <Game config={nav.config} prefs={prefs} onTerminer={terminer} />}
      {nav.screen === 'resultat' && nav.result && nav.config && (
        <Results
          result={nav.result}
          themes={themes}
          estInvite={estInvite}
          onRejouer={() => nav.allerVers('partie')}
          onAccueil={() => nav.allerVers('accueil')}
        />
      )}
      {nav.screen === 'formulaire' && (
        <ROUTES.form
          themes={themes}
          toutesQuestions={toutesQuestions}
          onAjouter={(q) => { ajouterQuestion(q); nav.allerVers('accueil'); }}
          onAnnuler={() => nav.allerVers('accueil')}
        />
      )}
      {nav.screen === 'accueil' && celebration && (
        <UnlockModal
          celebration={celebration}
          onFermer={fermerCelebration}
          onVoirBadges={() => { fermerCelebration(); nav.allerVers('badges'); }}
        />
      )}
    </>
  );
}
