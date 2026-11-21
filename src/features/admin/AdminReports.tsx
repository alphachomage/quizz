import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { loadReports, removeReport, clearReports, markReport } from '@lib/reports.js';
import type { ReportStatut, StoredReport } from '@lib/reports.js';
import { loadSuggestions, removeSuggestion } from '@lib/suggestions.js';
import type { StoredSuggestion } from '@lib/suggestions.js';
import type { Submission, Theme } from '@lib/types.js';
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

interface AdminReportsProps {
  onQuit: () => void;
  themes: Theme[] | null;
  submissions: Submission[];
  approvedCount: number;
  onApproveSubmission: (id: string) => void;
  onDeleteSubmission: (id: string) => void;
  onExportApproved: () => void;
}

export default function AdminReports({
  onQuit,
  themes,
  submissions,
  approvedCount,
  onApproveSubmission,
  onDeleteSubmission,
  onExportApproved,
}: AdminReportsProps): ReactElement {
  const [signales, setSignales] = useState<StoredReport[]>(() => loadReports());
  const [suggestions, setSuggestions] = useState<StoredSuggestion[]>(() => loadSuggestions());
  function removeSuggestionN(id: string): void {
    removeSuggestion(id);
    setSuggestions(loadSuggestions());
  }
  const list = useMemo(
    () => [...signales].sort((a, b) => (b.count || 1) - (a.count || 1)),
    [signales]
  );
  function themeName(id: string): string | undefined {
    const t = themes?.find((x) => x.id === id);
    return t ? t.nom : id;
  }
  function remove(q: string): void {
    removeReport(q);
    setSignales(loadReports());
  }

  // Vérification manuelle d'une question signalée :
  // 'garder' = la question est bonne, elle RESTE dans le pool ; 'retirer' = elle en est exclue.
  function verify(s: StoredReport, statut: ReportStatut): void {
    markReport(s.q, statut);
    setSignales(loadReports());
  }
  function clearAll(): void {
    if (window.confirm('Supprimer TOUS les signalements ?')) {
      clearReports();
      setSignales([]);
    }
  }
  function exportFn(): void {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            signales: list,
          },
          null,
          2
        ),
      ],
      {
        type: 'application/json',
      }
    );
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
          <h2>
            <Icon nom="thumbsdown" taille={24} /> Admin
          </h2>
          <button className="btn-secondaire" onClick={onQuit}>
            <Icon nom="home" taille={18} /> Retour à l'appli
          </button>
        </div>

        <p className="vide">
          Cette page n'est accessible que via <code>?admin=1</code> — elle n'apparaît nulle part
          dans le jeu.
        </p>

        <AdminDashboard themes={themes} />

        <ThemesSection themes={themes} />

        <ReportedSection
          list={list}
          onVerify={verify}
          onRemove={remove}
          onExport={exportFn}
          onClearAll={clearAll}
        />

        <ProposedSection
          submissions={submissions}
          approvedCount={approvedCount}
          themeName={themeName}
          onApprove={onApproveSubmission}
          onDelete={onDeleteSubmission}
          onExportApproved={onExportApproved}
        />

        <SuggestionsSection suggestions={suggestions} onDelete={removeSuggestionN} />
      </div>
    </div>
  );
}
