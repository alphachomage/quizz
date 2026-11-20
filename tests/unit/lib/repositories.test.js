// Tests des repositories (src/lib/repositories.js) : un repo par clé de stockage,
// méthodes métier (records, XP, parties avec limite 500) au-dessus de storage.js.
import { beforeEach, describe, expect, it } from 'vitest';

import { CLES } from '@/lib/storage.js';
import {
  RecordsRepo,
  XpRepo,
  PartiesRepo,
  SoumissionsRepo,
  ValideesRepo,
  SuggestionsRepo,
  StreakJourRepo,
  toutVider,
} from '@/lib/repositories.js';

// chargerXxx du domaine restent des wrappers au-dessus des repos :
import { chargerRecords, sauverRecord, cleRecord } from '@/lib/records.js';
import { chargerXP, ajouterXP } from '@/lib/xp.js';
import { chargerParties, ajouterPartie } from '@/lib/parties-historique.js';
import { chargerSoumissions, ajouterSoumission, validerSoumission, chargerValidees } from '@/lib/soumissions.js';
import { chargerStreakJour, enregistrerStreakJour } from '@/lib/streak.js';
import { ajouterSuggestion, chargerSuggestions } from '@/lib/suggestions.js';

beforeEach(() => {
  localStorage.clear();
});

describe('repositories : contrat clé -> repo', () => {
  it('chaque repo encapsule sa clé CLES', () => {
    expect(RecordsRepo.cle).toBe(CLES.records);
    expect(XpRepo.cle).toBe(CLES.xp);
    expect(PartiesRepo.cle).toBe(CLES.parties);
    expect(SoumissionsRepo.cle).toBe(CLES.soumissions);
    expect(ValideesRepo.cle).toBe(CLES.validees);
  });

  it('tout()/sauver()/vider() lisent et écrivent la bonne clé', () => {
    RecordsRepo.sauver({ 'solo:moyen:histoire': 120 });
    expect(JSON.parse(localStorage.getItem(CLES.records))).toEqual({ 'solo:moyen:histoire': 120 });
    expect(RecordsRepo.tout()).toEqual({ 'solo:moyen:histoire': 120 });
    RecordsRepo.vider();
    expect(RecordsRepo.tout()).toEqual({});
  });
});

describe('méthodes métier', () => {
  it('RecordsRepo.sauverSiMeilleur ne remplace que si mieux', () => {
    const cle = cleRecord('solo', 'moyen', 'histoire');
    expect(RecordsRepo.sauverSiMeilleur(cle, 100)).toBe(true);
    expect(RecordsRepo.sauverSiMeilleur(cle, 50)).toBe(false);
    expect(RecordsRepo.meilleur(cle)).toBe(100);
    // le domaine (records.js) lit la même donnée via le repo
    expect(sauverRecord(cle, 150)).toBe(150);
    expect(chargerRecords()[cle]).toBe(150);
  });

  it('XpRepo.ajouter cumule par thème', () => {
    XpRepo.ajouter('histoire', 40);
    expect(XpRepo.ajouter('histoire', 60)).toBe(100);
    expect(XpRepo.parTheme('histoire')).toBe(100);
    expect(chargerXP()).toEqual({ histoire: 100 });
    expect(ajouterXP('histoire', 50)).toBe(150);
  });

  it('PartiesRepo.ajouter conserve les 500 dernières max', () => {
    for (let i = 0; i < 505; i++) ajouterPartie({ mode: 'solo', total: 10 });
    const parties = chargerParties();
    expect(parties).toHaveLength(500);
    expect(parties[0].id).toBeTruthy(); // chaque partie a un id + une date
    expect(parties[0].date).toBeTruthy();
  });

  it('soumissions -> validation -> validées (même flux que l’admin)', () => {
    const s = ajouterSoumission({ themeId: 'histoire', q: 'Capitale ?', reponses: ['Paris', 'Lyon'], bonne: 0, niveau: 'facile' });
    expect(chargerSoumissions()).toHaveLength(1);
    validerSoumission(s.id);
    expect(chargerSoumissions()).toHaveLength(0); // disparaît de la liste des propositions
    expect(chargerValidees()).toHaveLength(1); // devient jouable
    expect(chargerValidees()[0].valideLe).toBeTruthy();
  });

  it('StreakJourRepo : série de jours via enregistrerStreakJour', () => {
    expect(chargerStreakJour()).toEqual({ compte: 0, dernierJour: null });
    const s = enregistrerStreakJour();
    expect(s.compte).toBe(1);
    expect(StreakJourRepo.lire().compte).toBe(1);
  });

  it('les suggestions sont tronquées à 200 max', () => {
    for (let i = 0; i < 205; i++) ajouterSuggestion('suggestion ' + i, 'testeur');
    expect(chargerSuggestions()).toHaveLength(200);
    expect(JSON.parse(localStorage.getItem(CLES.suggestions))).toHaveLength(200);
  });
});

describe('toutVider (reset)', () => {
  it('vide records, parties, XP, séries, streak, badges, titres, signalements', () => {
    RecordsRepo.sauver({ a: 1 });
    XpRepo.sauver({ histoire: 10 });
    PartiesRepo.sauver([{ mode: 'solo' }]);
    StreakJourRepo.sauver({ compte: 3, dernierJour: '2026-11-20' });
    toutVider();
    expect(RecordsRepo.tout()).toEqual({});
    expect(XpRepo.tout()).toEqual({});
    expect(PartiesRepo.tout()).toEqual([]);
    expect(StreakJourRepo.lire()).toEqual({ compte: 0, dernierJour: null });
  });
});
