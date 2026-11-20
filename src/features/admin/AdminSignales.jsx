import { useMemo, useState } from 'react';

import Icone from '@shared/ui/Icone.jsx';

import {
  chargerSignales,
  supprimerSignalement,
  viderSignales,
  marquerSignalement,
  chargerSuggestions,
  supprimerSuggestion,
} from '@lib/index.js';

import SectionThemes from './composants/SectionThemes.jsx';
import SectionSignalees from './composants/SectionSignalees.jsx';
import SectionProposees from './composants/SectionProposees.jsx';
import SectionSuggestions from './composants/SectionSuggestions.jsx';

// Vue ADMIN (questions signalées + questions proposées en attente de validation).
// Accessible uniquement via l'URL : http://127.0.0.1:5173/?admin=1
// RIEN de tout ça n'est visible dans l'interface joueur.
// Coquille : l'état vit ici, les 4 sections sont des composants dans ./composants/.

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

        <SectionThemes themes={themes} />

        <SectionSignalees
          liste={liste}
          onVerifier={verifier}
          onRetirer={retirer}
          onExporter={exporter}
          onToutVider={toutVider}
        />

        <SectionProposees
          soumissions={soumissions}
          nbValidees={nbValidees}
          nomTheme={nomTheme}
          onValider={onValiderSoumission}
          onSupprimer={onSupprimerSoumission}
          onExporterValidees={onExporterValidees}
        />

        <SectionSuggestions suggestions={suggestions} onSupprimer={retirerSuggestion} />
      </div>
    </div>
  );
}
