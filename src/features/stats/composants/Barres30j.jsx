// Barres30j.jsx — courbe des points marqués sur les 30 derniers jours.
export default function Barres30j({ calendrier }) {
  return (
    <section>
      <h3 className="titre-section">Points marqués — 30 derniers jours</h3>
      <div className="barres">
        {calendrier.jours30.map((j) => (
          <span
            key={j.cle}
            className="barre"
            style={{ height: `${Math.round((j.points / calendrier.maxPoints) * 100)}%` }}
            data-label={`${j.points} pts · ${j.parties} partie(s)`}
            title={`${j.cle} : ${j.points} pts · ${j.parties} partie(s)`}
          />
        ))}
      </div>
    </section>
  );
}
