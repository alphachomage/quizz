// Tests des repositories (src/lib/repositories.js) : un repo par clé de stockage,
// méthodes métier (records, XP, parties avec limite 500) au-dessus de storage.js.
import { beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEYS } from '@/lib/storage.js';
import {
  RecordsRepo,
  XpRepo,
  GamesRepo,
  SubmissionsRepo,
  ApprovedRepo,
  SuggestionsRepo,
  DailyStreakRepo,
  toutVider,
} from '@/lib/repositories.js';

// chargerXxx du domaine restent des wrappers au-dessus des repos :
import { loadRecords, sauverRecord, recordKey } from '@/lib/records.js';
import { loadXp, addXp } from '@/lib/xp.js';
import { loadGames, addGame } from '@/lib/game-history.js';
import { loadSubmissions, addSubmission, approveSubmission, loadApproved } from '@/lib/submissions.js';
import { loadDailyStreak, recordDailyStreak } from '@/lib/streak.js';
import { addSuggestion, loadSuggestions } from '@/lib/suggestions.js';

beforeEach(() => {
  localStorage.clear();
});

describe('repositories : contrat clé -> repo', () => {
  it('chaque repo encapsule sa clé CLES', () => {
    expect(RecordsRepo.key).toBe(STORAGE_KEYS.records);
    expect(XpRepo.key).toBe(STORAGE_KEYS.xp);
    expect(GamesRepo.key).toBe(STORAGE_KEYS.games);
    expect(SubmissionsRepo.key).toBe(STORAGE_KEYS.soumissions);
    expect(ApprovedRepo.key).toBe(STORAGE_KEYS.validees);
  });

  it('tout()/sauver()/vider() lisent et écrivent la bonne clé', () => {
    RecordsRepo.sauver({ 'solo:moyen:histoire': 120 });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.records))).toEqual({ 'solo:moyen:histoire': 120 });
    expect(RecordsRepo.tout()).toEqual({ 'solo:moyen:histoire': 120 });
    RecordsRepo.vider();
    expect(RecordsRepo.tout()).toEqual({});
  });
});

describe('méthodes métier', () => {
  it('RecordsRepo.sauverSiMeilleur ne remplace que si mieux', () => {
    const key = recordKey('solo', 'moyen', 'histoire');
    expect(RecordsRepo.sauverSiMeilleur(key, 100)).toBe(true);
    expect(RecordsRepo.sauverSiMeilleur(key, 50)).toBe(false);
    expect(RecordsRepo.meilleur(key)).toBe(100);
    // le domaine (records.js) lit la même donnée via le repo
    expect(sauverRecord(key, 150)).toBe(150);
    expect(loadRecords()[key]).toBe(150);
  });

  it('XpRepo.ajouter cumule par thème', () => {
    XpRepo.add('histoire', 40);
    expect(XpRepo.add('histoire', 60)).toBe(100);
    expect(XpRepo.parTheme('histoire')).toBe(100);
    expect(loadXp()).toEqual({ histoire: 100 });
    expect(addXp('histoire', 50)).toBe(150);
  });

  it('PartiesRepo.ajouter conserve les 500 dernières max', () => {
    for (let i = 0; i < 505; i++) addGame({ mode: 'solo', total: 10 });
    const games = loadGames();
    expect(games).toHaveLength(500);
    expect(games[0].id).toBeTruthy(); // chaque partie a un id + une date
    expect(games[0].date).toBeTruthy();
  });

  it('soumissions -> validation -> validées (même flux que l’admin)', () => {
    const s = addSubmission({ themeId: 'histoire', q: 'Capitale ?', reponses: ['Paris', 'Lyon'], bonne: 0, niveau: 'facile' });
    expect(loadSubmissions()).toHaveLength(1);
    approveSubmission(s.id);
    expect(loadSubmissions()).toHaveLength(0); // disparaît de la liste des propositions
    expect(loadApproved()).toHaveLength(1); // devient jouable
    expect(loadApproved()[0].valideLe).toBeTruthy();
  });

  it('StreakJourRepo : série de jours via enregistrerStreakJour', () => {
    expect(loadDailyStreak()).toEqual({ account: 0, dernierJour: null });
    const s = recordDailyStreak();
    expect(s.account).toBe(1);
    expect(DailyStreakRepo.read().account).toBe(1);
  });

  it('les suggestions sont tronquées à 200 max', () => {
    for (let i = 0; i < 205; i++) addSuggestion('suggestion ' + i, 'testeur');
    expect(loadSuggestions()).toHaveLength(200);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.suggestions))).toHaveLength(200);
  });
});

describe('toutVider (reset)', () => {
  it('vide records, parties, XP, séries, streak, badges, titres, signalements', () => {
    RecordsRepo.sauver({ a: 1 });
    XpRepo.sauver({ histoire: 10 });
    GamesRepo.sauver([{ mode: 'solo' }]);
    DailyStreakRepo.sauver({ account: 3, dernierJour: '2026-11-20' });
    toutVider();
    expect(RecordsRepo.tout()).toEqual({});
    expect(XpRepo.tout()).toEqual({});
    expect(GamesRepo.tout()).toEqual([]);
    expect(DailyStreakRepo.read()).toEqual({ account: 0, dernierJour: null });
  });
});
