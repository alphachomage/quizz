// routes.js — table écran -> composant. Les écrans lourds (partie, stats, admin)
// passeront en React.lazy + Suspense en phase 4 ; ici, imports directs.
import Accueil from '@features/accueil/Accueil.jsx';
import AdminSignales from '@features/admin/AdminSignales.jsx';
import Badges from '@features/badges/Badges.jsx';
import Classement from '@features/classement/Classement.jsx';
import Compte from '@features/compte/Compte.jsx';
import FormulaireQuestion from '@features/formulaire/FormulaireQuestion.jsx';
import Partie from '@features/partie/Partie.jsx';
import Resultat from '@features/resultat/Resultat.jsx';
import Stats from '@features/stats/Stats.jsx';

export const ROUTES = {
  accueil: Accueil,
  admin: AdminSignales,
  badges: Badges,
  classement: Classement,
  compte: Compte,
  formulaire: FormulaireQuestion,
  partie: Partie,
  resultat: Resultat,
  stats: Stats,
};
