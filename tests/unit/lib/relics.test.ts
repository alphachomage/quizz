// tests/unit/lib/relics.test.ts — le catalogue des 60 reliques (édition « donjon »),
// le tirage des choix (cumulables, conflits, pondération progressive) et le moteur de gains.
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import {
  RELICS,
  RARETE_POIDS_DEBUT,
  RARETE_POIDS_FIN,
  aRelic,
  computeRogueBonus,
  conflitsDe,
  countRelic,
  drawRelicChoices,
  emptyRogueBonus,
  gainRogue,
  nbAPrendre,
  nbPropositions,
  poidsRarete,
  scoreFinalRogue,
} from '@lib/relics.js';
import type { GainContext } from '@lib/relics.js';
import { mulberry32 } from '../../fixtures/questions.fixture.js';

// Contexte de gain par défaut (question de 10 s, 1re question, réponse instantanée).
function ctx(over: Partial<GainContext> = {}): GainContext {
  return {
    correct: true,
    secondesEcoulees: 0,
    dureeQuestion: 10,
    mancheBonus: false,
    streak: 1,
    bonnesAvant: 0,
    index: 0,
    questionDansPalier: 1,
    niveau: 'facile',
    themeId: 't',
    themePrecedent: null,
    vies: 1,
    viesMax: 1,
    pariPlace: false,
    nbReliques: 0,
    themeSpecialiste: null,
    zoneConfort: false,
    isRevision: false,
    fievreActive: false,
    rebondActif: false,
    jackpotActif: false,
    div2: false,
    ...over,
  };
}

const relic = (id: string) => RELICS.find((r) => r.id === id)!;

describe('catalogue des reliques', () => {
  it('contient exactement 60 reliques, ids et numéros 1..60 uniques, raretés 30/23/7', () => {
    expect(RELICS).toHaveLength(60);
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(60);
    expect(new Set(RELICS.map((r) => r.num)).size).toBe(60);
    const compte: Record<string, number> = {};
    for (const r of RELICS) compte[r.rarete] = (compte[r.rarete] || 0) + 1;
    expect(compte).toEqual({ commun: 30, rare: 23, legendaire: 7 });
    for (const r of RELICS) {
      expect(r.nom.length).toBeGreaterThan(0);
      expect(r.desc.length).toBeGreaterThan(0);
      expect(r.icone.length).toBeGreaterThan(0);
      expect(RARETE_POIDS_DEBUT[r.rarete]).toBeGreaterThan(0);
      // les conflits sont symétriques et référencés dans le catalogue
      for (const c of r.conflits) expect(RELICS.some((x) => x.num === c)).toBe(true);
    }
  });
  it('seules Sablier et Cœur en plus sont cumulables', () => {
    const cumulables = RELICS.filter((r) => r.cumulable).map((r) => r.id);
    expect(cumulables.sort()).toEqual(['coeur-en-plus', 'sablier']);
    expect(aRelic([relic('sablier')], 'sablier')).toBe(true);
    expect(countRelic([relic('sablier'), relic('sablier')], 'sablier')).toBe(2);
  });
  it('conflits mutuels : Tortue exclut Éclair et Prime de vitesse', () => {
    const c = conflitsDe(['tortue']);
    expect(c.has(7)).toBe(true); // Éclair
    expect(c.has(27)).toBe(true); // Prime de vitesse
    expect(conflitsDe(['eclair']).has(6)).toBe(true); // symétrique
  });
});

