// Reponses.jsx — les 2 à 4 boutons de réponse. En phase 'reponse', la bonne est
// marquée, la mauvaise sélectionnée aussi, les autres estompées.
import Icone from '../../../components/Icone.jsx';

import { LETTRES } from '../constantes.js';

export default function Reponses({ question, phase, selection, couleurReponse, onRepondre }) {
  return (
    <div className="reponses">
      {question.reponses.map((r, i) => {
        let classe = 'reponse';
        if (phase === 'reponse') {
          if (i === question.bonne) classe += ' bonne';
          else if (i === selection) classe += ' mauvaise';
          else classe += ' estompee';
        }
        return (
          <button
            key={i}
            className={classe}
            style={{ '--couleur': couleurReponse(r, i) }}
            disabled={phase !== 'question'}
            onClick={() => onRepondre(i)}
          >
            <span className="lettre">{LETTRES[i] || String.fromCharCode(65 + i)}</span>
            <span className="texte">{r}</span>
            {phase === 'reponse' && i === question.bonne && <Icone nom="check" taille={20} className="coche" />}
            {phase === 'reponse' && i === selection && i !== question.bonne && <Icone nom="x" taille={20} className="coche" />}
          </button>
        );
      })}
    </div>
  );
}
