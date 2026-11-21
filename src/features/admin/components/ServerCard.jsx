// ServerCard.jsx — carte "Serveur (V2)" du tableau de bord admin : interroge
// /api/health (ouvert) et /api/stats (rooms KV, rapports CSP, hits 429) via le hook
// useServerStats. V2 off ou API injoignable -> affichage dégradé, jamais d'erreur.
import MetricCard from './MetricCard.jsx';
function row(nom, val) {
  return (
    <li key={nom}>
      <span className="metric-ligne-nom">{nom}</span>
      <span className="metric-ligne-val">{val}</span>
    </li>
  );
}
export default function ServerCard({ etat }) {
  if (etat.statut === 'chargement') {
    return (
      <MetricCard
        icone="globe"
        title="Serveur (V2)"
        value="…"
        sous="interrogation de /api/health"
      />
    );
  }
  if (etat.statut === 'indisponible') {
    return (
      <MetricCard
        icone="globe"
        title="Serveur (V2)"
        value="API injoignable"
        sous="hors ligne ou sans worker"
      />
    );
  }
  const { health, stats } = etat;
  const hour = health.hour ? new Date(health.hour).toLocaleString('fr-FR') : null;
  const sous = `VoltQuiz ${health.version || '?'}${hour ? ` · ${hour}` : ''}`;
  if (etat.statut === 'v2-inactive') {
    return (
      <MetricCard icone="globe" title="Serveur (V2)" value="V2 inactive" sous={sous}>
        <p className="metric-note">
          Routes D1/KV/DO désactivées (V2_ENABLED != "true") : /api/stats renvoie 503.
        </p>
        <p className="metric-lien">
          <a href="/api/health" target="_blank" rel="noreferrer">
            ouvrir /api/health
          </a>
        </p>
      </MetricCard>
    );
  }
  return (
    <MetricCard icone="globe" title="Serveur (V2)" value="V2 active" sous={sous}>
      <ul className="metric-liste">
        {row('Rooms de duel ouvertes (KV)', stats.rooms)}
        {row('Rapports CSP reçus', stats.rapportsCsp)}
        {row('Hits rate-limit (429)', stats.hits429)}
      </ul>
      <p className="metric-lien">
        <a href="/api/health" target="_blank" rel="noreferrer">
          ouvrir /api/health
        </a>
      </p>
    </MetricCard>
  );
}
