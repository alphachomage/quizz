// ThemeCarousel.tsx — carrousel des thèmes en boucle infinie (ordre alphabétique fixe) :
// la carte au centre est la carte choisie ; un clic sur une carte la centre. Points de
// navigation en dessous. Carte mémoïsée (React.memo). L'état vient de useCarousel.
import { memo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { recordKey } from '@lib/records.js';
import type { RecordsMap } from '@lib/records.js';
import { themeLevel, xpForLevel } from '@lib/xp.js';
import type { XpMap } from '@lib/xp.js';
import type { GameMode, LevelId, Theme } from '@lib/types.js';
import { LOOP_COPIES } from '../useCarousel.js';
import type { CarouselState } from '../useCarousel.js';

interface ThemeCardProps {
  t: Theme;
  mode: GameMode;
  niveau: LevelId;
  actif: boolean;
  records: RecordsMap;
  xp: XpMap;
  isAdmin: boolean;
  isGuest: boolean;
  /** Copie de bouclage : invisible pour les lecteurs d'écran et hors du parcours clavier. */
  clone: boolean;
  index: number;
  onSelect: (index: number) => void;
}

const ThemeCard = memo(function ThemeCard({
  t,
  mode,
  niveau,
  actif,
  index,
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
      className={actif ? 'theme actif' : 'theme'}
      style={
        {
          '--couleur': t.couleur,
        } as CSSProperties
      }
      aria-pressed={clone ? undefined : actif}
      aria-hidden={clone || undefined}
      tabIndex={clone ? -1 : undefined}
      onClick={() => onSelect(index)}
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

interface ThemeCarouselProps {
  themes: Theme[];
  c: CarouselState;
  mode: GameMode;
  niveau: LevelId;
  records: RecordsMap;
  xp: XpMap;
  isAdmin: boolean;
  isGuest: boolean;
}

export default function ThemeCarousel({
  themes,
  c,
  mode,
  niveau,
  records,
  xp,
  isAdmin,
  isGuest,
}: ThemeCarouselProps): ReactElement {
  const copies = Array.from({ length: LOOP_COPIES }, (_, i) => i);
  const middle = Math.floor(LOOP_COPIES / 2);
  return (
    <div className="themes-carrousel" aria-roledescription="carrousel" aria-label="Thèmes">
      <div
        className={c.spinning ? 'themes tourne' : 'themes'}
        ref={c.trackRef}
        onScroll={c.onScroll}
      >
        {copies.map((copy) =>
          themes.map((t, i) => (
            <ThemeCard
              key={`${copy}-${t.id}`}
              t={t}
              mode={mode}
              niveau={niveau}
              actif={!c.spinning && i === c.active}
              records={records}
              xp={xp}
              isAdmin={isAdmin}
              isGuest={isGuest}
              clone={copy !== middle}
              index={i}
              onSelect={c.goTo}
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
    </div>
  );
}
