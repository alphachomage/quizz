// CalendrierMois.jsx — calendrier d'activité du mois en cours (grille L..D façon GitHub).
export default function MonthCalendar({ calendar }) {
  return (
    <section>
      <h3 className="titre-section">Activité — {calendar.monthName}</h3>
      <div className="calendrier">
        <div className="cal-ligne cal-entetes">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => (
            <span key={i} className="cal-entete">
              {l}
            </span>
          ))}
        </div>
        {calendar.weeks.map((s, wi) => (
          <div key={wi} className="cal-ligne">
            {s.map((j, ji) =>
              j === null ? (
                <span key={`vide-${wi}-${ji}`} className="cal-case cal-vide" />
              ) : (
                <span
                  key={j.key}
                  className={j.futur ? 'cal-case cal-futur' : `cal-case cal-n${j.niveau}`}
                  title={`${j.key} : ${j.n} partie(s)`}
                >
                  {j.day}
                </span>
              )
            )}
          </div>
        ))}
      </div>
      <p className="vide">
        Chaque case = un jour du mois en cours. Plus c’est plein, plus tu as joué ce jour-là.
      </p>
    </section>
  );
}
