// MetricCard.jsx — carte métrique générique du tableau de bord admin (?admin=1) :
// icône + titre en haut, grosse valeur, sous-ligne facultative, contenu libre dessous.
import Icon from '@shared/ui/Icon.jsx';

export default function MetricCard({ icone, titre, valeur, sous, children }) {
  return (
    <div className="stat-carte metric-carte">
      <div className="metric-titre">
        <Icon nom={icone} taille={15} /> <span>{titre}</span>
      </div>
      <div className="stat-valeur">{valeur}</div>
      {sous ? <div className="stat-label">{sous}</div> : null}
      {children}
    </div>
  );
}
