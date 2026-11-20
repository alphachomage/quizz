// ProgressionXp.jsx — niveau global + barre d'XP + thèmes classés par XP.
import Icone from '@shared/ui/Icone.jsx';
import { xpPourNiveau } from '@lib/index.js';

export default function ProgressionXp({ xpTotal, nivGlobal, xpNext, pctXp, themesNives }) {
  return (
    <section>
      <h3 className="titre-section">Ma progression (XP)</h3>
      <div className="xp-globale">
        <div className="xp-globale-haut">
          <span>Niveau global <strong>{nivGlobal}</strong></span>
          <span>{xpTotal} XP · prochain niveau à {xpNext} XP</span>
        </div>
        <span className="user-xpbar grosse">
          <i style={{ width: `${pctXp}%` }} />
        </span>
      </div>
      {themesNives.length > 0 && (
        <ul className="stats-themes">
          {themesNives.map((t) => {
            const xpN = xpPourNiveau(t.niv);
            const xpS = xpPourNiveau(t.niv + 1);
            const pct = Math.min(100, Math.round(((t.xp - xpN) / Math.max(1, xpS - xpN)) * 100));
            return (
              <li key={t.id} className="stats-theme">
                <span className="stats-theme-nom" style={{ '--couleur': t.couleur }}>
                  <Icone nom={t.icone} taille={16} /> {t.nom}
                </span>
                <span className="stats-theme-barre">
                  <i style={{ width: `${pct}%`, background: t.couleur }} />
                </span>
                <span className="stats-theme-niv">Niv. {t.niv} · {t.xp} XP</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
