// Tests des calculs de l'écran Stats (src/features/stats/statsCompute.ts) — fonctions pures.
import { describe, expect, it } from 'vitest';
import {
  computeStats,
  computeCalendar,
  computeAvgTime,
  computeGlobalXp,
  sortThemesByXp,
} from '@/features/stats/statsCompute.js';
import type { CalendarDay, DetailWithTime, StatsGame } from '@/features/stats/statsCompute.js';
import type { Theme } from '@lib/types.js';

// Fabrique une partie de test au format de l'historique local (voltquiz_parties).
// Les détails factices n'ont pas tous les champs de GameDetail : cast global.
function game(over: Partial<StatsGame> = {}): StatsGame {
  return {
    mode: 'solo',
    niveau: 'moyen',
    themeId: 'histoire',
    themeName: 'Histoire',
    total: 10,
    date: '2026-11-20T12:00:00.000Z',
    players: [
      {
        nom: 'Joris',
        score: 150,
        bonnes: 8,
      },
    ],
    details: Array.from(
      {
        length: 10,
      },
      (_, i) => ({
        themeId: 'histoire',
        themeName: 'Histoire',
        niveau: 'moyen',
        correct: i < 8,
        secondes: 4 + i * 0.5,
      })
    ),
    ...over,
  } as unknown as StatsGame;
}
describe('calculerStats', () => {
  it('calcule le bilan global (parties, répondues, bonnes, pct, points)', () => {
    const s = computeStats([
      game(),
      game({
        players: [
          {
            nom: 'Joris',
            score: 100,
            bonnes: 5,
          },
        ],
        total: 10,
      }),
    ]);
    expect(s.games).toBe(2);
    expect(s.repondues).toBe(20);
    expect(s.bonnes).toBe(13);
    expect(s.pct).toBe(65);
    expect(s.points).toBe(250);
  });
  it('compte par mode avec le meilleur score', () => {
    const s = computeStats([
      game(),
      game({
        mode: 'rogue',
        niveau: 'mix',
        players: [
          {
            nom: 'J',
            score: 40,
            bonnes: 4,
          },
        ],
      }),
    ]);
    expect(s.perMode.solo).toEqual({
      games: 1,
      best: 150,
    });
    expect(s.perMode.rogue).toEqual({
      games: 1,
      best: 40,
    });
  });
  it('calcule le % par thème et par niveau depuis les détails', () => {
    const s = computeStats([game()]);
    expect(s.parThemeListe[0]).toMatchObject({
      id: 'histoire',
      jouées: 10,
      correctes: 8,
      pct: 80,
    });
    expect(s.parNiveauListe[0]).toMatchObject({
      id: 'moyen',
      jouées: 10,
      correctes: 8,
      pct: 80,
    });
  });
  it('ignore le quizz du jour dans les stats par niveau (niveau = date)', () => {
    const s = computeStats([
      game({
        mode: 'quotidien',
        niveau: '2026-11-20',
        details: undefined,
      }),
    ]);
    expect(s.parNiveauListe).toHaveLength(0);
    expect(s.perMode.quotidien.games).toBe(1);
  });
  it('repli sans détails : utilise total x joueurs et les bonnes des joueurs', () => {
    const p = game({
      details: undefined,
      total: 10,
      players: [
        {
          nom: 'A',
          score: 90,
          bonnes: 6,
        },
        {
          nom: 'B',
          score: 70,
          bonnes: 5,
        },
      ],
    });
    const s = computeStats([p]);
    expect(s.repondues).toBe(20); // 10 questions x 2 joueurs
    expect(s.bonnes).toBe(11);
    expect(s.parThemeListe[0].jouées).toBe(20);
    expect(s.parThemeListe[0].correctes).toBe(11);
  });
  it('historique vide = zéros, pas de division par zéro', () => {
    const s = computeStats([]);
    expect(s).toMatchObject({
      games: 0,
      repondues: 0,
      bonnes: 0,
      pct: 0,
      points: 0,
    });
    expect(s.parThemeListe).toHaveLength(0);
  });
});
describe('calculerCalendrier', () => {
  it('grille du mois en cours : semaines de 7, lundi en colonne 0, jours futurs marqués', () => {
    const now = new Date(2026, 10, 20); // 20 nov 2026
    const c = computeCalendar(
      [
        game({
          date: '2026-11-20T10:00:00',
        }),
      ],
      now
    );
    expect(c.last30Days).toHaveLength(30);
    const auj = c.last30Days[c.last30Days.length - 1];
    expect(auj.key).toBe('2026-11-20');
    expect(auj.games).toBe(1);
    expect(auj.points).toBe(150);
    // Toutes les semaines sont pleines (7) sauf éventuellement la dernière
    for (const s of c.weeks.slice(0, -1)) expect(s).toHaveLength(7);
    expect(c.weeks[c.weeks.length - 1].length).toBeLessThanOrEqual(7);
    const totalCases = c.weeks.flat().filter(Boolean).length;
    expect(totalCases).toBe(30); // novembre 2026 a 30 jours
    expect(c.maxPoints).toBe(150);
    expect(c.monthName).toContain('2026');
  });
  it('niveau de remplissage : 0/1/2/3 selon le nombre de parties du jour', () => {
    const now = new Date(2026, 10, 20);
    const ps = [
      game({
        date: '2026-11-18T10:00:00',
      }),
      game({
        date: '2026-11-19T10:00:00',
      }),
      game({
        date: '2026-11-19T11:00:00',
      }),
      game({
        date: '2026-11-19T12:00:00',
      }),
      game({
        date: '2026-11-17T10:00:00',
      }),
      game({
        date: '2026-11-17T11:00:00',
      }),
      game({
        date: '2026-11-17T12:00:00',
      }),
      game({
        date: '2026-11-17T13:00:00',
      }),
    ];
    const c = computeCalendar(ps, now);
    const cases = c.weeks.flat().filter((x): x is CalendarDay => Boolean(x));
    const n18 = cases.find((x) => x.key === '2026-11-18')!.niveau;
    const n19 = cases.find((x) => x.key === '2026-11-19')!.niveau;
    const n17 = cases.find((x) => x.key === '2026-11-17')!.niveau;
    expect(n18).toBe(1);
    expect(n19).toBe(2);
    expect(n17).toBe(3);
    const withoutGame = cases.find((x) => x.key === '2026-11-10')!.niveau;
    expect(withoutGame).toBe(0);
  });
});
describe('calculerTempsMoyen', () => {
  it('moyenne des secondes des détails, arrondie au dixième', () => {
    // détails : secondes = 4, 4.5, …, 8.5 -> somme 62.5, moyenne 6.25 -> 6.3
    expect(computeAvgTime([game()])).toBe(6.3);
  });
  it('null sans aucune donnée de temps', () => {
    expect(
      computeAvgTime([
        game({
          details: [
            {
              themeId: 'x',
              correct: true,
            } as DetailWithTime,
          ],
        }),
      ])
    ).toBeNull();
    expect(computeAvgTime([])).toBeNull();
  });
});
describe('calculerXpGlobale / classerThemesParXp', () => {
  it('somme les XP, calcule niveau global et pourcentage', () => {
    const g = computeGlobalXp({
      a: 0,
      b: 250,
    });
    expect(g.totalXp).toBe(250);
    expect(g.nivGlobal).toBeGreaterThanOrEqual(1);
    expect(g.pctXp).toBeGreaterThanOrEqual(0);
    expect(g.pctXp).toBeLessThanOrEqual(100);
  });
  it('classe les thèmes par XP décroissante, uniquement ceux avec de l’XP', () => {
    // sortThemesByXp ne lit que id/nom : cast pour des thèmes sans questions.
    const themes = [
      {
        id: 'a',
        nom: 'A',
      },
      {
        id: 'b',
        nom: 'B',
      },
      {
        id: 'c',
        nom: 'C',
      },
    ] as unknown as Theme[];
    const list = sortThemesByXp(themes, {
      a: 10,
      b: 300,
      c: 0,
    });
    expect(list.map((t) => t.id)).toEqual(['b', 'a']);
    expect(list[0].niv).toBeGreaterThanOrEqual(1);
  });
});
