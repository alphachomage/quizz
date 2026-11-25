// BarreHaut.tsx — en-tête de la partie, sur deux niveaux : 1) le thème, 2) les infos
// (niveau, manche, question, score, série en cours).
import type { ReactElement } from 'react';
import type { CSSProperties } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { levelColor, levelName } from '@lib/scoring.js';
import { currentDailyStreak } from '@lib/streak.js';
import { RELICS, RARETE_COULEUR } from '@lib/relics.js';
import type { GameViewState } from '../useGame.js';

/** Props : état de la partie enrichi (manche, bonus, thème courant) construit dans Game.tsx. */
interface TopBarProps {
  p: GameViewState;
}

export default function TopBar({ p }: TopBarProps): ReactElement {
  const {
    mode,
    niveau,
    theme,
    players,
    nbJoueurs,
    index,
    questions,
    scores,
    streaks,
    currentPlayer,
    round,
    bonus,
    currentTheme,
    relics,
  } = p;
  // '--couleur' est une propriété CSS custom : csstype ne la connaît pas, d'où le cast.
  const themeChipStyle = {
    background: currentTheme.couleur,
    '--couleur': currentTheme.couleur,
  } as CSSProperties;
  return (
    <div className="barre-haut">
      <div className="barre-haut-theme">
        <span className="chip theme-chip" style={themeChipStyle}>
          <Icon nom={currentTheme.icone || theme.icone} taille={20} /> {currentTheme.nom}
        </span>
      </div>
      <div className="barre-haut-infos">
        {mode === 'solo' && (
          <span className="chip niveau-chip">
            <i
              style={{
                background: levelColor(niveau),
              }}
            />{' '}
            {levelName(niveau)}
          </span>
        )}
        {mode === 'rogue' && (
          <span className="chip niveau-chip">
            <i
              style={{
                background: '#a78bfa',
              }}
            />{' '}
            Palier {Math.min(10, Math.floor(index / 10) + 1)}/10
          </span>
        )}
        {mode === 'rogue' && (
          <span
            className="chip manche rogue-chip"
            title={`Vies : ${p.vies} restante(s) sur ${p.viesMax} max (certaines reliques en ajoutent)`}
          >
            {Array.from({ length: Math.max(0, p.vies) }).map((_, i) => (
              <Icon key={i} nom="bolt" taille={13} />
            ))}
            <span className="vies-max">/{p.viesMax}</span>
          </span>
        )}
        {mode === 'quotidien' && (
          <span className="chip manche bonus">
            <Icon nom="calendar" taille={13} /> Quizz du {niveau}
          </span>
        )}
        {mode === 'quotidien' && currentDailyStreak().account >= 3 && (
          <span className="chip manche bonus">
            <Icon nom="bolt" taille={13} /> série {currentDailyStreak().account} j · pts ×1,5
          </span>
        )}
        {p.withRounds && (
          <span className={bonus ? 'chip manche bonus' : 'chip manche'}>
            Manche {round}/3{bonus ? ' · BONUS ×2' : ''}
          </span>
        )}
        <span className="chip">
          Question {Math.min(index + 1, questions.length)}
          {mode === 'rogue' ? '' : `/${questions.length}`}
        </span>
        {mode === 'duel' ? (
          players.slice(0, nbJoueurs).map((j, i) => (
            <span key={j} className={i === currentPlayer ? 'chip score actif' : 'chip score'}>
              {j} : {scores[i]}
            </span>
          ))
        ) : (
          <span className="chip score">
            <Icon nom="star" taille={14} /> {scores[0]}
          </span>
        )}
        {streaks[currentPlayer] >= 2 && (
          <span className="chip streak-chip">
            <Icon nom="flame" taille={13} /> Série ×{streaks[currentPlayer]} · +
            {Math.min(10, streaks[currentPlayer] - 1)}
          </span>
        )}
      {mode === 'rogue' && relics.length > 0 && (
        <div className="reliques-actives" title={relics.map((r) => r.nom).join(', ')}>
          {relics.map((r) => {
            const def = RELICS.find((x) => x.id === r.id);
            return (
              <span
                key={r.id}
                className="relique-puce"
                style={{ borderColor: RARETE_COULEUR[def?.rarete || 'commun'] }}
                title={`${def?.nom || r.id} — ${def?.desc || ''}${def?.malus ? ` ⚠ ${def.malus}` : ''}`}
              >
                <Icon nom={def?.icone || 'sparkles'} taille={14} />
              </span>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className="bouton-quitter"
        onClick={p.abandonner}
        title="Quitter la partie (les points sont enregistrés)"
        aria-label="Quitter la partie et revenir au menu"
      >
        <Icon nom="x" taille={16} />
      </button>
      </div>
    </div>
  );
}
