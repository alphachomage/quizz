// SectionProposees.jsx — vue admin : questions proposées par les joueurs, en attente de
// validation manuelle (elles deviennent jouables au clic sur valider).
import Icon from '@shared/ui/Icon.jsx';
import { levelName } from '@lib/scoring.js';
export default function ProposedSection({
  submissions: submissions,
  approvedCount: approvedCount,
  themeName,
  onApprove: onApprove,
  onDelete: onDelete,
  onExportApproved: onExportApproved,
}) {
  return (
    <>
      <h2
        className="titre-section"
        style={{
          marginTop: 28,
        }}
      >
        Questions proposées <span className="badge-compte">{submissions.length} en attente</span>
        {approvedCount > 0 && (
          <span className="badge-compte valide">{approvedCount} validée(s)</span>
        )}
      </h2>
      <p className="vide">
        Les joueurs proposent des questions via « Proposer une question » : elles arrivent ICI,
        jamais dans l'interface de jeu. La détection de doublons a déjà eu lieu à la saisie. Valide
        avec <Icon nom="check" taille={13} /> pour rendre la question jouable (elle disparaît alors
        de cette liste).
      </p>
      {submissions.length === 0 ? (
        <p className="vide">Aucune proposition en attente.</p>
      ) : (
        <ul className="liste-propositions">
          {submissions.map((s) => (
            <li key={s.id}>
              <div className="prop-corps">
                <strong>{s.q}</strong>
                <span className="prop-meta">
                  {themeName(s.themeId)} · niveau {levelName(s.niveau)} · {s.reponses.length}{' '}
                  réponses
                  {s.info ? ` · info : ${s.info}` : ''}
                </span>
              </div>
              <button
                className="btn-valider"
                title="Valider : la question devient jouable et disparaît de cette liste"
                onClick={() => onApprove(s.id)}
              >
                <Icon nom="check" taille={16} />
              </button>
              <button
                className="btn-suppr"
                title="Supprimer cette proposition"
                onClick={() => onDelete(s.id)}
              >
                <Icon nom="trash" taille={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {approvedCount > 0 && (
        <div className="filtres-niveau">
          <button className="filtre" onClick={onExportApproved}>
            <Icon nom="download" taille={14} /> Exporter les {approvedCount} question(s) validée(s)
            en JSON
          </button>
        </div>
      )}
    </>
  );
}
