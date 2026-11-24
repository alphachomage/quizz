// ThemePickerModal.tsx — popin du mode Solo : le joueur choisit son thème dans le carrousel
// (la carte au centre est sélectionnée) OU tire un thème au hasard (le carrousel tourne
// façon roulette), choisit la difficulté, puis « C'est parti ! ». Zéro scroll sur l'accueil.
import type { CSSProperties, ReactElement } from 'react';
import Icon, { Bars } from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';
import { LEVELS } from '@lib/scoring.js';
import type { HomeState } from '../useHome.js';
import { useCarousel } from '../useCarousel.js';
import ThemeCarousel from './ThemeCarousel.jsx';

/** Durée du tirage aléatoire (roulette), en millisecondes. */
const SPIN_MS = 2600;

interface ThemePickerModalProps {
  a: HomeState;
  isAdmin: boolean;
  isGuest: boolean;
  /** false : réglage Animations coupé ou « mouvement réduit » demandé par le système. */
  animated: boolean;
}

export default function ThemePickerModal({
  a,
  isAdmin,
  isGuest,
  animated,
}: ThemePickerModalProps): ReactElement {
  const themes = a.displayedThemes;
  const c = useCarousel(themes.length);
  const theme = themes[c.active];
  const close = (): void => a.setPicker(null);

  function random(): void {
    if (themes.length < 2) return;
    // Jamais deux fois de suite le même thème
    const pick = (c.active + 1 + Math.floor(Math.random() * (themes.length - 1))) % themes.length;
    c.spinTo(pick, animated ? SPIN_MS : 0);
  }

  return (
    <Modal title="Solo : choisis ton thème" onClose={close} classe="modal-picker">
      <div className="modal-titre">
        <h2>
          <Icon nom="timer" taille={20} /> Solo
        </h2>
        <button className="btn-suppr" onClick={close} title="Fermer">
          <Icon nom="x" taille={18} />
        </button>
      </div>
      <p className="picker-sous-titre">10 questions contre la montre dans le thème choisi.</p>

      <ThemeCarousel
        themes={themes}
        c={c}
        mode="solo"
        niveau={a.niveau}
        records={a.records}
        xp={a.xp}
        isAdmin={isAdmin}
        isGuest={isGuest}
      />

      <button className="btn-aleatoire" onClick={random} disabled={c.spinning}>
        <Icon nom="dice" taille={16} /> {c.spinning ? 'Ça tourne…' : 'Thème aléatoire'}
      </button>

      <div className="picker-niveaux" role="group" aria-label="Difficulté">
        {LEVELS.map((n, i) => (
          <button
            key={n.id}
            className={a.niveau === n.id ? 'niveau-modal actif' : 'niveau-modal'}
            style={
              {
                '--couleur': n.couleur,
              } as CSSProperties
            }
            aria-pressed={a.niveau === n.id}
            onClick={() => a.setLevel(n.id)}
          >
            <Bars actives={i + 1} couleur={n.couleur} taille={16} />
            <span>{n.nom}</span>
          </button>
        ))}
      </div>

      <button
        className="btn-principal"
        disabled={c.spinning || !theme}
        onClick={() => {
          if (!theme) return;
          close();
          a.lancerTheme(theme);
        }}
      >
        {c.spinning || !theme ? 'La roulette tourne…' : "C'est parti !"}
      </button>
    </Modal>
  );
}
