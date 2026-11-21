import { useMemo } from 'react';

import Icon from '@shared/ui/Icon.jsx';

import { loadGames } from '@lib/game-history.js';
import { loadXp } from '@lib/xp.js';

import {
  computeStats,
  computeCalendar,
  computeAvgTime,
  computeGlobalXp,
  sortThemesByXp,
} from './statsCompute.js';
import StatCards from './components/StatCards.jsx';
import MonthCalendar from './components/MonthCalendar.jsx';
import Last30Days from './components/Last30Days.jsx';
import XpProgress from './components/XpProgress.jsx';
import StatLists from './components/StatLists.jsx';

// Écran « Mes statistiques » : coquille de rendu — tous les calculs sont dans
// statsCalculs.js (fonctions pures), la mise en page dans ./composants/.

const MODES = [
  { id: 'solo', nom: 'Solo', icone: 'timer' },
  { id: 'duel', nom: 'Duel 1v1', icone: 'swords' },
  { id: 'survie', nom: 'Survie', icone: 'skull' },
  { id: 'quotidien', nom: 'Quizz du jour', icone: 'calendar' },
];

export default function Stats({ themes, pseudo, onAccueil }) {
  const games = useMemo(() => loadGames(), []);
  const xp = useMemo(() => loadXp(), []);

  const stats = useMemo(() => computeStats(games), [games]);
  const calendar = useMemo(() => computeCalendar(games), [games]);
  const avgTime = useMemo(() => computeAvgTime(games), [games]);
  const { totalXp, nivGlobal, xpNext, pctXp } = useMemo(() => computeGlobalXp(xp), [xp]);
  const themedLevels = useMemo(() => sortThemesByXp(themes, xp), [themes, xp]);

  return (
    <div className="ecran-centre stats-ecran">
      <div className="stats">
        <div className="stats-titre">
          <h2><Icon nom="chart" taille={24} /> Mes statistiques — {pseudo}</h2>
          <button className="btn-secondaire" onClick={onAccueil}>
            <Icon nom="home" taille={18} /> Accueil
          </button>
        </div>

        <StatCards stats={stats} avgTime={avgTime} />
        <MonthCalendar calendar={calendar} />
        <Last30Days calendar={calendar} />
        <XpProgress totalXp={totalXp} nivGlobal={nivGlobal} xpNext={xpNext} pctXp={pctXp} themedLevels={themedLevels} />
        <StatLists stats={stats} modes={MODES} />

        {stats.games === 0 && (
          <p className="vide">Aucune partie pour le moment — lance un quiz depuis l'accueil et tes stats apparaîtront ici.</p>
        )}
      </div>
    </div>
  );
}
