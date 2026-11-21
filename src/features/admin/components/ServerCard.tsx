// ServerCard.tsx — carte "Serveur (API)" du tableau de bord admin : interroge
// /api/health (route de santé) et /api/stats (rooms KV, rapports CSP, hits 429) via
// le hook useServerStats. API injoignable -> affichage dégradé, jamais d'erreur.
import type { ReactElement, ReactNode } from 'react';
import type { ServerEtat } from '../useServerStats.js';
import MetricCard from './MetricCard.jsx';

function row(nom: string, val: ReactNode): ReactElement {
  return (
    <li key={nom}>
      <span className="metric-ligne-nom">{nom}</span>
      <span className="metric-ligne-val">{val}</span>
    </li>
  );
}

interface ServerCardProps {
  etat: ServerEtat;
}

export default function ServerCard({ etat }: ServerCardProps): ReactElement {
  if (etat.statut === 'chargement') {
    return (
      <MetricCard
        icone="globe"
        title="Serveur (API)"
        value="…"
        sous="interrogation de /api/health"
      />
    );
  }
  if (etat.statut === 'indisponible') {
    return (
      <MetricCard
        icone="globe"
        title="Serveur (API)"
        value="API injoignable"
        sous="hors ligne ou sans worker"
      />
    );
  }
  // statut === 'ok' : le health est renseigné, les stats peuvent manquer (réseau).
  const { health, stats } = etat;
  const hour = health.hour ? new Date(health.hour).toLocaleString('fr-FR') : null;
  const sous = `VoltQuiz ${health.version || '?'}${hour ? ` · ${hour}` : ''}`;
  return (
    <MetricCard icone="globe" title="Serveur (API)" value="API active" sous={sous}>
      {stats ? (
        <ul className="metric-liste">
          {row('Rooms de duel ouvertes (KV)', stats.rooms)}
          {row('Rapports CSP reçus', stats.rapportsCsp)}
          {row('Hits rate-limit (429)', stats.hits429)}
        </ul>
      ) : (
        <p className="metric-note">/api/stats indisponible pour le moment.</p>
      )}
      <p className="metric-lien">
        <a href="/api/health" target="_blank" rel="noreferrer">
          ouvrir /api/health
        </a>
      </p>
    </MetricCard>
  );
}