describe('tirage des propositions', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(7));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('propose 3 reliques distinctes, sans les non-cumulables déjà prises', () => {
    const deja = ['adrenaline', 'tortue'];
    const choix = drawRelicChoices(deja, 3);
    expect(choix).toHaveLength(3);
    expect(new Set(choix.map((r) => r.id)).size).toBe(3);
    const nonCumulablesPris = deja.filter((id) => !RELICS.find((r) => r.id === id)?.cumulable);
    for (const id of nonCumulablesPris) {
      expect(choix.map((c) => c.id)).not.toContain(id);
    }
  });
  it('les reliques cumulables peuvent réapparaître même si déjà prises', () => {
    const tout = RELICS.filter((r) => !r.cumulable).map((r) => r.id);
    const choix = drawRelicChoices(tout, 5, mulberry32(3), 0);
    // seules les 2 cumulables restent dans le pool
    expect(choix.length).toBeLessThanOrEqual(2);
    for (const r of choix) expect(r.cumulable).toBe(true);
  });
  it('une relique en conflit avec une relique possédée n’est jamais proposée', () => {
    const choix = drawRelicChoices(['tortue'], 60, mulberry32(11), 0);
    expect(choix.some((r) => r.num === 7 || r.num === 27)).toBe(false); // Éclair, Prime de vitesse
  });
  it('pool épuisé : il ne reste que les reliques cumulables (Sablier / Cœur en plus)', () => {
    const tout = RELICS.map((r) => r.id);
    const reste = drawRelicChoices(tout, 10);
    expect(reste.length).toBeLessThanOrEqual(2);
    for (const r of reste) expect(r.cumulable).toBe(true);
    expect(drawRelicChoices([], 0)).toHaveLength(0);
  });
  it('filtre par rareté minimum (Recyclage : rares ou mieux)', () => {
    const choix = drawRelicChoices([], 60, mulberry32(5), 1, ['rare', 'legendaire']);
    expect(choix.length).toBeGreaterThan(0);
    for (const r of choix) expect(['rare', 'legendaire']).toContain(r.rarete);
  });
  it('pondération progressive : du commun au début, du légendaire à la fin', () => {
    expect(poidsRarete(0, 'commun')).toBe(RARETE_POIDS_DEBUT.commun);
    expect(poidsRarete(1, 'commun')).toBe(RARETE_POIDS_FIN.commun);
    expect(poidsRarete(0, 'legendaire')).toBeLessThan(poidsRarete(1, 'legendaire'));
    expect(poidsRarete(0, 'commun')).toBeGreaterThan(poidsRarete(1, 'commun'));
    expect(poidsRarete(0.5, 'rare')).toBeCloseTo((RARETE_POIDS_DEBUT.rare + RARETE_POIDS_FIN.rare) / 2);
    const compte = (prog: number) => {
      const c: Record<string, number> = { commun: 0, rare: 0, legendaire: 0 };
      for (let i = 0; i < 2000; i++) {
        const [r] = drawRelicChoices([], 1, mulberry32(1000 + i), prog);
        c[r.rarete]++;
      }
      return c;
    };
    const debut = compte(0);
    const fin = compte(1);
    expect(debut.commun / 2000).toBeGreaterThan(0.5);
    expect(fin.legendaire / 2000).toBeGreaterThan(debut.legendaire / 2000);
    expect(fin.commun / 2000).toBeLessThan(debut.commun / 2000);
  });
  it('nbPropositions : 3 par défaut, 2 si Pacte', () => {
    expect(nbPropositions(emptyRogueBonus())).toBe(3);
    expect(nbAPrendre(emptyRogueBonus())).toBe(1);
    const b = computeRogueBonus([relic('pacte')]);
    expect(nbPropositions(b)).toBe(2);
  });
});

