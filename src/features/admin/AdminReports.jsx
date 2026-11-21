import { useMemo, useState } from 'react';

import Icon from '@shared/ui/Icon.jsx';

import {
  loadReports,
  removeReport,
  clearReports,
  markReport,
  loadSuggestions,
  removeSuggestion,
} from '@lib/index.js';

import AdminDashboard from './AdminDashboard.jsx';
import ThemesSection from './components/ThemesSection.jsx';
import ReportedSection from './components/ReportedSection.jsx';
import ProposedSection from './components/ProposedSection.jsx';
import SuggestionsSection from './components/SuggestionsSection.jsx';

// Vue ADMIN (?admin=1) : tableau de bord global en haut (AdminDashboard), puis les
// sections de modération (signalements, propositions, suggestions, thèmes).
// Accessible uniquement via l'URL : http://127.0.0.1:5173/?admin=1
// RIEN de tout ça n'est visible dans l'interface joueur.
// Coquille : l'état vit ici, le dashboard + les 4 sections sont des composants séparés.

export default function AdminReports({ onQuitter, themes, soumissions, nbValidees, onValiderSoumission, onSupprimerSoumission, onExporterValidees }) {
  const [signales, setSignales] = useState(() => loadReports());
  const [suggestions, setSuggestions] = useState(() => loadSuggestions());

  function retirerSuggestion(id) {
    removeSuggestion(id);
    setSuggestions(loadSuggestions());
  }

  const list = useMemo(
    () => [...signales].sort((a, b) => (b.count || 1) - (a.count || 1)),
    [signales]
  );

  function themeName(id) {
    const t = themes.find((x) => x.id === id);
    return t ? t.nom : id;
  }

  function retirer(q) {
    removeReport(q);
    setSignales(loadReports());
  }

  // Vérification manuelle d'une question signalée :
  // 'garder' = la question est bonne, elle RESTE dans le pool ; 'retirer' = elle en est exclue.
  function verifier(s, statut) {
    markReport(s.q, statut);
    setSignales(loadReports());
  }

  function toutVider() {
    if (window.confirm('Supprimer TOUS les signalements ?')) {
      clearReports();
      setSignales([]);
    }
  }

  function exportFn() {
    const blob = new Blob([JSON.stringify({ signales: list }, null, 2)], { type: 'application/json' });
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
          <h2><Icon nom="thumbsdown" taille={24} /> Admin</h2>
          <button className="btn-secondaire" onClick={onQuitter}>
            <Icon nom="home" taille={18} /> Retour à l'appli
          </button>
        </div>

        <p className="vide">
          Cette page n'est accessible que via <code>?admin=1</code> — elle n'apparaît nulle part dans le jeu.
        </p>

        <AdminDashboard themes={themes} />

        <ThemesSection themes={themes} />

        <ReportedSection
          list={list}
          onVerifier={verifier}
          onRetirer={retirer}
          onExporter={exportFn}
          onToutVider={toutVider}
        />

        <ProposedSection
          soumissions={soumissions}
          nbValidees={nbValidees}
          themeName={themeName}
          onValider={onValiderSoumission}
          onSupprimer={onSupprimerSoumission}
          onExporterValidees={onExporterValidees}
        />

        <SuggestionsSection suggestions={suggestions} onSupprimer={retirerSuggestion} />
      </div>
    </div>
  );
}
