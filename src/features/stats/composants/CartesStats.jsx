// CartesStats.jsx — les 4-5 grandes cartes de chiffres en haut de l'écran Stats.
export default function CartesStats({ stats, tempsMoyen }) {
  return (
    <section className="stats-cartes">
      <div className="stat-carte">
        <div className="stat-valeur">{stats.parties}</div>
        <div className="stat-label">parties jouées</div>
      </div>
      <div className="stat-carte">
        <div className="stat-valeur">{stats.repondues}</div>
        <div className="stat-label">questions répondues</div>
      </div>
      <div className="stat-carte">
        <div className="stat-valeur">{stats.pct} %</div>
        <div className="stat-label">de réussite</div>
      </div>
      <div className="stat-carte">
        <div className="stat-valeur">{stats.points}</div>
        <div className="stat-label">points cumulés</div>
      </div>
      {tempsMoyen !== null && (
        <div className="stat-carte">
          <div className="stat-valeur">{tempsMoyen} s</div>
          <div className="stat-label">temps de réaction moyen</div>
        </div>
      )}
    </section>
  );
}
