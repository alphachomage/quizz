// Confettis.tsx — pluie de confettis CSS sur une bonne réponse (si animations ON).
import type { CSSProperties } from 'react';
import type { ConfettiPiece } from '../useGame.js';

/** Props : la liste des morceaux de confetti en cours (vide = rien à afficher). */
interface ConfettiProps {
  confetti: ConfettiPiece[];
}

export default function Confetti({ confetti }: ConfettiProps) {
  if (!confetti.length) return null;
  return (
    <div className="confettis" aria-hidden="true">
      {confetti.map((c) => {
        // '--rot' est une propriété CSS custom : csstype ne la connaît pas, d'où le cast.
        const style = {
          left: `${c.left}%`,
          width: `${c.taille}px`,
          height: `${c.taille * 0.6}px`,
          background: c.couleur,
          animationDelay: `${c.delay}s`,
          '--rot': `${c.rotation}deg`,
        } as CSSProperties;
        return <span key={c.id} className="confetti" style={style} />;
      })}
    </div>
  );
}
