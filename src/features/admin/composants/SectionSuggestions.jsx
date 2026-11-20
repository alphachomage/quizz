// SectionSuggestions.jsx — vue admin : remontées des joueurs (bouton « Une suggestion ? »),
// visibles UNIQUEMENT ici, jamais dans l'interface joueur.
import Icone from '@shared/ui/Icone.jsx';

export default function SectionSuggestions({ suggestions, onSupprimer }) {
  return (
    <>
      <h2 className="titre-section" style={{ marginTop: 28 }}>
        Suggestions des joueurs <span className="badge-compte">{suggestions.length}</span>
      </h2>
      <p className="vide">
        Remontées envoyées via le bouton « Une suggestion ? » de l'accueil (idée, bug, amélioration).
        Visibles UNIQUEMENT ici, côté admin — jamais dans l'interface joueur.
      </p>
      {suggestions.length === 0 ? (
        <p className="vide">Aucune suggestion pour l'instant.</p>
      ) : (
        <ul className="liste-propositions">
          {suggestions.map((s) => (
            <li key={s.id}>
              <div className="prop-corps">
                <span className="prop-texte-suggestion">{s.texte}</span>
                <span className="prop-meta">
                  par <strong>{s.pseudo}</strong> · {new Date(s.date).toLocaleString('fr-FR')}
                </span>
              </div>
              <button className="btn-suppr" title="Supprimer cette suggestion" onClick={() => onSupprimer(s.id)}>
                <Icone nom="trash" taille={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
