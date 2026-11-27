// Feedback.tsx — retour après une réponse : gain (ou bonne réponse affichée),
// anecdote éventuelle, et le gros compteur central avec le bonus de série.
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import type { GameState } from '../useGame.js';

/** Props : l'état de la partie (phase 'reponse' uniquement affichée). */
interface FeedbackProps {
  p: GameState;
}

export default function Feedback({ p }: FeedbackProps): ReactElement | null {
  const { phase, selection, question, mode, lastGain, lastBonus, streaks, currentPlayer, vies } = p;
  if (phase !== 'reponse') return null;
  const bonne = selection !== null && selection === question.bonne;
  const prefixe = selection === null ? 'Temps écoulé' : 'Raté';
  return (
    <>
      <div className="feedback">
        {bonne ? (
          <div className="gain">
            +{lastGain} pts <Icon nom="bolt" taille={22} className="gain-icone" />
          </div>
        ) : (
          <div className="rate">
            {mode === 'rogue' ? (
              vies > 0 ? (
                <>
                  {prefixe} — il te reste {vies} vie{vies > 1 ? 's' : ''} !
                </>
              ) : (
                `${prefixe} — la run s'arrête là !`
              )
            ) : (
              <>
                {prefixe}. La bonne réponse était :{' '}
                <strong>{question.reponses[question.bonne]}</strong>
              </>
            )}
          </div>
        )}
        {question.info && <p className="info">{question.info}</p>}
        <p className="suite-auto">Question suivante dans un instant…</p>
      </div>

      {!bonne && <div className="flash-erreur" aria-hidden="true" />}

      {bonne && (
        <div className="gain-centre" aria-hidden="true">
          <span>+{lastGain}</span>
          <small>points</small>
          {lastBonus > 0 && (
            <small className="bonus-streak">
              <Icon nom="flame" taille={16} /> dont +{lastBonus} bonus série ×
              {streaks[currentPlayer]}
            </small>
          )}
        </div>
      )}
    </>
  );
}
