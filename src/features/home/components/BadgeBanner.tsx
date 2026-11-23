// BanniereBadge.tsx — « prochain badge » compact et centré (effet « reviens-y ») : petit
// blason à gauche, nom + progression à droite. Un clic ouvre le
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
      <Crest taille={36}>
        <Icon nom={b.icone} taille={15} />
      </Crest>
      <span className="pb-texte">
        <span className="pb-surtitre">Prochain badge</span>
        <span className="pb-ligne">
          <span className="pb-nom">{b.nom}</span>
          <span className="pb-compte">
            {b.current}/{b.target}
          </span>
        </span>
        <span className="pb-barre">
          <i
            style={{
              width: `${Math.round(b.pct * 100)}%`,
            }}
          />
        </span>
      </span>
    </button>
  );
}
