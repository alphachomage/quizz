// ProgressionXp.tsx — niveau global + barre d'XP + thèmes classés par XP.
import type { CSSProperties, ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { xpForLevel } from '@lib/xp.js';
import type { ThemeLevel } from '../statsCompute.js';

interface XpProgressProps {
  totalXp: number;
  nivGlobal: number;
  xpNext: number;
  pctXp: number;
  levelsByTheme: ThemeLevel[];
}

export default function XpProgress({
  totalXp,
  nivGlobal,
  xpNext,
  pctXp,
  levelsByTheme,
}: XpProgressProps): ReactElement {
  return (
    <section>
      <h3 className="titre-section">Ma progression (XP)</h3>
      <div className="xp-globale">
        <div className="xp-globale-haut">
          <span>
            Niveau global <strong>{nivGlobal}</strong>
          </span>
          <span>
            {totalXp} XP · prochain niveau à {xpNext} XP
          </span>
        </div>
        <span className="user-xpbar grosse">
          <i
            style={{
              width: `${pctXp}%`,
            }}
          />
        </span>
      </div>
      {levelsByTheme.length > 0 && (
        <ul className="stats-themes">
          {levelsByTheme.map((t) => {
            const xpN = xpForLevel(t.niv);
            const xpS = xpForLevel(t.niv + 1);
            const pct = Math.min(100, Math.round(((t.xp - xpN) / Math.max(1, xpS - xpN)) * 100));
            // propriété CSS custom --couleur : typée via un cast (React 18 n'indexe plus les custom props)
            const couleurStyle = { '--couleur': t.couleur } as CSSProperties;
            return (
              <li key={t.id} className="stats-theme">
                <span className="stats-theme-nom" style={couleurStyle}>
                  <Icon nom={t.icone} taille={16} /> {t.nom}
                </span>
                <span className="stats-theme-barre">
                  <i
                    style={{
                      width: `${pct}%`,
                      background: t.couleur,
                    }}
                  />
                </span>
                <span className="stats-theme-niv">
                  Niv. {t.niv} · {t.xp} XP
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
