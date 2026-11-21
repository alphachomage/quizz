// RecordsCard.tsx — carte "Records" du tableau de bord admin : record global en valeur
// principale + top 5 des records locaux (clé mode:niveau:themeId -> points).
import type { ReactElement } from 'react';
import { recordLabel } from '../dashboardCompute.js';
import type { RecordEntry } from '../dashboardCompute.js';
import MetricCard from './MetricCard.jsx';

interface RecordsCardProps {
  top: RecordEntry[];
}

export default function RecordsCard({ top }: RecordsCardProps): ReactElement {
  const best = top[0] || null;
  return (
    <MetricCard
      icone="trophy"
      title="Records"
      value={best ? `${best.value} pts` : '—'}
      sous={best ? `record : ${recordLabel(best)}` : 'aucune partie jouée'}
    >
      {top.length > 0 && (
        <ul className="metric-liste">
          {top.map((r) => (
            <li key={r.key}>
              <span className="metric-ligne-nom">{recordLabel(r)}</span>
              <span className="metric-ligne-val">{r.value} pts</span>
            </li>
          ))}
        </ul>
      )}
    </MetricCard>
  );
}
