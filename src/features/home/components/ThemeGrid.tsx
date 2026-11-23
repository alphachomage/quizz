// GrilleThemes.tsx — carrousel des thèmes en boucle infinie (ordre alphabétique fixe), points
// de navigation en bas, flèches sur grand écran. Carte mémoïsée (React.memo).
import { memo, useCallback } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { recordKey } from '@lib/records.js';
import type { RecordsMap } from '@lib/records.js';
import { themeLevel, xpForLevel } from '@lib/xp.js';
import type { XpMap } from '@lib/xp.js';
import type { GameMode, LevelId, Theme } from '@lib/types.js';
import type { HomeState } from '../useHome.js';
import { LOOP_COPIES, useCarousel } from '../useCarousel.js';

interface ThemeCardProps {
  t: Theme;
  mode: GameMode;
  niveau: LevelId;
  themeId: string | null;
  records: RecordsMap;
  xp: XpMap;
  isAdmin: boolean;
  isGuest: boolean;
  /** Copie de bouclage : invisible pour les lecteurs d'écran et hors du parcours clavier. */
  clone: boolean;
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
  clone,
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
      aria-hidden={clone || undefined}
      tabIndex={clone ? -1 : undefined}
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
  const themes = a.displayedThemes;
  const c = useCarousel(themes.length);
  const { mode, setThemeId, setLevelModal } = a;
  const onSelect = useCallback(
    (id: string) => {
      setThemeId(id);
      // En solo, le choix du niveau se fait dans une modale, sans scroll
      if (mode === 'solo') setLevelModal(true);
    },
    [mode, setThemeId, setLevelModal]
  );
  const copies = Array.from({ length: LOOP_COPIES }, (_, i) => i);
  const middle = Math.floor(LOOP_COPIES / 2);
  return (
    <section className="themes-carrousel" aria-roledescription="carrousel" aria-label="Thèmes">
      <div className="carrousel-entete">
        <h2 className="titre-section">Choisis ton thème</h2>
        <div className="carrousel-fleches">
          <button
            className="carrousel-fleche"
            aria-label="Thèmes précédents"
            onClick={() => c.page(-1)}
          >
            <Icon nom="chevron-left" taille={18} />
          </button>
          <button
            className="carrousel-fleche"
            aria-label="Thèmes suivants"
            onClick={() => c.page(1)}
          >
            <Icon nom="chevron-right" taille={18} />
          </button>
        </div>
      </div>
      <div className="themes" ref={c.trackRef} onScroll={c.onScroll}>
        {copies.map((copy) =>
          themes.map((t) => (
            <ThemeCard
              key={`${copy}-${t.id}`}
              t={t}
              mode={a.mode}
              niveau={a.niveau}
              themeId={a.themeId}
              records={a.records}
              xp={a.xp}
              isAdmin={isAdmin}
              isGuest={isGuest}
              clone={copy !== middle}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
      <div className="carrousel-points">
        {themes.map((t, i) => (
          <button
            key={t.id}
            className={i === c.active ? 'carrousel-point actif' : 'carrousel-point'}
            style={
              {
                '--couleur': t.couleur,
              } as CSSProperties
            }
            aria-label={`Aller au thème ${t.nom}`}
            aria-current={i === c.active || undefined}
            onClick={() => c.goTo(i)}
          />
        ))}
      </div>
    </section>
  );
}
