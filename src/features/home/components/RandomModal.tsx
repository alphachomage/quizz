// RandomModal.tsx — mini popin « Aléatoire » : une roulette tire un thème au hasard,
// puis gros bouton « C'est parti » (partie solo au niveau choisi) et lien « Relancer ».
import type { CSSProperties, ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';
import { levelName } from '@lib/scoring.js';
import type { HomeState } from '../useHome.js';
import { ROULETTE_LAPS, ROULETTE_MS, useRoulette } from '../useRoulette.js';

/** Largeur d'une case de la bande (icône + espace), en px : doit suivre roulette.css. */
const CASE_PX = 76;

interface RandomModalProps {
  a: HomeState;
  animated: boolean;
  onClose: () => void;
}

export default function RandomModal({ a, animated, onClose }: RandomModalProps): ReactElement {
  const themes = a.displayedThemes;
  const r = useRoulette(themes.length, animated);
  const chosen = r.result === null ? null : themes[r.result];
  const cases = Array.from({ length: ROULETTE_LAPS }, () => themes).flat();
  return (
    <Modal title="Thème aléatoire" onClose={onClose} classe="modal-roulette">
      <div className="modal-titre">
        <h2>
          <Icon nom="dice" taille={20} /> Thème aléatoire
        </h2>
        <button className="btn-suppr" onClick={onClose} title="Fermer">
          <Icon nom="x" taille={18} />
        </button>
      </div>

      <div className="roulette-fenetre" aria-hidden="true">
        <div
          className={r.spinning ? 'roulette-bande tourne' : 'roulette-bande'}
          style={
            {
              // La bande part du milieu de la fenêtre : la case `pos` tombe sous le repère
              transform: `translateX(${-(r.pos + 0.5) * CASE_PX}px)`,
              '--roulette-ms': `${ROULETTE_MS}ms`,
            } as CSSProperties
          }
        >
          {cases.map((t, i) => (
            <span
              key={i}
              className={
                r.result !== null && i === r.pos ? 'roulette-case gagnante' : 'roulette-case'
              }
            >
              <span
                className="theme-icone"
                style={
                  {
                    '--couleur': t.couleur,
                  } as CSSProperties
                }
              >
                <Icon nom={t.icone} taille={26} />
              </span>
            </span>
          ))}
        </div>
        <span className="roulette-repere" />
      </div>

      <p className="roulette-resultat" aria-live="polite">
        {chosen ? (
          <>
            <strong
              style={
                {
                  '--couleur': chosen.couleur,
                } as CSSProperties
              }
            >
              {chosen.nom}
            </strong>
            <small>Niveau {levelName(a.niveau)}</small>
          </>
        ) : (
          <span className="roulette-attente">La roulette tourne…</span>
        )}
      </p>

      <button
        className="btn-principal"
        disabled={!chosen}
        onClick={() => {
          if (!chosen) return;
          onClose();
          a.lancerTheme(chosen);
        }}
      >
        C'est parti !
      </button>
      <button className="roulette-relancer" disabled={r.spinning} onClick={r.spin}>
        Relancer
      </button>
    </Modal>
  );
}
