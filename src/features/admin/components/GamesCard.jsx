// GamesCard.jsx — carte "Parties" du tableau de bord admin : total des parties jouées,
// % de réussite global, et détail par mode (données : computeGamesMetrics).
import Icon from '@shared/ui/Icon.jsx';

import { modeIcone, modeLabel } from '../dashboardCompute.js';

import MetricCard from './MetricCard.jsx';

export default function GamesCard({ metriques }) {
  return (
    <MetricCard
      icone="chart"
      titre="Parties jouées"
      valeur={metriques.total}
      sous={`${metriques.pct} % de réussite · ${metriques.repondues} répondues`}
    >
      {metriques.parMode.length > 0 && (
        <ul className="metric-liste">
          {metriques.parMode.map((m) => (
            <li key={m.mode}>
              <span className="metric-ligne-nom">
                <Icon nom={modeIcone(m.mode)} taille={13} /> {modeLabel(m.mode)}
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
