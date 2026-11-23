// GrilleThemes.tsx — carrousel horizontal des thèmes (ordre alphabétique fixe) avec carte
// mémoïsée (React.memo : seule la carte dont les props changent est re-rendue).
import { memo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { recordKey } from '@lib/records.js';
import type { RecordsMap } from '@lib/records.js';
import { themeLevel, xpForLevel } from '@lib/xp.js';
import type { XpMap } from '@lib/xp.js';
import type { GameMode, LevelId, Theme } from '@lib/types.js';
import type { HomeState } from '../useHome.js';
import { useCarousel } from '../useCarousel.js';

interface ThemeCardProps {
  t: Theme;
  mode: GameMode;
  niveau: LevelId;
  themeId: string | null;
  records: RecordsMap;
  xp: XpMap;
  isAdmin: boolean;
  isGuest: boolean;
  onSelect: (id: string) => void;
}

const ThemeCard = memo(function ThemeCard({
  t,
  mode,
  niveau,
  themeId,
  records,
  xp,
  isAdmin,
  isGuest,
  onSelect,
}: ThemeCardProps): ReactElement {
  const record = records[recordKey(mode, mode === 'solo' ? niveau : null, t.id)] || 0;
  const niv = themeLevel(xp[t.id] || 0);
  const xpLevel = xpForLevel(niv);
  const xpNext = xpForLevel(niv + 1);
  const pctXp = Math.min(100, Math.round((((xp[t.id] || 0) - xpLevel) / (xpNext - xpLevel)) * 100));
  return (
    <button
      className={themeId === t.id ? 'theme actif' : 'theme'}
      style={
        {
          '--couleur': t.couleur,
        } as CSSProperties
      }
      onClick={() => onSelect(t.id)}
    >
      <span className="theme-icone">
        <Icon nom={t.icone} taille={26} />
      </span>
      <span className="theme-nom">{t.nom}</span>
      <span className="theme-meta">
        {!isGuest && <span className="theme-niv">Niv. {niv}</span>}
        {record > 0 && <span className="theme-record">Record {record} pts</span>}
        {isAdmin && <span className="theme-nb">{t.questions.length} q.</span>}
      </span>
      {!isGuest && (
        <span
          className="theme-xpbar"
          title={`XP ${xp[t.id] || 0} — niveau ${niv + 1} à ${xpNext} XP`}
        >
          <i
            style={{
              width: `${pctXp}%`,
              background: t.couleur,
            }}
          />
        </span>
      )}
    </button>
  );
});

interface ThemeGridProps {
  a: HomeState;
  isAdmin: boolean;
  isGuest: boolean;
}

export default function ThemeGrid({ a, isAdmin, isGuest }: ThemeGridProps): ReactElement {
  const c = useCarousel(a.displayedThemes.length);
  return (
    <section className="themes-carrousel" aria-roledescription="carrousel" aria-label="Thèmes">
      <div className="carrousel-entete">
        <h2 className="titre-section">Choisis ton thème</h2>
        <div className="carrousel-fleches">
          <button
            className="carrousel-fleche"
            aria-label="Thèmes précédents"
            disabled={!c.canPrev}
            onClick={() => c.page(-1)}
          >
            <Icon nom="chevron-left" taille={18} />
          </button>
          <button
            className="carrousel-fleche"
            aria-label="Thèmes suivants"
            disabled={!c.canNext}
            onClick={() => c.page(1)}
          >
            <Icon nom="chevron-right" taille={18} />
          </button>
        </div>
      </div>
      <div className="themes" ref={c.trackRef} onScroll={c.onScroll}>
        {a.displayedThemes.map((t) => (
          <ThemeCard
            key={t.id}
            t={t}
            mode={a.mode}
            niveau={a.niveau}
            themeId={a.themeId}
            records={a.records}
            xp={a.xp}
            isAdmin={isAdmin}
            isGuest={isGuest}
            onSelect={(id) => {
              a.setThemeId(id);
              // En solo, le choix du niveau se fait dans une modale, sans scroll
              if (a.mode === 'solo') a.setLevelModal(true);
            }}
          />
        ))}
      </div>
      <div className="carrousel-jauge" aria-hidden="true">
        <i
          style={{
            width: `${c.visible * 100}%`,
            transform: `translateX(${c.progress * (1 / c.visible - 1) * 100}%)`,
          }}
        />
      </div>
    </section>
  );
}
