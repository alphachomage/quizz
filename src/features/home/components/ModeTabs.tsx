// ModesTabs.tsx — les 4 grandes tuiles de mode de l'accueil (gros picto, nom dessous).
// Un clic ouvre la popin du mode : choix du thème (Solo) ou confirmation (Survie, Quizz du jour).
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import type { GameMode } from '@lib/types.js';
import type { HomeState } from '../useHome.js';

// Tuile de mode : `badge` = pastille « à venir », `streak` = pastille série de jours.
interface ModeTile {
  id: GameMode;
  icone: string;
  nom: string;
  badge?: string;
  streak?: boolean;
}

const MODES: ModeTile[] = [
  { id: 'solo', icone: 'timer', nom: 'Solo' },
  { id: 'duel', icone: 'swords', nom: 'Duel en ligne', badge: 'à venir' },
  { id: 'survie', icone: 'skull', nom: 'Survie' },
  { id: 'quotidien', icone: 'calendar', nom: 'Quizz du jour', streak: true },
];

interface ModeTabsProps {
  a: HomeState;
}

export default function ModeTabs({ a }: ModeTabsProps): ReactElement {
  const { dailyStreak, openMode } = a;
  return (
    <nav className="modes-tabs" aria-label="Modes de jeu">
      {MODES.map((m) => (
        <button
          key={m.id}
          className="mode-tab"
          disabled={m.id === 'duel'} // le duel en ligne arrive plus tard
          title={m.id === 'duel' ? 'Mode en ligne à venir' : undefined}
          onClick={() => openMode(m.id)}
        >
          <Icon nom={m.icone} taille={48} />
          <span className="mode-tab-nom">{m.nom}</span>
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
    </nav>
  );
}
