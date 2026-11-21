// routes.ts — table écran -> composant. Chaque écran est chargé À LA DEMANDE
// (React.lazy) : le bundle initial ne contient plus que le shell, l'écran courant
// part dans son propre chunk (voir le build : index ne fait plus que ~300 Ko).
import { lazy } from 'react';

export const ROUTES = {
  home: lazy(() => import('@features/home/Home.jsx')),
  admin: lazy(() => import('@features/admin/AdminReports.jsx')),
  badges: lazy(() => import('@features/badges/Badges.jsx')),
  leaderboard: lazy(() => import('@features/leaderboard/Leaderboard.jsx')),
  account: lazy(() => import('@features/account/Account.jsx')),
  form: lazy(() => import('@features/question-form/QuestionForm.jsx')),
  game: lazy(() => import('@features/game/Game.jsx')),
  result: lazy(() => import('@features/results/Results.jsx')),
  stats: lazy(() => import('@features/stats/Stats.jsx')),
};
