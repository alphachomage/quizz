// ResultXp.tsx — fin de partie : XP gagnée en une ligne lisible (+N XP, niveau, barre).
// Le détail par thème ne s'affiche que s'il y a plusieurs thèmes (Survie, Quizz du jour).
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { themeLevel } from '@lib/xp.js';
import type { Theme } from '@lib/types.js';
import { levelPercent } from '../gameStats.js';
import type { Persistance } from '../persist.js';

interface ResultXpProps {
  globalXp: Persistance['globalXp'];
  themeXp: Persistance['themeXp'];
  themes: Theme[] | null;
}

export default function ResultXp({ globalXp, themeXp, themes }: ResultXpProps): ReactElement {
  const niveau = themeLevel(globalXp.apres);
  return (
    <div className="resultat-xp">
      <div className="resultat-xp-ligne">
        <Icon nom="star" taille={26} />
        <strong>+{globalXp.gain} XP</strong>
        <span className="resultat-xp-niv">Niveau {niveau}</span>
      </div>
      <div className="xp-barre">
        <i
          style={{
            width: `${levelPercent(globalXp.apres)}%`,
          }}
        />
      </div>
      {themeXp.length > 1 && (
        <ul className="resultat-xp-themes">
          {themeXp.map((l) => {
            const t = (themes || []).find((x) => x.id === l.themeId);
            return (
              <li key={l.themeId}>
                <Icon nom={t ? t.icone : 'sparkles'} taille={18} />
                <span>{t ? t.nom : l.themeId}</span>
                <strong>+{l.gain} XP</strong>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
