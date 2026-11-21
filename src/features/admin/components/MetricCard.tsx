// MetricCard.tsx — carte métrique générique du tableau de bord admin (?admin=1) :
// icône + titre en haut, grosse valeur, sous-ligne facultative, contenu libre dessous.
import type { ReactElement, ReactNode } from 'react';
import Icon from '@shared/ui/Icon.jsx';

interface MetricCardProps {
  icone: string;
  title: string;
  value: ReactNode;
  sous?: string;
  children?: ReactNode;
}

export default function MetricCard({
  icone,
  title,
  value,
  sous,
  children,
}: MetricCardProps): ReactElement {
  return (
    <div className="stat-carte metric-carte">
      <div className="metric-titre">
        <Icon nom={icone} taille={15} /> <span>{title}</span>
      </div>
      <div className="stat-valeur">{value}</div>
      {sous ? <div className="stat-label">{sous}</div> : null}
      {children}
    </div>
  );
}
