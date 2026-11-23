// BanniereBadge.tsx — « prochain badge » centré (effet « reviens-y ») : petit blason,
// nom du badge et barre de progression. Un clic ouvre le
// détail (BadgeDetailModal). Masqué en mode invité.
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import type { HomeState } from '../useHome.js';
import Crest from './Crest.jsx';

interface BadgeBannerProps {
  a: HomeState;
  isGuest: boolean;
}

export default function BadgeBanner({ a, isGuest }: BadgeBannerProps): ReactElement | null {
  if (isGuest || !a.nextBadge) return null;
  const b = a.nextBadge;
  return (
    <button
      className="prochain-badge"
      onClick={() => a.setBadgeDetail(true)}
      aria-label={`Prochain badge : ${b.nom}, ${b.current} sur ${b.target}. Voir le détail`}
    >
      <Crest taille={40}>
        <Icon nom={b.icone} taille={17} />
      </Crest>
      <span className="pb-surtitre">Prochain badge</span>
      <span className="pb-nom">{b.nom}</span>
      <span className="pb-progression">
        <span className="pb-barre">
          <i
            style={{
              width: `${Math.round(b.pct * 100)}%`,
            }}
          />
        </span>
        <span className="pb-compte">
          {b.current}/{b.target}
        </span>
      </span>
    </button>
  );
}
