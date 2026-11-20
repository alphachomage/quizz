// routes.js — table écran -> composant. Les écrans lourds (partie, stats, admin)
// passeront en React.lazy + Suspense en phase 4 ; ici, imports directs.
import Accueil from '../components/Accueil.jsx';
import AdminSignales from '../components/AdminSignales.jsx';
import Badges from '../components/Badges.jsx';
import Classement from '../components/Classement.jsx';
import Compte from '../components/Compte.jsx';
import FormulaireQuestion from '../components/FormulaireQuestion.jsx';
import Partie from '@features/partie/Partie.jsx';
import Resultat from '@features/resultat/Resultat.jsx';
import Stats from '../components/Stats.jsx';

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
