// Feedback.jsx — retour après une réponse : gain (ou bonne réponse affichée),
// anecdote éventuelle, et le gros compteur central avec le bonus de série.
import Icon from '@shared/ui/Icon.jsx';
export default function Feedback({ p }) {
  const {
    phase,
    selection,
    question,
    mode,
    lastGain: lastGain,
    lastBonus: lastBonus,
    streaks,
    currentPlayer: currentPlayer,
  } = p;
  if (phase !== 'reponse') return null;
  const bonne = selection !== null && selection === question.bonne;
  return (
    <>
      <div className="feedback">
        {bonne ? (
          <div className="gain">
            +{lastGain} pts <Icon nom="bolt" taille={22} className="gain-icone" />
          </div>
        ) : (
          <div className="rate">
            {mode === 'survie' ? (
              "Raté — la survie s'arrête là !"
            ) : (
              <>
                Raté. La bonne réponse était : <strong>{question.reponses[question.bonne]}</strong>
              </>
            )}
          </div>
        )}
        {question.info && <p className="info">{question.info}</p>}
        <p className="suite-auto">Question suivante dans un instant…</p>
      </div>

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
