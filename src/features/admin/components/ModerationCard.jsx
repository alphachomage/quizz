// ModerationCard.jsx — carte "Modération" du tableau de bord admin : signalements en
// attente de vérification en valeur principale, puis soumissions / validées /
// suggestions / exclusions en dessous (données : computeModeration).
import MetricCard from './MetricCard.jsx';

export default function ModerationCard({ moderation }) {
  const lignes = [
    { nom: 'Soumissions en attente', val: moderation.soumissions },
    { nom: 'Questions validées', val: moderation.validees },
    { nom: 'Suggestions joueurs', val: moderation.suggestions },
    { nom: 'Questions exclues du pool', val: moderation.exclusions },
  ];
  return (
    <MetricCard
      icone="alert"
      titre="Modération"
      valeur={`${moderation.signalementsEnAttente} en attente`}
      sous={`${moderation.signalementsTotal} signalement${moderation.signalementsTotal > 1 ? 's' : ''} au total`}
    >
      <ul className="metric-liste">
        {lignes.map((l) => (
          <li key={l.nom}>
            <span className="metric-ligne-nom">{l.nom}</span>
            <span className="metric-ligne-val">{l.val}</span>
          </li>
        ))}
      </ul>
    </MetricCard>
  );
}
