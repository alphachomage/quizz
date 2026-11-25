// RogueActions.tsx — boutons d'action des reliques actives (mode rogue) :
// Arrêt sur image (geler le chrono), Pari (miser), Pioche (passer le thème),
// Retour en arrière (annuler la dernière réponse, phase 'reponse').
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import type { GameState } from '../useGame.js';

interface RogueActionsProps {
  p: GameState;
}

export default function RogueActions({ p }: RogueActionsProps): ReactElement | null {
  const { mode, phase, palier, geleRestant, pariPlacee, rogueBonus } = p;
  if (mode !== 'rogue') return null;
  const peutGeler = phase === 'question' && palier.gele && geleRestant <= 0;
  const peutMiser = phase === 'question' && rogueBonus.pari;
  const peutPasser = phase === 'question' && palier.pioche > 0;
  const peutAnnuler = phase === 'reponse' && palier.retourArriere;
  if (!peutGeler && !peutMiser && !peutPasser && !peutAnnuler) return null;
  return (
    <div className="rogue-actions">
      {peutGeler && (
        <button
          type="button"
          className="rogue-action"
          onClick={p.gelerChrono}
          title="Gèle le chrono 5 s, 1 fois par palier — relique Arrêt sur image"
        >
          <Icon nom="pause" taille={15} /> Geler 5 s
        </button>
      )}
      {peutMiser && (
        <button
          type="button"
          className={pariPlacee ? 'rogue-action pari-actif' : 'rogue-action'}
          onClick={p.miser}
          title="Miser : ×2 pts si juste, sinon 0 pt et −1 vie de plus — relique Pari"
        >
          <Icon nom="chip" taille={15} /> {pariPlacee ? 'Pari placé ×2' : 'Miser ×2'}
        </button>
      )}
      {peutPasser && (
        <button
          type="button"
          className="rogue-action"
          onClick={p.passerTheme}
          title="Passer cette question (remplacée par une plus difficile) — relique Pioche"
        >
          <Icon nom="map" taille={15} /> Passer le thème ×{palier.pioche}
        </button>
      )}
      {peutAnnuler && (
        <button
          type="button"
          className="rogue-action"
          onClick={p.annulerReponse}
          title="Annule ta dernière réponse (1 fois par palier, −1 s toute la partie) — relique Retour en arrière"
        >
          <Icon nom="chevron-left" taille={15} /> Annuler la réponse
        </button>
      )}
    </div>
  );
}
