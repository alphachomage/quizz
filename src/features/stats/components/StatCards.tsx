// CartesStats.tsx — les 4-5 grandes cartes de chiffres en haut de l'écran Stats.
import type { ReactElement } from 'react';
import type { Stats } from '../statsCompute.js';

interface StatCardsProps {
  stats: Stats;
  avgTime: number | null;
}

export default function StatCards({ stats, avgTime }: StatCardsProps): ReactElement {
  return (
    <section className="stats-cartes">
      <div className="stat-carte">
        <div className="stat-valeur">{stats.games}</div>
        <div className="stat-label">parties jouées</div>
      </div>
      <div className="stat-carte">
        <div className="stat-valeur">{stats.repondues}</div>
        <div className="stat-label">questions répondues</div>
      </div>
      <div className="stat-carte">
        <div className="stat-valeur">{stats.pct} %</div>
        <div className="stat-label">de réussite</div>
      </div>
      <div className="stat-carte">
        <div className="stat-valeur">{stats.points}</div>
        <div className="stat-label">points cumulés</div>
      </div>
      {avgTime !== null && (
        <div className="stat-carte">
          <div className="stat-valeur">{avgTime} s</div>
          <div className="stat-label">temps de réaction moyen</div>
        </div>
      )}
    </section>
  );
}
