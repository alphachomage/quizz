import { useMemo } from 'react';

import Icone from '@shared/ui/Icone.jsx';

import { chargerParties, chargerXP } from '@lib/index.js';

import {
  calculerStats,
  calculerCalendrier,
  calculerTempsMoyen,
  calculerXpGlobale,
  classerThemesParXp,
} from './statsCalculs.js';
import CartesStats from './composants/CartesStats.jsx';
import CalendrierMois from './composants/CalendrierMois.jsx';
import Barres30j from './composants/Barres30j.jsx';
import ProgressionXp from './composants/ProgressionXp.jsx';
import ListesStats from './composants/ListesStats.jsx';

// Écran « Mes statistiques » : coquille de rendu — tous les calculs sont dans
// statsCalculs.js (fonctions pures), la mise en page dans ./composants/.

const MODES = [
  { id: 'solo', nom: 'Solo', icone: 'timer' },
  { id: 'duel', nom: 'Duel 1v1', icone: 'swords' },
  { id: 'survie', nom: 'Survie', icone: 'skull' },
  { id: 'quotidien', nom: 'Quizz du jour', icone: 'calendar' },
];

export default function Stats({ themes, pseudo, onAccueil }) {
  const parties = useMemo(() => chargerParties(), []);
  const xp = useMemo(() => chargerXP(), []);

  const stats = useMemo(() => calculerStats(parties), [parties]);
  const calendrier = useMemo(() => calculerCalendrier(parties), [parties]);
  const tempsMoyen = useMemo(() => calculerTempsMoyen(parties), [parties]);
  const { xpTotal, nivGlobal, xpNext, pctXp } = useMemo(() => calculerXpGlobale(xp), [xp]);
  const themesNives = useMemo(() => classerThemesParXp(themes, xp), [themes, xp]);

  return (
    <div className="ecran-centre stats-ecran">
      <div className="stats">
        <div className="stats-titre">
          <h2><Icone nom="chart" taille={24} /> Mes statistiques — {pseudo}</h2>
          <button className="btn-secondaire" onClick={onAccueil}>
            <Icone nom="home" taille={18} /> Accueil
          </button>
        </div>

        <CartesStats stats={stats} tempsMoyen={tempsMoyen} />
        <CalendrierMois calendrier={calendrier} />
        <Barres30j calendrier={calendrier} />
        <ProgressionXp xpTotal={xpTotal} nivGlobal={nivGlobal} xpNext={xpNext} pctXp={pctXp} themesNives={themesNives} />
        <ListesStats stats={stats} modes={MODES} />

        {stats.parties === 0 && (
          <p className="vide">Aucune partie pour le moment — lance un quiz depuis l'accueil et tes stats apparaîtront ici.</p>
        )}
      </div>
    </div>
  );
}
