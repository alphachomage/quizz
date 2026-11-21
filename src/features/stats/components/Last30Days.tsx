// Barres30j.tsx — courbe des points marqués sur les 30 derniers jours.
import type { ReactElement } from 'react';
import type { Calendar } from '../statsCompute.js';

interface Last30DaysProps {
  calendar: Calendar;
}

export default function Last30Days({ calendar }: Last30DaysProps): ReactElement {
  return (
    <section>
      <h3 className="titre-section">Points marqués — 30 derniers jours</h3>
      <div className="barres">
        {calendar.last30Days.map((j) => (
          <span
            key={j.key}
            className="barre"
            style={{
              height: `${Math.round((j.points / calendar.maxPoints) * 100)}%`,
            }}
            data-label={`${j.points} pts · ${j.games} partie(s)`}
            title={`${j.key} : ${j.points} pts · ${j.games} partie(s)`}
          />
        ))}
      </div>
    </section>
  );
}
