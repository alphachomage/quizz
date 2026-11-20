// app/App.jsx — shell de l'application (~100 L) : providers + flags URL + routes.
// Toute la logique d'état vit dans les hooks (useNavigation, useCelebration) et
// les contexts (session, prefs, thèmes). Les composants d'écran sont dans routes.js.
import { useEffect, useMemo, useState } from 'react';

import AppProviders from './AppProviders.jsx';
import { ROUTES } from './routes.js';
import { useNavigation } from './useNavigation.js';
import { useCelebration } from './useCelebration.js';
import { lireFlagsUrl, retirerFlagsUrl, urlSansFlagAdmin } from './urlFlags.js';
import { useSession } from './contexts/SessionContext.js';
import { usePrefs } from './contexts/PrefsContext.js';
import { useThemes } from './contexts/ThemesContext.js';

import Tuto from '../components/Tuto.jsx';
import Deblocage from '../components/Deblocage.jsx';

import { aVuTuto, marquerTutoVu, sessionActuelle } from '@lib/comptes.js';
import { reinitialiserScores, reinitialiserProgression } from '@lib/reset.js';
import { persisterResultat } from '@features/resultat/persistance.js';
import { telechargerJSON } from '@shared/utils/telechargerJSON.js';

export default function App() {
  return (
    <AppProviders>
      <Shell />
    </AppProviders>
  );
}

function Shell() {
  const { session, setSession, deconnexion, estInvite } = useSession();
  const { prefs, changerPrefs } = usePrefs();
  const {
    themes,
    toutesQuestions,
    soumissions,
    nbValidees,
    ajouterQuestion,
    supprimerQuestion,
    validerQuestion,
    exporterValidees,
  } = useThemes();
  const nav = useNavigation();
  const { celebration, prendreSnapshot, revelerNouveautes, fermerCelebration } = useCelebration({ estInvite, prefs });

  // Flags d'URL (lus UNE fois) : ?admin=1 ?reset=1 ?resetcompte=1 ?tuto=1
  const flags = useMemo(() => lireFlagsUrl(), []);
  const [estAdmin] = useState(flags.admin);
  const [tutoOuvert, setTutoOuvert] = useState(false);

  // Reset manuel sur la version d'essai (?reset=1 / ?resetcompte=1), une fois, puis
  // on nettoie l'URL — aucun bouton dans l'appli.
  useEffect(() => {
    if (flags.reset) {
      reinitialiserScores();
      retirerFlagsUrl(['reset']);
    }
    if (flags.resetcompte) {
      reinitialiserProgression();
      retirerFlagsUrl(['resetcompte']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tuto de bienvenue : ouvert UNE SEULE FOIS par compte (clé fixe « invite » en mode invité),
  // rouvrable à volonté avec ?tuto=1 ou le bouton « ? ».
  const cleTuto = session ? (session.invite ? 'invite' : session.pseudo) : null;
  useEffect(() => {
    if (!estAdmin && (flags.tuto || (cleTuto && !aVuTuto(cleTuto)))) setTutoOuvert(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, estAdmin]);

  function fermerTuto() {
    if (cleTuto) marquerTutoVu(cleTuto);
    setTutoOuvert(false);
  }

  function demarrer(cfg) {
    prendreSnapshot(); // badges/titres débloqués AVANT la partie
    nav.demarrer(cfg);
  }

  function terminer(res) {
    // Persistance de la partie UNE FOIS ici (record, historique, XP, classement,
    // streak du jour) : le composant Resultat ne fait plus que lire res.persistance.
    const persistance = persisterResultat(res, estInvite, prefs);
    revelerNouveautes(); // badges/titres débloqués PENDANT la partie -> animation au retour
    nav.terminer({ ...res, persistance });
  }

  function quitterAdmin() {
    // Recharge la page sans ?admin=1 : les exclusions admin sont alors retirées du pool.
    window.location.assign(urlSansFlagAdmin());
  }

  const classeApp = prefs.animations === false ? 'app sans-animations' : 'app';
  const Accueil = ROUTES.accueil;
  const Partie = ROUTES.partie;
  const Resultat = ROUTES.resultat;

  // Vue admin (?admin=1) : prioritaire, même sans compte connecté.
  if (estAdmin) {
    const Admin = ROUTES.admin;
    return (
      <div className={classeApp}>
        <Admin
          onQuitter={quitterAdmin}
          themes={themes}
          soumissions={soumissions}
          nbValidees={nbValidees}
          onValiderSoumission={validerQuestion}
          onSupprimerSoumission={supprimerQuestion}
          onExporterValidees={() => telechargerJSON(exporterValidees())}
        />
      </div>
    );
  }

  // Sans compte connecté, on affiche d'abord l'écran de connexion/création de compte.
  if (!session) {
    const Compte = ROUTES.compte;
    return (
      <div className={classeApp}>
        {tutoOuvert && <Tuto onFermer={fermerTuto} estInvite={false} />}
        <Compte onConnexion={() => setSession(sessionActuelle())} />
      </div>
    );
  }

  return (
    <div className={classeApp}>
      {tutoOuvert && <Tuto onFermer={fermerTuto} estInvite={estInvite} />}
      {nav.ecran === 'accueil' && (
        <Accueil
          themes={themes}
          pseudo={session.pseudo}
          prefs={prefs}
          estAdmin={estAdmin}
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
    </div>
  );
}
