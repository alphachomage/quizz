// Tests de la persistance d'une partie terminée (features/resultat/persistance.js)
// et des stats affichées (statsPartie.js) — fonctions pures/testables hors React.
import { describe, expect, it } from 'vitest';

import { persisterResultat } from '@/features/resultat/persistance.js';
import { calculerStatsPartie, pctNiveau } from '@/features/resultat/statsPartie.js';

import { chargerParties } from '@lib/parties-historique.js';
import { chargerRecords, cleRecord } from '@lib/records.js';
import { chargerXP, niveauTheme } from '@lib/xp.js';
import { chargerStreakJour } from '@lib/streak.js';

import { PREFS_TEST } from '../../fixtures/questions.fixture.js';

const theme = { id: 'test', nom: 'Thème test', icone: 'question', couleur: '#38bdf8' };

function resultatSolo(score = 100) {
  return {
    mode: 'solo',
    niveau: 'moyen',
    theme,
    joueurs: ['testeur'],
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
    const res = persisterResultat(resultatSolo(100), false, PREFS_TEST);
    expect(res.nouveauRecord).toBe(true);
    expect(res.record).toBe(100);
    expect(chargerRecords()[cleRecord('solo', 'moyen', 'test')]).toBe(100);
    expect(chargerParties()).toHaveLength(1);
    expect(chargerParties()[0].mode).toBe('solo');
    // XP créditée au thème : 8 bonnes x 10 pts = 80 XP
    expect(chargerXP().test).toBe(80);
    expect(res.xpGlobal.gain).toBe(80);
    expect(res.xpTheme[0].themeId).toBe('test');
    expect(res.xpTheme[0].nivAvant).toBe(1);
    expect(niveauTheme(res.xpTheme[0].gain)).toBe(1);
  });

  it('ne bat pas un record existant (recordAvant conservé)', () => {
    persisterResultat(resultatSolo(100), false, PREFS_TEST);
    const res = persisterResultat(resultatSolo(50), false, PREFS_TEST);
    expect(res.nouveauRecord).toBe(false);
    expect(res.recordAvant).toBe(100);
    expect(res.record).toBe(100); // le record reste 100
  });

  it('calcule le rang au classement du mode', () => {
    persisterResultat(resultatSolo(100), false, PREFS_TEST);
    const res = persisterResultat(resultatSolo(50), false, PREFS_TEST);
    expect(res.rang).toBe(2); // un score (100) est strictement meilleur que 50
  });

  it('mode invité : aucun historique ni XP, mais le record local est conservé', () => {
    const res = persisterResultat(resultatSolo(120), true, PREFS_TEST);
    expect(chargerParties()).toHaveLength(0);
    expect(chargerXP()).toEqual({});
    expect(res.xpGlobal.gain).toBe(0);
    expect(res.rang).toBe(null);
    expect(chargerRecords()[cleRecord('solo', 'moyen', 'test')]).toBe(120);
  });

  it('quotidien : enregistre la série de jours', () => {
    const res = persisterResultat({ ...resultatSolo(80), mode: 'quotidien', niveau: '2026-05-05' }, false, PREFS_TEST);
    expect(res.streakJour).toBe(1);
    expect(chargerStreakJour().compte).toBe(1);
  });
});

describe('calculerStatsPartie', () => {
  it('calcule le temps moyen et la meilleure série', () => {
    const s = calculerStatsPartie([
      { secondes: 2, streak: 1 },
      { secondes: 4, streak: 2 },
      { secondes: 3, streak: 3 },
    ]);
    expect(s.tempsMoyen).toBe(3);
    expect(s.meilleureSerie).toBe(3);
  });

  it('renvoie null si aucune durée enregistrée', () => {
    expect(calculerStatsPartie([]).tempsMoyen).toBe(null);
    expect(calculerStatsPartie(null).meilleureSerie).toBe(0);
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
