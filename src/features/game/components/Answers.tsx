// Reponses.tsx — les 2 à 4 boutons de réponse. En phase 'reponse', la bonne est
// marquée, la mauvaise sélectionnée aussi, les autres estompées.
// Effets de reliques (mode rogue) : surlillance (Loupe), barrée (Lunettes rouges),
// scintille (Intuition), vote du public, réponses cachées (Brouillard), qui
// disparaissent progressivement (Élimination), révélation (Rayon X).
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
  /** Index de la bonne réponse révélée (Rayon X), null sinon. */
  revelation?: number | null;
  /** Indices surlignés par la Loupe (dont la bonne). */
  surbrillance?: number[];
  /** Indice de la réponse barrée (Lunettes rouges). */
  barree?: number | null;
  /** Pourcentages du Vote du public. */
  votePcts?: number[] | null;
  /** La bonne réponse scintille 0,5 s (Intuition). */
  scintille?: boolean;
  /** Secondes écoulées sur la question courante. */
  ecoulees?: number;
  /** Durée totale du timer (pour Élimination / Brouillard). */
  dureeQuestion?: number;
  /** Élimination : plafond de points et disparition toutes les 3 s (0 = inactif). */
  eliminationMax?: number;
  /** Brouillard : secondes pendant lesquelles les réponses sont cachées (0 = inactif). */
  brouillardS?: number;
}

/** Au-delà de ce nombre de caractères, une réponse passe en texte réduit. */
const LONG_ANSWER = 45;

export default function Answers({
  question,
  phase,
  selection,
  answerColor,
  onAnswer,
  revelation = null,
  surbrillance = [],
  barree = null,
  votePcts = null,
  scintille = false,
  ecoulees = 0,
  eliminationMax = 0,
  brouillardS = 0,
}: AnswersProps) {
  // Élimination : toutes les 3 s, une mauvaise réponse disparaît (max = toutes les mauvaises).
  let disparues = new Set<number>();
  if (eliminationMax > 0 && phase === 'question') {
    const nb = Math.min(question.reponses.length - 1, Math.floor(ecoulees / 3));
    const mauvaises = question.reponses.map((_, i) => i).filter((i) => i !== question.bonne);
    disparues = new Set(mauvaises.slice(0, nb));
  }
  // Brouillard : réponses cachées (floutées) les `brouillardS` premières secondes.
  const cachees = brouillardS > 0 && phase === 'question' && ecoulees < brouillardS;
  return (
    <div className="reponses entree">
      {question.reponses.map((r, i) => {
        // Réponse très longue : texte plus petit pour que la partie tienne sur un écran
        let classe = r.length > LONG_ANSWER ? 'reponse longue' : 'reponse';
        if (phase === 'reponse') {
          if (i === question.bonne) classe += selection === i ? ' bonne' : ' bonne manquee';
          else if (i === selection) classe += ' mauvaise';
          else classe += ' estompee';
        } else {
          if (surbrillance.includes(i)) classe += ' surlignee';
          if (barree === i) classe += ' barree';
          if (scintille && i === question.bonne) classe += ' scintille';
          if (disparues.has(i)) classe += ' disparue';
          if (cachees) classe += ' cachee';
          if (revelation !== null && i === revelation) classe += ' revelee';
        }
        // '--couleur' est une propriété CSS custom : csstype ne la connaît pas, d'où le cast.
        const style = { '--couleur': answerColor(r, i) } as CSSProperties;
        const desactivee = phase !== 'question' || barree === i || disparues.has(i);
        return (
          <button
            key={i}
            className={classe}
            style={style}
            disabled={desactivee}
            onClick={() => onAnswer(i)}
          >
            <span className="lettre">{LETTERS[i] || String.fromCharCode(65 + i)}</span>
            <span className="texte">{r}</span>
            {votePcts && phase === 'question' && <span className="vote-pct">{votePcts[i]} %</span>}
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
