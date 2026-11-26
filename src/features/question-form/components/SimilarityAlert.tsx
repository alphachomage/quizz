// SimilarityAlert.tsx — bloc affiché à la soumission quand des questions existantes
// sont similaires (détection floue locale, index pré-calculé).
import Icon from '@shared/ui/Icon.jsx';
import { THRESHOLD_IDENTICAL } from '@lib/similarity.js';
import type { SimilarHit } from '@lib/similarity.js';
import type { TaggedQuestion } from '@lib/types.js';

interface SimilarityAlertProps {
  avertissement: SimilarHit<TaggedQuestion>[];
  onAdd: () => void;
  onCancel: () => void;
}

function etiquette(score: number): string {
  return score >= THRESHOLD_IDENTICAL ? 'quasi identique' : 'similaire';
}
export default function SimilarityAlert({
  avertissement,
  onAdd: onAdd,
  onCancel: onCancel,
}: SimilarityAlertProps) {
  return (
    <div className="alerte">
      <h3>
        <Icon nom="alert" taille={20} /> {avertissement.length} question(s) similaire(s) trouvée(s)
      </h3>
      <ul className="liste-similaires">
        {avertissement.map((s, i) => (
          <li key={i} className="sim-item">
            <div className="sim-haut">
              <span className={`sim-score ${s.score >= THRESHOLD_IDENTICAL ? 'identique' : ''}`}>
                {Math.round(s.score * 100)} % — {etiquette(s.score)}
              </span>
              <span
                className="sim-theme"
                style={{
                  background: s.question.themeColor || '#8b5cf6',
                }}
              >
                {s.question.themeName}
              </span>
            </div>
            <div className="sim-texte">« {s.question.q} »</div>
            <div className="barre-sim">
              <div
                className="barre-sim-rempli"
                style={{
                  width: `${Math.round(s.score * 100)}%`,
                  background: s.score >= THRESHOLD_IDENTICAL ? '#ff5d73' : '#ffb020',
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="alerte-texte">
        Tu es sûr de vouloir ajouter cette question malgré les ressemblances ?
      </p>
      <div className="alerte-actions">
        <button className="btn-principal" onClick={onAdd}>
          Oui, ajouter quand même
        </button>
        <button className="btn-secondaire" onClick={onCancel}>
          Modifier ma question
        </button>
      </div>
    </div>
  );
}
