// ModaleNiveau.tsx — modale de choix de la difficulté (solo), ouverte au clic sur un
// thème. Utilise la modale accessible partagée (Échap, focus, aria).
import type { CSSProperties, ReactElement } from 'react';
import Icon, { Bars } from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';
import { LEVELS, levelName } from '@lib/scoring.js';
import type { HomeState } from '../useHome.js';

interface LevelModalProps {
  a: HomeState;
}

export default function LevelModal({ a }: LevelModalProps): ReactElement | null {
  const theme = a.theme;
  if (!theme) return null;
  return (
    <Modal title={theme.nom} onClose={() => a.setLevelModal(false)}>
      <div className="modal-titre">
        <h2>
          <span
            className="theme-icone"
            style={
              {
                '--couleur': theme.couleur,
                width: 34,
                height: 34,
                borderRadius: 10,
              } as CSSProperties
            }
          >
            <Icon nom={theme.icone} taille={18} />
          </span>
          {theme.nom}
        </h2>
        <button className="btn-suppr" onClick={() => a.setLevelModal(false)} title="Fermer">
          <Icon nom="x" taille={18} />
        </button>
      </div>
      <p className="vide">Choisis la difficulté :</p>
      <div className="niveaux-modal">
        {LEVELS.map((n, i) => (
          <button
            key={n.id}
            className={a.niveau === n.id ? 'niveau-modal actif' : 'niveau-modal'}
            style={
              {
                '--couleur': n.couleur,
              } as CSSProperties
            }
            onClick={() => a.setLevel(n.id)}
          >
            <Bars actives={i + 1} couleur={n.couleur} taille={18} />
            <span>{n.nom}</span>
          </button>
        ))}
      </div>
      <button
        className="btn-principal"
        onClick={() => {
          a.setLevelModal(false);
          a.lancer();
        }}
      >
        C'est parti — niveau {levelName(a.niveau)} !
      </button>
    </Modal>
  );
}
