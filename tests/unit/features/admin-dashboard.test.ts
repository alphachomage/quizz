// Tests du tableau de bord admin (src/features/admin/dashboardCompute.ts) — fonctions
// PURES de métriques, testées depuis des fixtures (jamais le vrai stockage).
import { describe, expect, it } from 'vitest';
import {
  computeCorpus,
  computeGamesMetrics,
  computeModeration,
  computeRecordsTop,
  computeStreak,
  modeLabel,
  parseRecordKey,
  recordLabel,
} from '@/features/admin/dashboardCompute.js';
import type { StoredGame, StoredReport, StoredSuggestion } from '@/lib/repositories.js';
import type { Submission, Theme } from '@lib/types.js';

// Partie factice au format de l'historique local (voltquiz_parties).
// Champs partiels (ex. players sans score en duel) : `over` lâche + cast global.
function game(over: Record<string, unknown> = {}): StoredGame {
  return {
    mode: 'solo',
    niveau: 'moyen',
    themeId: 'histoire',
    total: 10,
    date: '2026-11-20T12:00:00.000Z',
    players: [
      {
        nom: 'Joris',
        score: 150,
        bonnes: 8,
      },
    ],
    ...over,
  } as unknown as StoredGame;
}

// Date ISO d'un jour local précis (indépendante du fuseau horaire du runner).
function localISO(year: number, month: number, day: number, hour = 10): string {
  return new Date(year, month - 1, day, hour, 0, 0).toISOString();
}
describe('computeCorpus', () => {
  it('compte les thèmes et les questions jouables', () => {
    // computeCorpus ne lit que id + questions.length : questions factices vides.
    const themes = [
      {
        id: 'a',
        questions: [{}, {}, {}],
      },
      {
        id: 'b',
        questions: [{}],
      },
      {
        id: 'c',
        questions: [],
      },
    ] as unknown as Theme[];
    expect(computeCorpus(themes)).toEqual({
      themeCount: 3,
      nbQuestions: 4,
    });
  });
  it('tolère un catalogue absent', () => {
    expect(computeCorpus(null)).toEqual({
      themeCount: 0,
      nbQuestions: 0,
    });
  });
});
describe('computeGamesMetrics', () => {
  it('10 parties -> total, % de réussite global et détail par mode', () => {
    // 8 solo (8/10 bonnes chacune) + 2 survie (5/5) = 90 répondues, 74 bonnes -> 82 %
    const games = [
      ...Array.from(
        {
          length: 8,
        },
        () => game()
      ),
      ...Array.from(
        {
          length: 2,
        },
        () =>
          game({
            mode: 'survie',
            niveau: 'mix',
            total: 5,
            players: [
              {
                nom: 'Joris',
                score: 100,
                bonnes: 5,
              },
            ],
          })
      ),
    ];
    const m = computeGamesMetrics(games);
    expect(m.total).toBe(10);
    expect(m.repondues).toBe(90);
    expect(m.bonnes).toBe(74);
    expect(m.pct).toBe(82);
    expect(m.perMode).toHaveLength(2);
    expect(m.perMode[0]).toMatchObject({
      mode: 'solo',
      games: 8,
      pct: 80,
    });
    expect(m.perMode[1]).toMatchObject({
      mode: 'survie',
      games: 2,
      pct: 100,
    });
  });
  it('compte les réponses x joueurs en duel', () => {
    const m = computeGamesMetrics([
      game({
        mode: 'duel',
        niveau: 'mix',
        total: 6,
        players: [
          {
            nom: 'A',
            bonnes: 5,
          },
          {
            nom: 'B',
            bonnes: 3,
          },
        ],
      }),
    ]);
    expect(m.repondues).toBe(12); // 6 questions x 2 joueurs
    expect(m.bonnes).toBe(8);
    expect(m.pct).toBe(67); // round(8/12*100)
  });
  it('historique vide = zéros, pas de division par zéro', () => {
    expect(computeGamesMetrics([])).toEqual({
      total: 0,
      repondues: 0,
      bonnes: 0,
      pct: 0,
      perMode: [],
    });
    expect(computeGamesMetrics(null).pct).toBe(0);
  });
});
describe('computeRecordsTop + parseRecordKey', () => {
  const records = {
    'solo:moyen:histoire': 150,
    'survie:mix:__all__': 30,
    'quotidien:mix:2026-11-20': 245,
    'solo:facile:sport': 200,
  };
  it('trie par valeur décroissante et limite au top N', () => {
    const top = computeRecordsTop(records, 5);
    expect(top.map((r) => r.value)).toEqual([245, 200, 150, 30]);
    expect(computeRecordsTop(records, 2).map((r) => r.key)).toEqual([
      'quotidien:mix:2026-11-20',
      'solo:facile:sport',
    ]);
  });
  it('décompose la clé mode:niveau:themeId', () => {
    expect(parseRecordKey('survie:mix:__all__')).toEqual({
      mode: 'survie',
      niveau: 'mix',
      themeId: '__all__',
    });
    expect(parseRecordKey('solo:moyen:histoire')).toEqual({
      mode: 'solo',
      niveau: 'moyen',
      themeId: 'histoire',
    });
  });
  it('libellé de record en français', () => {
    expect(
      recordLabel({
        mode: 'solo',
        niveau: 'moyen',
        themeId: 'histoire',
      })
    ).toBe('Solo · Moyen · histoire');
    expect(
      recordLabel({
        mode: 'survie',
        niveau: 'mix',
        themeId: '__all__',
      })
    ).toBe('Survie · __all__');
    expect(modeLabel('quotidien')).toBe('Quizz du jour');
    expect(modeLabel('inconnu')).toBe('inconnu');
  });
  it('records vide -> top vide', () => {
    expect(computeRecordsTop(null)).toEqual([]);
    expect(computeRecordsTop({})).toEqual([]);
  });
});
describe('computeModeration', () => {
  it('compte les signalements en attente et les autres compteurs', () => {
    // computeModeration ne compte que les longueurs : entrées partielles castées.
    const m = computeModeration({
      reports: [
        {
          q: 'a',
        },
        {
          q: 'b',
          statut: 'garder',
        },
        {
          q: 'c',
          statut: 'retirer',
        },
      ] as unknown as StoredReport[],
      submissions: [
        {
          id: '1',
        },
        {
          id: '2',
        },
      ] as unknown as Submission[],
      approved: [
        {
          id: '3',
        },
        {
          id: '4',
        },
        {
          id: '5',
        },
      ] as unknown as Submission[],
      suggestions: [
        {
          id: '6',
        },
      ] as unknown as StoredSuggestion[],
      excluded: ['x'],
    });
    expect(m).toEqual({
      signalementsTotal: 3,
      signalementsEnAttente: 1,
      submissions: 2,
      validees: 3,
      suggestions: 1,
      exclusions: 1,
    });
  });
  it('entrée vide ou absente = zéros', () => {
    expect(computeModeration()).toEqual({
      signalementsTotal: 0,
      signalementsEnAttente: 0,
      submissions: 0,
      validees: 0,
      suggestions: 0,
      exclusions: 0,
    });
    expect(
      computeModeration({
        reports: null,
      }).signalementsTotal
    ).toBe(0);
  });
});
describe('computeStreak', () => {
  const now = new Date(2026, 10, 20, 15, 0, 0); // jeudi 20 nov 2026, heure locale

  it('série maintenue si joué aujourd’hui ou hier (relatif à now)', () => {
    expect(
      computeStreak(
        {
          compte: 4,
          lastDay: '2026-11-20',
        },
        [],
        now
      ).compte
    ).toBe(4);
    expect(
      computeStreak(
        {
          compte: 4,
          lastDay: '2026-11-19',
        },
        [],
        now
      ).compte
    ).toBe(4);
  });
  it('série rompue si le dernier jour est antérieur à hier', () => {
    expect(
      computeStreak(
        {
          compte: 4,
          lastDay: '2026-11-18',
        },
        [],
        now
      ).compte
    ).toBe(0);
    expect(
      computeStreak(
        {
          compte: 4,
          lastDay: null,
        },
        [],
        now
      ).compte
    ).toBe(0);
    expect(computeStreak(null, [], now)).toEqual({
      compte: 0,
      lastDay: null,
      gamesToday: 0,
    });
  });
  it('compte les parties du jour de `now`', () => {
    const games = [
      game({
        date: localISO(2026, 11, 20, 9),
      }),
      game({
        date: localISO(2026, 11, 20, 14),
      }),
      game({
        date: localISO(2026, 11, 19, 23),
      }),
      game({
        date: null!, // date absente : ignorée par le compteur du jour
      }),
    ];
    expect(
      computeStreak(
        {
          compte: 1,
          lastDay: '2026-11-20',
        },
        games,
        now
      ).gamesToday
    ).toBe(2);
  });
});
