// BarreHaut.jsx — chips d'en-tête de la partie : thème, niveau, manche, question,
// scores des joueurs et série en cours.
import Icon from '@shared/ui/Icon.jsx';

import { couleurNiveau, levelName } from '@lib/scoring.js';
import { currentDailyStreak } from '@lib/streak.js';

export default function TopBar({ p }) {
  const { mode, niveau, theme, players, nbJoueurs, index, questions, scores, streaks, joueurActuel, manche, bonus, currentTheme } = p;
  return (
    <div className="barre-haut">
      <span
        className="chip theme-chip"
        style={{ background: currentTheme.couleur, '--couleur': currentTheme.couleur }}
      >
        <Icon nom={currentTheme.icone || theme.icone} taille={15} /> {currentTheme.nom}
      </span>
      {mode === 'solo' && (
        <span className="chip niveau-chip">
          <i style={{ background: couleurNiveau(niveau) }} /> {levelName(niveau)}
        </span>
      )}
      {mode === 'survie' && (
        <span className="chip niveau-chip">
          <i style={{ background: '#a78bfa' }} /> Tous niveaux
        </span>
      )}
      {mode === 'survie' && (
        <span className="chip manche survie-chip"><Icon nom="skull" taille={13} /> Survie — 1 vie</span>
      )}
      {mode === 'quotidien' && (
        <span className="chip manche bonus"><Icon nom="calendar" taille={13} /> Quizz du {niveau}</span>
      )}
      {mode === 'quotidien' && currentDailyStreak().account >= 3 && (
        <span className="chip manche bonus"><Icon nom="bolt" taille={13} /> série {currentDailyStreak().account} j · pts ×1,5</span>
      )}
      {p.avecManches && (
        <span className={bonus ? 'chip manche bonus' : 'chip manche'}>
          Manche {manche}/3{bonus ? ' · BONUS ×2' : ''}
        </span>
      )}
      <span className="chip">
        Question {Math.min(index + 1, questions.length)}{mode === 'survie' ? '' : `/${questions.length}`}
      </span>
      {mode === 'duel'
        ? players.slice(0, nbJoueurs).map((j, i) => (
            <span key={j} className={i === joueurActuel ? 'chip score actif' : 'chip score'}>
              {j} : {scores[i]}
            </span>
          ))
        : <span className="chip score"><Icon nom="star" taille={14} /> {scores[0]}</span>}
      {streaks[joueurActuel] >= 2 && (
        <span className="chip streak-chip">
          <Icon nom="flame" taille={13} /> Série ×{streaks[joueurActuel]} · +{Math.min(10, streaks[joueurActuel] - 1)}
        </span>
      )}
    </div>
  );
}
