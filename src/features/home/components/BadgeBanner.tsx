// BanniereBadge.tsx — bannière « prochain badge » (effet « reviens-y »), avec barre
// de progression. Masquée en mode invité.
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import type { HomeState } from '../useHome.js';

interface BadgeBannerProps {
  a: HomeState;
  isGuest: boolean;
}

export default function BadgeBanner({ a, isGuest }: BadgeBannerProps): ReactElement | null {
  if (isGuest || !a.nextBadge) return null;
  const b = a.nextBadge;
  return (
    <div className="prochain-badge" title={`${b.desc} — débloque ce badge en continuant à jouer !`}>
      <span className="pb-icone">
        <Icon nom={b.icone} taille={14} />
      </span>
      <span className="pb-texte">
        <strong>Prochain badge :</strong> {b.nom} · {b.current}/{b.target}
      </span>
      <span className="pb-barre">
        <i
          style={{
            width: `${Math.round(b.pct * 100)}%`,
          }}
        />
      </span>
    </div>
  );
}
