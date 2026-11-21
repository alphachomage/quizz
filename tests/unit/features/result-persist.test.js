// Tests de la persistance d'une partie terminée (features/resultat/persistance.js)
// et des stats affichées (statsPartie.js) — fonctions pures/testables hors React.
import { describe, expect, it } from 'vitest';

import { persistResult } from '@/features/results/persist.js';
import { computeGameStats, pctNiveau } from '@/features/results/gameStats.js';

import { loadGames } from '@lib/game-history.js';
import { loadRecords, recordKey } from '@lib/records.js';
import { loadXp, themeLevel } from '@lib/xp.js';
import { loadDailyStreak } from '@lib/streak.js';

import { TEST_PREFS } from '../../fixtures/questions.fixture.js';

const theme = { id: 'test', nom: 'Thème test', icone: 'question', couleur: '#38bdf8' };

function soloResult(score = 100) {
  return {
    mode: 'solo',
    niveau: 'moyen',
    theme,
    players: ['testeur'],
    scores: [score],
    bonnes: [8],
    total: 10,
    details: Array.from({ length: 10 }, (_, i) => ({
      themeId: 'test', themeNom: 'Thème test', niveau: 'moyen',
      correct: i < 8, gain: i < 8 ? 10 : 0, streak: i + 1, bonusStreak: i, secondes: 2.5,
    })),
  };
}

describe('persisterResultat', () => {
  it('enregistre le record, l\'historique et l\'XP du thème', () => {
    const res = persistResult(soloResult(100), false, TEST_PREFS);
    expect(res.nouveauRecord).toBe(true);
    expect(res.record).toBe(100);
    expect(loadRecords()[recordKey('solo', 'moyen', 'test')]).toBe(100);
    expect(loadGames()).toHaveLength(1);
    expect(loadGames()[0].mode).toBe('solo');
    // XP créditée au thème : 8 bonnes x 10 pts = 80 XP
    expect(loadXp().test).toBe(80);
    expect(res.globalXp.gain).toBe(80);
    expect(res.themeXp[0].themeId).toBe('test');
    expect(res.themeXp[0].nivAvant).toBe(1);
    expect(themeLevel(res.themeXp[0].gain)).toBe(1);
  });

  it('ne bat pas un record existant (recordAvant conservé)', () => {
    persistResult(soloResult(100), false, TEST_PREFS);
    const res = persistResult(soloResult(50), false, TEST_PREFS);
    expect(res.nouveauRecord).toBe(false);
    expect(res.recordAvant).toBe(100);
    expect(res.record).toBe(100); // le record reste 100
  });

  it('calcule le rang au classement du mode', () => {
    persistResult(soloResult(100), false, TEST_PREFS);
    const res = persistResult(soloResult(50), false, TEST_PREFS);
    expect(res.rang).toBe(2); // un score (100) est strictement meilleur que 50
  });

  it('mode invité : aucun historique ni XP, mais le record local est conservé', () => {
    const res = persistResult(soloResult(120), true, TEST_PREFS);
    expect(loadGames()).toHaveLength(0);
    expect(loadXp()).toEqual({});
    expect(res.globalXp.gain).toBe(0);
    expect(res.rang).toBe(null);
    expect(loadRecords()[recordKey('solo', 'moyen', 'test')]).toBe(120);
  });

  it('quotidien : enregistre la série de jours', () => {
    const res = persistResult({ ...soloResult(80), mode: 'quotidien', niveau: '2026-05-05' }, false, TEST_PREFS);
    expect(res.dailyStreak).toBe(1);
    expect(loadDailyStreak().account).toBe(1);
  });
});

describe('calculerStatsPartie', () => {
  it('calcule le temps moyen et la meilleure série', () => {
    const s = computeGameStats([
      { secondes: 2, streak: 1 },
      { secondes: 4, streak: 2 },
      { secondes: 3, streak: 3 },
    ]);
    expect(s.avgTime).toBe(3);
    expect(s.meilleureSerie).toBe(3);
  });

  it('renvoie null si aucune durée enregistrée', () => {
    expect(computeGameStats([]).avgTime).toBe(null);
    expect(computeGameStats(null).meilleureSerie).toBe(0);
  });
});

describe('pctNiveau', () => {
  it('vaut 0 au début du niveau 1 et progresse dans le niveau', () => {
    expect(pctNiveau(0)).toBe(0);
    expect(pctNiveau(50)).toBe(50); // niveau 1 : 0 -> 100 XP
    expect(pctNiveau(100)).toBe(0); // début du niveau 2
    expect(pctNiveau(400)).toBe(0); // début du niveau 3
  });
});
