import { useMemo, useState } from 'react';

import Icone from './Icone.jsx';

import { chargerSignales, supprimerSignalement, viderSignales, marquerSignalement, nomNiveau, chargerSuggestions, supprimerSuggestion } from '@lib/index.js';

// Vue ADMIN (questions signalées + questions proposées en attente de validation).
// Accessible uniquement via l'URL : http://127.0.0.1:5173/?admin=1
// RIEN de tout ça n'est visible dans l'interface joueur.

export default function AdminSignales({ onQuitter, themes, soumissions, nbValidees, onValiderSoumission, onSupprimerSoumission, onExporterValidees }) {
  const [signales, setSignales] = useState(() => chargerSignales());
  const [suggestions, setSuggestions] = useState(() => chargerSuggestions());

  function retirerSuggestion(id) {
    supprimerSuggestion(id);
    setSuggestions(chargerSuggestions());
  }

  const liste = useMemo(
    () => [...signales].sort((a, b) => (b.count || 1) - (a.count || 1)),
    [signales]
  );

  function nomTheme(id) {
    const t = themes.find((x) => x.id === id);
    return t ? t.nom : id;
  }

  function retirer(q) {
    supprimerSignalement(q);
    setSignales(chargerSignales());
  }

  // Vérification manuelle d'une question signalée :
  // 'garder' = la question est bonne, elle RESTE dans le pool ; 'retirer' = elle en est exclue.
  function verifier(s, statut) {
    marquerSignalement(s.q, statut);
    setSignales(chargerSignales());
  }

  function toutVider() {
    if (window.confirm('Supprimer TOUS les signalements ?')) {
      viderSignales();
      setSignales([]);
    }
  }

  function exporter() {
    const blob = new Blob([JSON.stringify({ signales: liste }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-signalees.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ecran-centre stats-ecran">
      <div className="stats">
        <div className="stats-titre">
          <h2><Icone nom="thumbsdown" taille={24} /> Admin</h2>
          <button className="btn-secondaire" onClick={onQuitter}>
            <Icone nom="home" taille={18} /> Retour à l'appli
          </button>
        </div>

        <p className="vide">
          Cette page n'est accessible que via <code>?admin=1</code> — elle n'apparaît nulle part dans le jeu.
        </p>

        <h2 className="titre-section">Thèmes — nombre de questions (admin)</h2>
        <ul className="stats-liste">
          {[...themes].sort((a, b) => (a.nom || a.id).localeCompare(b.nom || b.id, 'fr')).map((t) => (
            <li key={t.id} className="stats-ligne stats-ligne-col">
              <span className="stats-ligne-nom" style={{ color: t.couleur }}>
                <Icone nom={t.icone} taille={16} /> {t.nom}
              </span>
              <span className="stats-ligne-val stats-theme-nb">{t.questions.length} questions</span>
            </li>
          ))}
        </ul>

        <h2 className="titre-section">
          Questions signalées <span className="badge-compte">{liste.length}</span>
        </h2>
        <p className="vide">
          Questions signalées par les joueurs (pouce rouge sous une question — JAMAIS visible côté joueur),
          triées par nombre de signalements. Vérifie chaque question : <strong>Garder</strong> = elle reste
          dans le pool, <strong>Retirer du pool</strong> = elle en est exclue définitivement (les fichiers
          source ne sont pas modifiés ; le retrait prend effet au rechargement de l'app).
        </p>
        <div className="filtres-niveau">
          <button className="filtre" onClick={exporter}>
            <Icone nom="download" taille={14} /> Exporter en JSON
          </button>
          {liste.length > 0 && (
            <button className="filtre" onClick={toutVider}>
              <Icone nom="trash" taille={14} /> Tout supprimer
            </button>
          )}
        </div>
        {liste.length === 0 ? (
          <p className="vide">Aucun signalement pour l'instant.</p>
        ) : (
          <ul className="liste-propositions">
            {liste.map((s) => (
              <li key={s.id}>
                <span
                  className="badge-compte"
                  style={{
                    background: (s.count || 1) >= 3 ? 'rgba(255,93,115,0.25)' : 'rgba(255,255,255,0.1)',
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
                    {s.themeNom || s.themeId} · {new Date(s.dernier || s.date).toLocaleString('fr-FR')}
                    {s.statut === 'garder' && ' · vérifiée : conservée dans le pool'}
                    {s.statut === 'retirer' && ' · vérifiée : retirée du pool'}
                  </span>
                </div>
                {!s.statut && (
                  <>
                    <button
                      className="filtre"
                      style={{ color: '#16a34a', borderColor: 'rgba(22,163,74,0.5)' }}
                      title="La question est bonne : elle reste dans le pool"
                      onClick={() => verifier(s, 'garder')}
                    >
                      <Icone nom="check" taille={14} /> Garder
                    </button>
                    <button
                      className="filtre"
                      style={{ color: '#ff8fa3', borderColor: 'rgba(255,93,115,0.5)' }}
                      title="La question est mauvaise/ambigüe : elle est retirée du pool (au rechargement)"
                      onClick={() => verifier(s, 'retirer')}
                    >
                      <Icone nom="trash" taille={14} /> Retirer du pool
                    </button>
                  </>
                )}
                {s.statut && (
                  <button className="btn-suppr" title="Supprimer ce signalement" onClick={() => retirer(s.q)}>
                    <Icone nom="trash" taille={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

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
                  onClick={() => onValiderSoumission(s.id)}
                >
                  <Icone nom="check" taille={16} />
                </button>
                <button className="btn-suppr" title="Supprimer cette proposition" onClick={() => onSupprimerSoumission(s.id)}>
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
                <button className="btn-suppr" title="Supprimer cette suggestion" onClick={() => retirerSuggestion(s.id)}>
                  <Icone nom="trash" taille={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
