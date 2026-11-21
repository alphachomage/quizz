// Barres30j.jsx — courbe des points marqués sur les 30 derniers jours.
export default function Last30Days({ calendar }) {
  return (
    <section>
      <h3 className="titre-section">Points marqués — 30 derniers jours</h3>
      <div className="barres">
        {calendar.jours30.map((j) => (
          <span
            key={j.key}
            className="barre"
            style={{ height: `${Math.round((j.points / calendar.maxPoints) * 100)}%` }}
            data-label={`${j.points} pts · ${j.games} partie(s)`}
            title={`${j.key} : ${j.points} pts · ${j.games} partie(s)`}
          />
        ))}
      </div>
    </section>
  );
}
