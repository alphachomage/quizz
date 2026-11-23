// BadgeDetailModal.tsx — détail du prochain badge (ouvert depuis l'écusson de l'accueil) :
// grand blason, description, progression chiffrée et accès à tous les badges.
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';
import type { HomeState } from '../useHome.js';
import Crest from './Crest.jsx';

interface BadgeDetailModalProps {
  a: HomeState;
  onBadges: () => void;
}

export default function BadgeDetailModal({
  a,
  onBadges,
}: BadgeDetailModalProps): ReactElement | null {
  const b = a.nextBadge;
  if (!b) return null;
  const close = (): void => a.setBadgeDetail(false);
  const reste = Math.max(0, b.target - b.current);
  return (
    <Modal title={b.nom} onClose={close} classe="modal-badge">
      <button className="btn-suppr modal-badge-fermer" onClick={close} title="Fermer">
        <Icon nom="x" taille={18} />
      </button>
      <Crest taille={92}>
        <Icon nom={b.icone} taille={36} />
      </Crest>
      <span className="pb-surtitre">Prochain badge</span>
      <h2 className="modal-badge-nom">{b.nom}</h2>
      <p className="modal-badge-desc">{b.desc}</p>
      <div className="pb-progression grande">
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
      </div>
      <p className="modal-badge-reste">
        {reste > 0
          ? `Encore ${reste} pour le débloquer.`
          : 'Presque : termine une partie pour le débloquer.'}
      </p>
      <button
        className="btn-principal"
        onClick={() => {
          close();
          onBadges();
        }}
      >
        Voir tous mes badges
      </button>
    </Modal>
  );
}
