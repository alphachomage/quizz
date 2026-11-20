// routes.js — table écran -> composant. Chaque écran est chargé À LA DEMANDE
// (React.lazy) : le bundle initial ne contient plus que le shell, l'écran courant
// part dans son propre chunk (voir le build : index ne fait plus que ~300 Ko).
import { lazy } from 'react';

export const ROUTES = {
  accueil: lazy(() => import('@features/accueil/Accueil.jsx')),
  admin: lazy(() => import('@features/admin/AdminSignales.jsx')),
  badges: lazy(() => import('@features/badges/Badges.jsx')),
  classement: lazy(() => import('@features/classement/Classement.jsx')),
  compte: lazy(() => import('@features/compte/Compte.jsx')),
  formulaire: lazy(() => import('@features/formulaire/FormulaireQuestion.jsx')),
  partie: lazy(() => import('@features/partie/Partie.jsx')),
  resultat: lazy(() => import('@features/resultat/Resultat.jsx')),
  stats: lazy(() => import('@features/stats/Stats.jsx')),
};
