// Reponses.tsx — les 2 à 4 boutons de réponse. En phase 'reponse', la bonne est
// marquée, la mauvaise sélectionnée aussi, les autres estompées.
import type { CSSProperties } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { LETTERS } from '../constants.js';
import type { DrawnQuestion } from '../draw.js';
import type { GamePhase } from '../useGame.js';

/** Props des boutons de réponse : question courante, phase, sélection et couleur par réponse. */
interface AnswersProps {
  question: DrawnQuestion;
  phase: GamePhase;
  selection: number | null;
  answerColor: (r: string, i: number) => string;
  onAnswer: (i: number) => void;
}

export default function Answers({
  question,
  phase,
  selection,
  answerColor,
  onAnswer,
}: AnswersProps) {
  return (
    <div className="reponses">
      {question.reponses.map((r, i) => {
        let classe = 'reponse';
        if (phase === 'reponse') {
          if (i === question.bonne) classe += ' bonne';
          else if (i === selection) classe += ' mauvaise';
          else classe += ' estompee';
        }
        // '--couleur' est une propriété CSS custom : csstype ne la connaît pas, d'où le cast.
        const style = { '--couleur': answerColor(r, i) } as CSSProperties;
        return (
          <button
            key={i}
            className={classe}
            style={style}
            disabled={phase !== 'question'}
            onClick={() => onAnswer(i)}
          >
            <span className="lettre">{LETTERS[i] || String.fromCharCode(65 + i)}</span>
            <span className="texte">{r}</span>
            {phase === 'reponse' && i === question.bonne && (
              <Icon nom="check" taille={20} className="coche" />
            )}
            {phase === 'reponse' && i === selection && i !== question.bonne && (
              <Icon nom="x" taille={20} className="coche" />
            )}
          </button>
        );
      })}
    </div>
  );
}