describe('bonus agrégés et gains', () => {
  it('sans relique : gain = base arcade (20 − 1 pt/s, min 10, rescalé sur la durée réelle)', () => {
    const b = emptyRogueBonus();
    expect(gainRogue(b, ctx())).toBe(20);
    expect(gainRogue(b, ctx({ secondesEcoulees: 5 }))).toBe(15);
    expect(gainRogue(b, ctx({ correct: false, streak: 0 }))).toBe(0);
    // question « dur » = 13 s : le chrono des points est recalé sur 13 s
    expect(gainRogue(b, ctx({ dureeQuestion: 13, secondesEcoulees: 13 }))).toBe(10);
    expect(gainRogue(b, ctx({ dureeQuestion: 13, secondesEcoulees: 6.5 }))).toBe(15);
  });
  it('Sablier cumulable : 2 exemplaires = +6 s', () => {
    const b = computeRogueBonus([relic('sablier'), relic('sablier')]);
    expect(b.timerBonus).toBe(6);
  });
  it('Tortue : chrono ×2 ET 10 pts fixes', () => {
    const b = computeRogueBonus([relic('tortue')]);
    expect(b.timerMult).toBe(2);
    expect(b.pointsFlat).toBe(10);
    expect(gainRogue(b, ctx({ secondesEcoulees: 9 }))).toBe(10); // plat, indépendant du chrono
  });
  it('Adrénaline : −3 s au chrono mais +50 % de points', () => {
    const b = computeRogueBonus([relic('adrenaline')]);
    expect(b.timerBonus).toBe(-3);
    expect(b.timerMalusPct).toBe(50);
    expect(gainRogue(b, ctx())).toBe(30); // 20 × 1,5
  });
  it('Prime de vitesse : 30 − 2/s, minimum 5', () => {
    const b = computeRogueBonus([relic('prime-de-vitesse')]);
    expect(gainRogue(b, ctx({ secondesEcoulees: 0 }))).toBe(30);
    expect(gainRogue(b, ctx({ secondesEcoulees: 5 }))).toBe(20);
    expect(gainRogue(b, ctx({ secondesEcoulees: 20 }))).toBe(5); // plancher 5
  });
  it('Plancher : points de la question entre 15 et 18', () => {
    const b = computeRogueBonus([relic('plancher')]);
    expect(gainRogue(b, ctx({ secondesEcoulees: 0 }))).toBe(18); // 20 -> max 18
    expect(gainRogue(b, ctx({ secondesEcoulees: 9.6 }))).toBe(15); // ~10 -> min 15
  });
  it('Éclair : +8 pts si réponse en moins de 3 s', () => {
    const b = computeRogueBonus([relic('eclair')]);
    expect(gainRogue(b, ctx({ secondesEcoulees: 2 }))).toBe(18 + 8); // 20-2 + 8
    expect(gainRogue(b, ctx({ secondesEcoulees: 4 }))).toBe(16); // trop lent
  });
  it('Pari : ×2 si la mise est placée', () => {
    const b = computeRogueBonus([relic('pari')]);
    expect(gainRogue(b, ctx({ pariPlace: true }))).toBe(40);
    expect(gainRogue(b, ctx({ pariPlace: false }))).toBe(20);
  });
  it('Spécialiste : thème choisi ×2, autres −20 %', () => {
    const b = computeRogueBonus([relic('specialiste')]);
    expect(gainRogue(b, ctx({ themeSpecialiste: 't', themeId: 't' }))).toBe(40);
    expect(gainRogue(b, ctx({ themeSpecialiste: 't', themeId: 'autre' }))).toBe(16); // 20 × 0,8
  });
  it('Funambule : +20 % par vie manquante (1/3 vies -> ×1,4)', () => {
    const b = computeRogueBonus([relic('funambule')]);
    expect(gainRogue(b, ctx({ vies: 1, viesMax: 3 }))).toBe(28); // 20 × 1,4
    expect(gainRogue(b, ctx({ vies: 3, viesMax: 3 }))).toBe(20);
  });
  it('Collectionneur : +1 pt par relique possédée', () => {
    const b = computeRogueBonus([relic('collectionneur')]);
    expect(gainRogue(b, ctx({ nbReliques: 7 }))).toBe(27);
  });
  it('Dernier mot : la 10e question du palier vaut ×3', () => {
    const b = computeRogueBonus([relic('dernier-mot')]);
    expect(gainRogue(b, ctx({ questionDansPalier: 10 }))).toBe(60);
    expect(gainRogue(b, ctx({ questionDansPalier: 9 }))).toBe(20);
  });
  it('Jackpot du palier ×5, 50/50 divise par 2, Élimination plafonne à 15', () => {
    const bj = computeRogueBonus([relic('jackpot')]);
    expect(gainRogue(bj, ctx({ jackpotActif: true }))).toBe(100); // 20 × 5
    const b5 = computeRogueBonus([relic('cinquante')]);
    expect(gainRogue(b5, ctx({ div2: true }))).toBe(10); // 20 / 2
    const be = computeRogueBonus([relic('elimination')]);
    expect(gainRogue(be, ctx())).toBe(15); // 20 plafonné à 15
  });
  it('Chasseur : question « dur » ×2 ; Révision : erreur revenue ×3 ; Zone de confort : −25 %', () => {
    const bc = computeRogueBonus([relic('chasseur')]);
    expect(gainRogue(bc, ctx({ niveau: 'dur' }))).toBe(40);
    expect(gainRogue(bc, ctx({ niveau: 'facile' }))).toBe(20);
    const br = computeRogueBonus([relic('revision')]);
    expect(gainRogue(br, ctx({ isRevision: true }))).toBe(60);
    const bz = computeRogueBonus([relic('zone-de-confort')]);
    expect(gainRogue(bz, ctx({ zoneConfort: true }))).toBe(15); // 20 × 0,75
  });
  it('Rebond ×2 après une erreur ; Fièvre ×3 ; Combustion ×2 dès 5 d’affilée', () => {
    const bRe = computeRogueBonus([relic('rebond')]);
    expect(gainRogue(bRe, ctx({ rebondActif: true }))).toBe(40);
    const bF = computeRogueBonus([relic('fievre')]);
    expect(gainRogue(bF, ctx({ fievreActive: true }))).toBe(60);
    const bC = computeRogueBonus([relic('combustion')]);
    expect(gainRogue(bC, ctx({ streak: 6 }))).toBe(40);
    expect(gainRogue(bC, ctx({ streak: 4 }))).toBe(20);
  });
  it('Verre de cristal : +100 % de points', () => {
    const b = computeRogueBonus([relic('verre-de-cristal')]);
    expect(gainRogue(b, ctx())).toBe(40);
  });
  it('scoreFinalRogue : plancher du score final', () => {
    const b = { ...emptyRogueBonus(), plancher: 500 };
    expect(scoreFinalRogue(b, 120, false, 3)).toBe(500);
    expect(scoreFinalRogue(b, 900, false, 3)).toBe(900);
    expect(scoreFinalRogue(emptyRogueBonus(), 120, false, 3)).toBe(120);
  });
});
