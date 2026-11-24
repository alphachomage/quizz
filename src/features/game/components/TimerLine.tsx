// MinuteurLigne.tsx — barre de temps dynamique : couleur selon les points encore
// en jeu (vert/jaune/rouge), pastille « X pts » et pulsation dans les 3 dernières s.
import type { ReactElement } from 'react';

/** Props de la barre de temps : pourcentage restant, couleur, points restants et danger (3 dernières s). */
interface TimerLineProps {
  pct: number;
  barColor: string;
  remainingPoints: number;
  danger: boolean;
}

export default function TimerLine({
  pct,
  barColor,
  remainingPoints,
  danger,
}: TimerLineProps): ReactElement {
  return (
    <div className={danger ? 'minuteur-ligne danger' : 'minuteur-ligne'}>
      <div className="minuteur">
        <div
          className="minuteur-rempli"
          style={{
            width: `${pct}%`,
            background: barColor,
          }}
        />
      </div>
      <span className="minuteur-pts">{remainingPoints} pts</span>
    </div>
  );
}
