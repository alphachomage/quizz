// app/App.tsx — shell de l'application (~100 L) : providers + flags URL + routes.
// Toute la logique d'état vit dans les hooks (useNavigation, useUnlock) et
// les contexts (session, prefs, thèmes). Les composants d'écran sont dans routes.ts.
import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import AppProviders from './AppProviders.jsx';
import Screens from './Screens.jsx';
import { ROUTES } from './routes.js';
import { useNavigation } from './useNavigation.js';
import type { NavConfig } from './useNavigation.js';
import { useUnlock } from './useUnlock.js';
import { readUrlFlags, clearUrlFlags, urlWithoutAdminFlag, redirigerVers } from './urlFlags.js';
import { useAdminAccess } from './useAdminAccess.js';
import { useSession } from './contexts/SessionContext.js';
import { usePrefs } from './contexts/PrefsContext.js';
import { useThemes } from './contexts/ThemesContext.js';
import Tutorial from '@features/tutorial/Tutorial.jsx';
// Deblocage rendu dans app/Screens.tsx

import { hasSeenTutorial, markTutorialSeen, currentSession } from '@lib/accounts.js';
import { resetScores, resetProgress } from '@lib/reset.js';
import { persistResult } from '@features/results/persist.js';
import { downloadJson } from '@shared/utils/downloadJson.js';
import type { GameResult } from '@lib/types.js';

export default function App(): ReactElement {
  return (
    <AppProviders>
      {/* Les écrans de routes.ts sont en React.lazy : pendant le chargement d'un
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

function Shell(): ReactElement {
  const { session, setSession, deconnexion, isGuest } = useSession();
  const { prefs, changerPrefs } = usePrefs();
  const {
    themes,
    allQuestions,
    submissions,
    approvedCount,
    addQuestion,
    removeQuestion,
    approveQuestion,
    exporterValidees,
  } = useThemes();
  const nav = useNavigation();
  const { celebration, prendreSnapshot, revelerNouveautes, closeCelebration } = useUnlock({
    isGuest,
    prefs,
  });

  // Flags d'URL (lus UNE fois) : ?admin=1 ?reset=1 ?resetcompte=1 ?tuto=1
  const flags = useMemo(() => readUrlFlags(), []);
  // ?admin=1 ne suffit plus : le pseudo de la session doit être dans ADMIN_PSEUDOS
  // (vérifié côté serveur via /api/admin/check) — voir useAdminAccess.ts.
  const { isAdmin, enCours: adminEnCours } = useAdminAccess(flags.admin, session);
  const [tutoOuvert, setTutoOuvert] = useState(false);

  // Reset manuel sur la version d'essai (?reset=1 / ?resetcompte=1), une fois, puis
  // on nettoie l'URL — aucun bouton dans l'appli.
  useEffect(() => {
    if (flags.reset) {
      resetScores();
      clearUrlFlags(['reset']);
    }
    if (flags.resetcompte) {
      resetProgress();
      clearUrlFlags(['resetcompte']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tuto de bienvenue : ouvert UNE SEULE FOIS par compte (clé fixe « invite » en mode invité),
  // rouvrable à volonté avec ?tuto=1 ou le bouton « ? ».
  const tutorialKey = session ? (session.guest ? 'invite' : session.pseudo) : null;
  useEffect(() => {
    if (!isAdmin && (flags.tutorial || (tutorialKey && !hasSeenTutorial(tutorialKey))))
      setTutoOuvert(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isAdmin]);
  function closeTutorial(): void {
    if (tutorialKey) markTutorialSeen(tutorialKey);
    setTutoOuvert(false);
  }
  function start(cfg: NavConfig): void {
    prendreSnapshot(); // badges/titres débloqués AVANT la partie
    nav.start(cfg);
  }
  function finish(res: GameResult): void {
    // Persistance de la partie UNE FOIS ici (record, historique, XP, classement,
    // streak du jour) : le composant Resultat ne fait plus que lire res.persistance.
    const persistance = persistResult(res, isGuest, prefs);
    revelerNouveautes(); // badges/titres débloqués PENDANT la partie -> animation au retour
    nav.finish({
      ...res,
      persistance,
    });
  }
  function quitterAdmin(): void {
    // Recharge la page sans ?admin=1 : les exclusions admin sont alors retirées du pool.
    redirigerVers(urlWithoutAdminFlag());
  }
  const appClass = prefs.animations === false ? 'app sans-animations' : 'app';

  // Écran de chargement tant que les questions (chunks lazy) ne sont pas prêtes.
  if (themes === null && (isAdmin || session)) {
    return (
      <div className={appClass}>
        <div className="ecran-centre">
          <p className="vide">Chargement des questions…</p>
        </div>
      </div>
    );
  }

  // Vérification d'accès admin en cours (?admin=1 + appel /api/admin/check).
  if (adminEnCours) {
    return (
      <div className={appClass}>
        <div className="ecran-centre">
          <p className="vide">Vérification de l'accès admin…</p>
        </div>
      </div>
    );
  }

  // Vue admin (?admin=1 + pseudo autorisé côté serveur) : prioritaire sur le reste.
  if (isAdmin) {
    const Admin = ROUTES.admin;
    return (
      <div className={appClass}>
        <Admin
          onQuit={quitterAdmin}
          themes={themes}
          submissions={submissions}
          approvedCount={approvedCount}
          onApproveSubmission={approveQuestion}
          onDeleteSubmission={removeQuestion}
          onExportApproved={() => downloadJson(exporterValidees())}
        />
      </div>
    );
  }

  // Sans compte connecté, on affiche d'abord l'écran de connexion/création de compte.
  if (!session) {
    const Account = ROUTES.account;
    return (
      <div className={appClass}>
        {tutoOuvert && <Tutorial onClose={closeTutorial} isGuest={false} />}
        <Account onConnexion={() => setSession(currentSession())} />
      </div>
    );
  }
  return (
    <div className={appClass}>
      <Screens
        nav={nav}
        themes={themes}
        session={session}
        prefs={prefs}
        isGuest={isGuest}
        tutoOuvert={tutoOuvert}
        closeTutorial={closeTutorial}
        deconnexion={deconnexion}
        start={start}
        finish={finish}
        changerPrefs={changerPrefs}
        setTutoOuvert={setTutoOuvert}
        allQuestions={allQuestions}
        addQuestion={addQuestion}
        celebration={celebration}
        closeCelebration={closeCelebration}
      />
    </div>
  );
}
