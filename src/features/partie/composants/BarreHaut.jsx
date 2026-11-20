// BarreHaut.jsx — chips d'en-tête de la partie : thème, niveau, manche, question,
// scores des joueurs et série en cours.
import Icone from '@shared/ui/Icone.jsx';

import { couleurNiveau, nomNiveau } from '@lib/scoring.js';
import { streakJourActuelle } from '@lib/streak.js';

export default function BarreHaut({ p }) {
  const { mode, niveau, theme, joueurs, nbJoueurs, index, questions, scores, streaks, joueurActuel, manche, bonus, themeCourant } = p;
  return (
    <div className="barre-haut">
      <span
        className="chip theme-chip"
        style={{ background: themeCourant.couleur, '--couleur': themeCourant.couleur }}
      >
        <Icone nom={themeCourant.icone || theme.icone} taille={15} /> {themeCourant.nom}
      </span>
      {mode === 'solo' && (
        <span className="chip niveau-chip">
          <i style={{ background: couleurNiveau(niveau) }} /> {nomNiveau(niveau)}
        </span>
      )}
      {mode === 'survie' && (
        <span className="chip niveau-chip">
          <i style={{ background: '#a78bfa' }} /> Tous niveaux
        </span>
      )}
      {mode === 'survie' && (
        <span className="chip manche survie-chip"><Icone nom="skull" taille={13} /> Survie — 1 vie</span>
      )}
      {mode === 'quotidien' && (
        <span className="chip manche bonus"><Icone nom="calendar" taille={13} /> Quizz du {niveau}</span>
      )}
      {mode === 'quotidien' && streakJourActuelle().compte >= 3 && (
        <span className="chip manche bonus"><Icone nom="bolt" taille={13} /> série {streakJourActuelle().compte} j · pts ×1,5</span>
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
        ? joueurs.slice(0, nbJoueurs).map((j, i) => (
            <span key={j} className={i === joueurActuel ? 'chip score actif' : 'chip score'}>
              {j} : {scores[i]}
            </span>
          ))
        : <span className="chip score"><Icone nom="star" taille={14} /> {scores[0]}</span>}
      {streaks[joueurActuel] >= 2 && (
        <span className="chip streak-chip">
          <Icone nom="flame" taille={13} /> Série ×{streaks[joueurActuel]} · +{Math.min(10, streaks[joueurActuel] - 1)}
        </span>
      )}
    </div>
  );
}
