// StreakCard.tsx — carte "Quizz du jour" du tableau de bord admin : série de jours
// consécutifs en valeur principale + nombre de parties jouées aujourd'hui.
import type { ReactElement } from 'react';
import type { StreakMetrics } from '../dashboardCompute.js';
import MetricCard from './MetricCard.jsx';

interface StreakCardProps {
  streak: StreakMetrics;
}

export default function StreakCard({ streak }: StreakCardProps): ReactElement {
  return (
    <MetricCard
      icone="flame"
      title="Quizz du jour"
      value={`×${streak.compte}`}
      sous={
        streak.compte > 0
          ? `série de ${streak.compte} jour${streak.compte > 1 ? 's' : ''} consécutifs`
          : 'aucune série en cours'
      }
    >
      <ul className="metric-liste">
        <li>
          <span className="metric-ligne-nom">Parties aujourd'hui</span>
          <span className="metric-ligne-val">{streak.gamesToday}</span>
        </li>
      </ul>
    </MetricCard>
  );
}
