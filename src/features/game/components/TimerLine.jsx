// MinuteurLigne.jsx — barre de temps dynamique : couleur selon les points encore
// en jeu (vert/jaune/rouge), pastille « X pts » et pulsation dans les 3 dernières s.
export default function TimerLine({ pct, barColor: barColor, remainingPoints, danger }) {
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
