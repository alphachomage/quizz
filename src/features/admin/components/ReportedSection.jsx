// SectionSignalees.jsx — vue admin : questions signalées par les joueurs (pouce rouge),
// triées par nombre de signalements, avec vérification manuelle Garder / Retirer du pool.
import Icon from '@shared/ui/Icon.jsx';
export default function ReportedSection({
  list,
  onVerify: onVerify,
  onRemove: onRemove,
  onExport: onExport,
  onClearAll: onClearAll,
}) {
  return (
    <>
      <h2 className="titre-section">
        Questions signalées <span className="badge-compte">{list.length}</span>
      </h2>
      <p className="vide">
        Questions signalées par les joueurs (pouce rouge sous une question — JAMAIS visible côté
        joueur), triées par nombre de signalements. Vérifie chaque question :{' '}
        <strong>Garder</strong> = elle reste dans le pool, <strong>Retirer du pool</strong> = elle
        en est exclue définitivement (les fichiers source ne sont pas modifiés ; le retrait prend
        effet au rechargement de l'app).
      </p>
      <div className="filtres-niveau">
        <button className="filtre" onClick={onExport}>
          <Icon nom="download" taille={14} /> Exporter en JSON
        </button>
        {list.length > 0 && (
          <button className="filtre" onClick={onClearAll}>
            <Icon nom="trash" taille={14} /> Tout supprimer
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="vide">Aucun signalement pour l'instant.</p>
      ) : (
        <ul className="liste-propositions">
          {list.map((s) => (
            <li key={s.id}>
              <span
                className="badge-compte"
                style={{
                  background:
                    (s.count || 1) >= 3 ? 'rgba(255,93,115,0.25)' : 'rgba(255,255,255,0.1)',
                  color: (s.count || 1) >= 3 ? '#ff8fa3' : 'inherit',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 999,
                  marginRight: 10,
                  whiteSpace: 'nowrap',
                }}
              >
                ×{s.count || 1}
              </span>
              <div className="prop-corps">
                <strong>{s.q}</strong>
                <span className="prop-meta">
                  {s.themeName || s.themeId} · {new Date(s.last || s.date).toLocaleString('fr-FR')}
                  {s.statut === 'garder' && ' · vérifiée : conservée dans le pool'}
                  {s.statut === 'retirer' && ' · vérifiée : retirée du pool'}
                </span>
              </div>
              {!s.statut && (
                <>
                  <button
                    className="filtre"
                    style={{
                      color: '#16a34a',
                      borderColor: 'rgba(22,163,74,0.5)',
                    }}
                    title="La question est bonne : elle reste dans le pool"
                    onClick={() => onVerify(s, 'garder')}
                  >
                    <Icon nom="check" taille={14} /> Garder
                  </button>
                  <button
                    className="filtre"
                    style={{
                      color: '#ff8fa3',
                      borderColor: 'rgba(255,93,115,0.5)',
                    }}
                    title="La question est mauvaise/ambigüe : elle est retirée du pool (au rechargement)"
                    onClick={() => onVerify(s, 'retirer')}
                  >
                    <Icon nom="trash" taille={14} /> Retirer du pool
                  </button>
                </>
              )}
              {s.statut && (
                <button
                  className="btn-suppr"
                  title="Supprimer ce signalement"
                  onClick={() => onRemove(s.q)}
                >
                  <Icon nom="trash" taille={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
