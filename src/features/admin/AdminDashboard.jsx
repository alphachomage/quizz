// AdminDashboard.jsx — tableau de bord GLOBAL de la vue admin (?admin=1), affiché en
// haut de AdminReports, au-dessus des sections de modération. Coquille de rendu :
// les métriques viennent de useAdminMetrics (lib/ uniquement, R5) + useServerStats
// (/api/* via lib/api.js), et chaque carte a UNE responsabilité dans ./components/.
import { useAdminMetrics } from './useAdminMetrics.js';
import { useServerStats } from './useServerStats.js';
import CorpusCard from './components/CorpusCard.jsx';
import GamesCard from './components/GamesCard.jsx';
import RecordsCard from './components/RecordsCard.jsx';
import ModerationCard from './components/ModerationCard.jsx';
import StreakCard from './components/StreakCard.jsx';
import StorageCard from './components/StorageCard.jsx';
import ServerCard from './components/ServerCard.jsx';
import ActionsCard from './components/ActionsCard.jsx';
export default function AdminDashboard({ themes }) {
  const metrics = useAdminMetrics(themes);
  const server = useServerStats();
  return (
    <section className="dashboard-admin" aria-label="Tableau de bord">
      <h2 className="titre-section">Tableau de bord</h2>
      <div className="stats-cartes dashboard-grille">
        <CorpusCard corpus={metrics.corpus} />
        <GamesCard metriques={metrics.games} />
        <RecordsCard top={metrics.recordsTop} />
        <ModerationCard moderation={metrics.moderation} />
        <StreakCard streak={metrics.streak} />
        <StorageCard stockage={metrics.stockage} />
        <ServerCard etat={server} />
        <ActionsCard mode={metrics.stockage.mode} />
      </div>
    </section>
  );
}
