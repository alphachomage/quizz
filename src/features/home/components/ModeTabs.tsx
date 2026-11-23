// ModesTabs.tsx — les 4 onglets de mode (description : ModeDescription.tsx).
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import type { GameMode } from '@lib/types.js';
import type { HomeState } from '../useHome.js';

// Onglet de mode : `badge` = pastille « à venir », `streak` = pastille série de jours.
interface ModeTab {
  id: GameMode;
  icone: string;
  nom: string;
  badge?: string;
  streak?: boolean;
}

const MODES: ModeTab[] = [
  { id: 'solo', icone: 'timer', nom: 'Solo' },
  { id: 'duel', icone: 'swords', nom: 'Duel en ligne', badge: 'à venir' },
  { id: 'survie', icone: 'skull', nom: 'Survie' },
  { id: 'quotidien', icone: 'calendar', nom: 'Quizz du jour', streak: true },
];

interface ModeTabsProps {
  a: HomeState;
}

export default function ModeTabs({ a }: ModeTabsProps): ReactElement {
  const { mode, setMode, dailyStreak } = a;
  return (
    <section className="modes-tabs">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={mode === m.id ? 'mode-tab actif' : 'mode-tab'}
          disabled={m.id === 'duel'} // duel local verrouillé : le mode en ligne arrive plus tard
          title={
            m.id === 'duel'
              ? 'Mode en ligne à venir — le duel local est désactivé pour l’instant'
              : undefined
          }
          onClick={() => setMode(m.id)}
        >
          <Icon nom={m.icone} taille={30} />
          <span>{m.nom}</span>
          {m.badge && <span className="tab-badge">{m.badge}</span>}
          {m.streak && dailyStreak > 0 && (
            <span
              className="tab-streak"
              title={`Série de ${dailyStreak} jour${dailyStreak > 1 ? 's' : ''} consécutifs sur le quizz du jour`}
            >
              <Icon nom="bolt" taille={12} /> ×{dailyStreak}
            </span>
          )}
        </button>
      ))}
    </section>
  );
}
