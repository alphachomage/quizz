// GamesCard.tsx — carte "Parties" du tableau de bord admin : total des parties jouées,
// % de réussite global, et détail par mode (données : computeGamesMetrics).
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { modeIcon, modeLabel } from '../dashboardCompute.js';
import type { GamesMetrics } from '../dashboardCompute.js';
import MetricCard from './MetricCard.jsx';

interface GamesCardProps {
  metriques: GamesMetrics;
}

export default function GamesCard({ metriques }: GamesCardProps): ReactElement {
  return (
    <MetricCard
      icone="chart"
      title="Parties jouées"
      value={metriques.total}
      sous={`${metriques.pct} % de réussite · ${metriques.repondues} répondues`}
    >
      {metriques.perMode.length > 0 && (
        <ul className="metric-liste">
          {metriques.perMode.map((m) => (
            <li key={m.mode}>
              <span className="metric-ligne-nom">
                <Icon nom={modeIcon(m.mode)} taille={13} /> {modeLabel(m.mode)}
              </span>
              <span className="metric-ligne-val">
                {m.games} partie{m.games > 1 ? 's' : ''} · {m.pct} %
              </span>
            </li>
          ))}
        </ul>
      )}
    </MetricCard>
  );
}
