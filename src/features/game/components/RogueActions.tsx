// RogueActions.tsx — boutons d'action des reliques consommables (mode rogue, phase 'question') :
// Skip (passer la question), Re-piocher (Mulligan), Révéler (Regard perçant).
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import type { GameState } from '../useGame.js';

interface RogueActionsProps {
  p: GameState;
}

export default function RogueActions({ p }: RogueActionsProps): ReactElement | null {
  const { mode, phase, charges, bonneRevelee } = p;
  if (mode !== 'rogue' || phase !== 'question') return null;
  const nSkip = charges.skip;
  const nRepioche = charges.repioche;
  const nVoir = charges.voir;
  if (nSkip <= 0 && nRepioche <= 0 && nVoir <= 0) return null;
  return (
    <div className="rogue-actions">
      {nSkip > 0 && (
        <button
          type="button"
          className="rogue-action"
          onClick={p.passerQuestion}
          title="Passer cette question sans pénalité (10 pts) — relique Skip"
        >
          <Icon nom="forward" taille={15} /> Passer ×{nSkip}
        </button>
      )}
      {nRepioche > 0 && (
        <button
          type="button"
          className="rogue-action"
          onClick={p.repiocherQuestion}
          title="Re-piocher une autre question du même niveau — relique Mulligan"
        >
          <Icon nom="replay" taille={15} /> Re-piocher ×{nRepioche}
        </button>
      )}
      {nVoir > 0 && !bonneRevelee && (
        <button
          type="button"
          className="rogue-action"
          onClick={p.revelerBonne}
          title="Révéler la bonne réponse (vaut 10 pts) — relique Regard perçant"
        >
          <Icon nom="eye" taille={15} /> Révéler ×{nVoir}
        </button>
      )}
    </div>
  );
}
