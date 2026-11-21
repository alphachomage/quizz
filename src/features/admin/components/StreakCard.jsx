// StreakCard.jsx — carte "Quizz du jour" du tableau de bord admin : série de jours
// consécutifs en valeur principale + nombre de parties jouées aujourd'hui.
import MetricCard from './MetricCard.jsx';

export default function StreakCard({ streak }) {
  return (
    <MetricCard
      icone="flame"
      titre="Quizz du jour"
      valeur={`×${streak.compte}`}
      sous={
        streak.compte > 0
          ? `série de ${streak.compte} jour${streak.compte > 1 ? 's' : ''} consécutifs`
          : 'aucune série en cours'
      }
    >
      <ul className="metric-liste">
        <li>
          <span className="metric-ligne-nom">Parties aujourd'hui</span>
          <span className="metric-ligne-val">{streak.partiesAujourdhui}</span>
        </li>
      </ul>
    </MetricCard>
  );
}
