// AlerteSimilarite.jsx — bloc affiché à la soumission quand des questions existantes
// sont similaires (détection floue locale, index pré-calculé).
import Icon from '@shared/ui/Icon.jsx';
import { THRESHOLD_IDENTICAL } from '@lib/similarity.js';

function etiquette(score) {
  return score >= THRESHOLD_IDENTICAL ? 'quasi identique' : 'similaire';
}

export default function SimilarityAlert({ avertissement, onAjouter, onAnnuler }) {
  return (
    <div className="alerte">
      <h3><Icon nom="alert" taille={20} /> {avertissement.length} question(s) similaire(s) trouvée(s)</h3>
      <ul className="liste-similaires">
        {avertissement.map((s, i) => (
          <li key={i} className="sim-item">
            <div className="sim-haut">
              <span className={`sim-score ${s.score >= THRESHOLD_IDENTICAL ? 'identique' : ''}`}>
                {Math.round(s.score * 100)} % — {etiquette(s.score)}
              </span>
              <span className="sim-theme" style={{ background: s.question.themeCouleur || '#8b5cf6' }}>
                {s.question.themeNom}
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
      <p className="alerte-texte">Tu es sûr de vouloir ajouter cette question malgré les ressemblances ?</p>
      <div className="alerte-actions">
        <button className="btn-principal" onClick={onAjouter}>Oui, ajouter quand même</button>
        <button className="btn-secondaire" onClick={onAnnuler}>Modifier ma question</button>
      </div>
    </div>
  );
}
