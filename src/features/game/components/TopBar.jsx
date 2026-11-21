// BarreHaut.jsx — chips d'en-tête de la partie : thème, niveau, manche, question,
// scores des joueurs et série en cours.
import Icon from '@shared/ui/Icon.jsx';
import { levelColor, levelName } from '@lib/scoring.js';
import { currentDailyStreak } from '@lib/streak.js';
export default function TopBar({ p }) {
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
    currentPlayer: currentPlayer,
    round: round,
    bonus,
    currentTheme,
  } = p;
  return (
    <div className="barre-haut">
      <span
        className="chip theme-chip"
        style={{
          background: currentTheme.couleur,
          '--couleur': currentTheme.couleur,
        }}
      >
        <Icon nom={currentTheme.icone || theme.icone} taille={15} /> {currentTheme.nom}
      </span>
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
      {mode === 'survie' && (
        <span className="chip niveau-chip">
          <i
            style={{
              background: '#a78bfa',
            }}
          />{' '}
          Tous niveaux
        </span>
      )}
      {mode === 'survie' && (
        <span className="chip manche survie-chip">
          <Icon nom="skull" taille={13} /> Survie — 1 vie
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
        {mode === 'survie' ? '' : `/${questions.length}`}
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
    </div>
  );
}
