// StorageCard.jsx — carte "Stockage" du tableau de bord admin : mode actuel (local ou
// d1 via ?stockage=d1), nombre de clés présentes dans le stockage, comptes locaux.
import MetricCard from './MetricCard.jsx';

export default function StorageCard({ stockage }) {
  return (
    <MetricCard
      icone="device"
      titre="Stockage"
      valeur={stockage.mode === 'd1' ? 'D1 (serveur)' : 'Local'}
      sous={`${stockage.presentes}/${stockage.total} clés présentes · ${stockage.comptes} compte${stockage.comptes > 1 ? 's' : ''}`}
    />
  );
}
