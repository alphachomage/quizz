// RecordsCard.jsx — carte "Records" du tableau de bord admin : record global en valeur
// principale + top 5 des records locaux (clé mode:niveau:themeId -> points).
import { recordLabel } from '../dashboardCompute.js';

import MetricCard from './MetricCard.jsx';

export default function RecordsCard({ top }) {
  const meilleur = top[0] || null;
  return (
    <MetricCard
      icone="trophy"
      titre="Records"
      valeur={meilleur ? `${meilleur.valeur} pts` : '—'}
      sous={meilleur ? `record : ${recordLabel(meilleur)}` : 'aucune partie jouée'}
    >
      {top.length > 0 && (
        <ul className="metric-liste">
          {top.map((r) => (
            <li key={r.key}>
              <span className="metric-ligne-nom">{recordLabel(r)}</span>
              <span className="metric-ligne-val">{r.valeur} pts</span>
            </li>
          ))}
        </ul>
      )}
    </MetricCard>
  );
}
