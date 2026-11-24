// ActionsCard.tsx — carte "Actions" du tableau de bord admin : actions globales qui
// rechargent la page avec un flag d'URL (?reset=1, ?resetcompte=1, ?stockage=local).
// La navigation passe par app/urlFlags.js (R5 : jamais window.location en direct).
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { redirigerVers, urlWithParam, urlWithoutParam } from '@app/urlFlags.js';
import type { StorageMode } from '@lib/storage.js';
import MetricCard from './MetricCard.jsx';

interface ActionsCardProps {
  mode: StorageMode;
}

export default function ActionsCard({ mode }: ActionsCardProps): ReactElement {
  function resetScores(): void {
    if (window.confirm('Remettre à zéro scores, records, historique et XP (?reset=1) ?')) {
      redirigerVers(urlWithParam('reset', '1'));
    }
  }
  function resetAccountFlag(): void {
    if (
      window.confirm(
        'Reset COMPLET de la progression (?resetcompte=1) : scores + streak + badges + titres ?'
      )
    ) {
      redirigerVers(urlWithParam('resetcompte', '1'));
    }
  }
  function basculerStockage(): void {
    if (mode === 'd1') {
      if (window.confirm('Passer en stockage 100 % local hors-ligne (?stockage=local) ?')) {
        redirigerVers(urlWithParam('stockage', 'local'));
      }
    } else if (window.confirm('Revenir au stockage D1 (synchro serveur via /api/kv, défaut) ?')) {
      redirigerVers(urlWithoutParam('stockage'));
    }
  }
  return (
    <MetricCard
      icone="sliders"
      title="Actions"
      value=""
      sous="rechargent la page avec un flag d'URL"
    >
      <div className="metric-actions">
        <button className="filtre" onClick={resetScores}>
          <Icon nom="replay" taille={14} /> Remettre les scores à zéro (?reset=1)
        </button>
        <button className="filtre" onClick={resetAccountFlag}>
          <Icon nom="trash" taille={14} /> Reset compte complet (?resetcompte=1)
        </button>
        <button className="filtre" onClick={basculerStockage}>
          <Icon nom="device" taille={14} />{' '}
          {mode === 'd1' ? 'Forcer le stockage local (?stockage=local)' : 'Revenir à D1 (défaut)'}
        </button>
      </div>
    </MetricCard>
  );
}
