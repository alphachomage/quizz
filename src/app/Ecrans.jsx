// app/Ecrans.jsx — rendu des écrans de l'appli CONNECTÉE (routes lazy), extrait de App.jsx
// pour rester sous le plafond de 200 L/composant (R6). App.jsx garde les early returns
// (chargement, admin, compte) et délègue ici le reste.
import { ROUTES } from './routes.js';

import Tuto from '@features/tuto/Tuto.jsx';
import Deblocage from '@features/deblocage/Deblocage.jsx';

export default function Ecrans({
  nav,
  themes,
  session,
  prefs,
  estInvite,
  tutoOuvert,
  fermerTuto,
  deconnexion,
  demarrer,
  terminer,
  changerPrefs,
  setTutoOuvert,
  toutesQuestions,
  ajouterQuestion,
  celebration,
  fermerCelebration,
}) {
  const Accueil = ROUTES.accueil;
  const Partie = ROUTES.partie;
  const Resultat = ROUTES.resultat;

  return (
    <>
      {tutoOuvert && <Tuto onFermer={fermerTuto} estInvite={estInvite} />}
      {nav.ecran === 'accueil' && (
        <Accueil
          themes={themes}
          pseudo={session.pseudo}
          prefs={prefs}
          estAdmin={false}
          estInvite={estInvite}
          onDeconnexion={() => { deconnexion(); nav.allerVers('accueil'); }}
          onDemarrer={demarrer}
          onProposer={() => nav.allerVers('formulaire')}
          onClassement={() => nav.allerVers('classement')}
          onStats={() => nav.allerVers('stats')}
          onBadges={() => nav.allerVers('badges')}
          onChangerPrefs={changerPrefs}
          onTuto={() => setTutoOuvert(true)}
        />
      )}
      {nav.ecran === 'classement' && <ROUTES.classement themes={themes} onAccueil={() => nav.allerVers('accueil')} onStats={() => nav.allerVers('stats')} />}
      {nav.ecran === 'stats' && <ROUTES.stats themes={themes} pseudo={session.pseudo} onAccueil={() => nav.allerVers('accueil')} />}
      {nav.ecran === 'badges' && <ROUTES.badges themes={themes} onAccueil={() => nav.allerVers('accueil')} />}
      {nav.ecran === 'partie' && nav.config && <Partie config={nav.config} prefs={prefs} onTerminer={terminer} />}
      {nav.ecran === 'resultat' && nav.resultat && nav.config && (
        <Resultat
          resultat={nav.resultat}
          prefs={prefs}
          themes={themes}
          estInvite={estInvite}
          onRejouer={() => nav.allerVers('partie')}
          onAccueil={() => nav.allerVers('accueil')}
        />
      )}
      {nav.ecran === 'formulaire' && (
        <ROUTES.formulaire
          themes={themes}
          toutesQuestions={toutesQuestions}
          onAjouter={(q) => { ajouterQuestion(q); nav.allerVers('accueil'); }}
          onAnnuler={() => nav.allerVers('accueil')}
        />
      )}
      {nav.ecran === 'accueil' && celebration && (
        <Deblocage
          celebration={celebration}
          onFermer={fermerCelebration}
          onVoirBadges={() => { fermerCelebration(); nav.allerVers('badges'); }}
        />
      )}
    </>
  );
}
