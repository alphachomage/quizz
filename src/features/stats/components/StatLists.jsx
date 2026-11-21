// ListesStats.jsx — les 3 listes « par mode / par thème / par niveau » de l'écran Stats.
import Icon from '@shared/ui/Icon.jsx';
export default function StatLists({ stats, modes }) {
  return (
    <>
      <section>
        <h3 className="titre-section">Par mode de jeu</h3>
        <ul className="stats-liste">
          {modes.map((m) => {
            const s = stats.perMode[m.id];
            return (
              <li key={m.id} className="stats-ligne">
                <span className="stats-ligne-nom">
                  <Icon nom={m.icone} taille={17} /> {m.nom}
                </span>
                <span className="stats-ligne-val">
                  {s ? `${s.games} partie(s) · meilleur score ${s.best} pts` : 'pas encore joué'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {stats.parThemeListe.length > 0 && (
        <section>
          <h3 className="titre-section">Par thème</h3>
          <ul className="stats-liste">
            {stats.parThemeListe.map((t) => (
              <li key={t.id} className="stats-ligne">
                <span className="stats-ligne-nom">{t.nom}</span>
                <span className="stats-ligne-val">
                  {t.correctes}/{t.jouées} bonnes réponses · {t.pct} %
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.parNiveauListe.length > 0 && (
        <section>
          <h3 className="titre-section">Par niveau de difficulté</h3>
          <ul className="stats-liste">
            {stats.parNiveauListe.map((n) => (
              <li key={n.id} className="stats-ligne">
                <span
                  className="stats-ligne-nom"
                  style={{
                    color: n.couleur,
                  }}
                >
                  {n.nom}
                </span>
                <span className="stats-ligne-val">
                  {n.correctes}/{n.jouées} bonnes réponses · {n.pct} %
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
