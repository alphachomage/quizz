// app/App.jsx — shell de l'application (~100 L) : providers + flags URL + routes.
// Toute la logique d'état vit dans les hooks (useNavigation, useCelebration) et
// les contexts (session, prefs, thèmes). Les composants d'écran sont dans routes.js.
import { Suspense, useEffect, useMemo, useState } from 'react';

import AppProviders from './AppProviders.jsx';
import Ecrans from './Ecrans.jsx';
import { ROUTES } from './routes.js';
import { useNavigation } from './useNavigation.js';
import { useCelebration } from './useCelebration.js';
import { lireFlagsUrl, retirerFlagsUrl, urlSansFlagAdmin, redirigerVers } from './urlFlags.js';
import { useSession } from './contexts/SessionContext.js';
import { usePrefs } from './contexts/PrefsContext.js';
import { useThemes } from './contexts/ThemesContext.js';

import Tuto from '@features/tuto/Tuto.jsx';
// Deblocage rendu dans app/Ecrans.jsx

import { aVuTuto, marquerTutoVu, sessionActuelle } from '@lib/comptes.js';
import { reinitialiserScores, reinitialiserProgression } from '@lib/reset.js';
import { persisterResultat } from '@features/resultat/persistance.js';
import { telechargerJSON } from '@shared/utils/telechargerJSON.js';

export default function App() {
  return (
    <AppProviders>
      {/* Les écrans de routes.js sont en React.lazy : pendant le chargement d'un
          chunk, on affiche un écran de chargement sobre (mêmes classNames que les
          autres écrans centrés). Grâce aux startTransition de useNavigation, à la
          navigation suivante c'est l'écran précédent qui reste visible à la place. */}
      <Suspense
        fallback={
          <div className="app">
            <div className="ecran-centre">
              <p className="vide">Chargement…</p>
            </div>
          </div>
        }
      >
        <Shell />
      </Suspense>
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
    redirigerVers(urlSansFlagAdmin());
  }

  const classeApp = prefs.animations === false ? 'app sans-animations' : 'app';

  // Écran de chargement tant que les questions (chunks lazy) ne sont pas prêtes.
  if (themes === null && (estAdmin || session)) {
    return (
      <div className={classeApp}>
        <div className="ecran-centre">
          <p className="vide">Chargement des questions…</p>
        </div>
      </div>
    );
  }


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
      <Ecrans
        nav={nav}
        themes={themes}
        session={session}
        prefs={prefs}
        estInvite={estInvite}
        tutoOuvert={tutoOuvert}
        fermerTuto={fermerTuto}
        deconnexion={deconnexion}
        demarrer={demarrer}
        terminer={terminer}
        changerPrefs={changerPrefs}
        setTutoOuvert={setTutoOuvert}
        toutesQuestions={toutesQuestions}
        ajouterQuestion={ajouterQuestion}
        celebration={celebration}
        fermerCelebration={fermerCelebration}
      />
    </div>
  );
}