// SectionProposees.jsx — vue admin : questions proposées par les joueurs, en attente de
// validation manuelle (elles deviennent jouables au clic sur valider).
import Icone from '@shared/ui/Icone.jsx';
import { nomNiveau } from '@lib/index.js';

export default function SectionProposees({ soumissions, nbValidees, nomTheme, onValider, onSupprimer, onExporterValidees }) {
  return (
    <>
      <h2 className="titre-section" style={{ marginTop: 28 }}>
        Questions proposées <span className="badge-compte">{soumissions.length} en attente</span>
        {nbValidees > 0 && <span className="badge-compte valide">{nbValidees} validée(s)</span>}
      </h2>
      <p className="vide">
        Les joueurs proposent des questions via « Proposer une question » : elles arrivent ICI, jamais dans
        l'interface de jeu. La détection de doublons a déjà eu lieu à la saisie. Valide avec{' '}
        <Icone nom="check" taille={13} /> pour rendre la question jouable (elle disparaît alors de cette liste).
      </p>
      {soumissions.length === 0 ? (
        <p className="vide">Aucune proposition en attente.</p>
      ) : (
        <ul className="liste-propositions">
          {soumissions.map((s) => (
            <li key={s.id}>
              <div className="prop-corps">
                <strong>{s.q}</strong>
                <span className="prop-meta">
                  {nomTheme(s.themeId)} · niveau {nomNiveau(s.niveau)} · {s.reponses.length} réponses
                  {s.info ? ` · info : ${s.info}` : ''}
                </span>
              </div>
              <button
                className="btn-valider"
                title="Valider : la question devient jouable et disparaît de cette liste"
                onClick={() => onValider(s.id)}
              >
                <Icone nom="check" taille={16} />
              </button>
              <button className="btn-suppr" title="Supprimer cette proposition" onClick={() => onSupprimer(s.id)}>
                <Icone nom="trash" taille={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {nbValidees > 0 && (
        <div className="filtres-niveau">
          <button className="filtre" onClick={onExporterValidees}>
            <Icone nom="download" taille={14} /> Exporter les {nbValidees} question(s) validée(s) en JSON
          </button>
        </div>
      )}
    </>
  );
}
