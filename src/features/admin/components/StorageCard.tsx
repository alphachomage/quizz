// StorageCard.tsx — carte "Stockage" du tableau de bord admin : mode current (local ou
// d1 via ?stockage=d1), nombre de clés présentes dans le stockage, comptes locaux.
import type { ReactElement } from 'react';
import type { StockageMetrics } from '../useAdminMetrics.js';
import MetricCard from './MetricCard.jsx';

interface StorageCardProps {
  stockage: StockageMetrics;
}

export default function StorageCard({ stockage }: StorageCardProps): ReactElement {
  return (
    <MetricCard
      icone="device"
      title="Stockage"
      value={stockage.mode === 'd1' ? 'D1 (serveur)' : 'Local'}
      sous={`${stockage.presentes}/${stockage.total} clés présentes · ${stockage.comptes} compte${stockage.comptes > 1 ? 's' : ''}`}
    />
  );
}
