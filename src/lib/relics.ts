// relics.ts — mode Rogue Quizz : logique des reliques (raretés, pondération, tirage des
// choix, conflits, bonus agrégés). Le catalogue (types + définitions) est dans
// relics-catalog.ts, ré-exporté ici pour les imports existants.
// Module PUR : aucune dépendance au DOM ni au stockage.

import { RELICS, RARETE_POIDS_DEBUT, RARETE_POIDS_FIN } from './relics-catalog.js';
import type { Relic, RelicRarity } from './relics-catalog.js';

export * from './relics-catalog.js';

/** Poids de tirage d'une rareté à une progression donnée (interpolation linéaire 0..1). */
export function poidsRarete(prog: number, rarete: RelicRarity): number {
  const p = Math.max(0, Math.min(1, prog));
  const a = RARETE_POIDS_DEBUT[rarete];
  const b = RARETE_POIDS_FIN[rarete];
  return a + (b - a) * p;
}


// --- Verrouillage par niveau (question 1-based dans la run) ---
// Pas de relique épique dans les 20 premiers niveaux, pas de légendaire dans les 30 premiers.
export const NIVEAU_MIN_EPIQUE = 21; // épique autorisé à partir de la question 21
export const NIVEAU_MIN_LEGENDAIRE = 31; // légendaire autorisé à partir de la question 31

/** Une rareté peut-elle sortir à ce niveau de la run ? (les communs/rares sortent dès le début). */
export function rareteAutorisee(rarete: string, niveau: number): boolean {
  if (rarete === 'legendaire') return niveau >= NIVEAU_MIN_LEGENDAIRE;
  if (rarete === 'epique') return niveau >= NIVEAU_MIN_EPIQUE;
  return true;
}

// --- Helpers de catalogue ---

/** Les reliques en conflit avec au moins une des reliques `ids` (exclusivité mutuelle). */
export function conflitsDe(ids: string[]): Set<number> {
  const out = new Set<number>();
  for (const id of ids) {
    const r = RELICS.find((x) => x.id === id);
    if (!r) continue;
    for (const c of r.conflits) out.add(c);
    // conflit symétrique : si une relique possédée est listée dans les conflits de r
    for (const autre of RELICS) if (autre.conflits.includes(r.num)) out.add(autre.num);
  }
  return out;
}

/** Nombre d'exemplaires d'une relique dans la liste (reliques cumulables). */
export function countRelic(relics: Relic[], id: string): number {
  return relics.filter((r) => r.id === id).length;
}

/** La relique est-elle possédée (au moins 1 exemplaire) ? */
export function aRelic(relics: Relic[], id: string): boolean {
  return relics.some((r) => r.id === id);
}

// --- Bonus agrégés d'une run ---

export interface RogueBonus {
  timerBonus: number;
  timerMalusPct: number;
  timerMult: number;
  pointsFlat: number | null;
  primeVitesse: boolean;
  plancherMin: number;
  plancherMax: number;
  carryMax: number;
  marathon: { reserve: number; mult: number } | null;
  speed: { maxS: number; n: number }[];
  // vision
  loupeMalusS: number;
  cinquante: { n: number; div: number } | null;
  intuition: boolean;
  eliminationMaxPts: number;
  votePublic: boolean;
  barreeFlat: number;
  indiceMalusS: number;
  deuxiemeChancePts: number;
  rayonXMalusS: number;
  boussoleMalusPct: number;
  boussole: boolean;
  // série
  streakStep: number;
  streakCap: number; // 10 par défaut, Number.MAX_SAFE_INTEGER si plafond brisé
  filetSecurite: boolean;
  combustionSeuil: number;
  rebond: boolean;
  momentumMax: number;
  dominoVies: number;
  fievre: { n: number; s: number; mult: number } | null;
  // points
  pct: number;
  flat: number;
  interetsPct: number;
  jackpotMult: number;
  toutOuRien: { mult: number; malusPct: number } | null;
  collectionneur: boolean;
  dernierMotMult: number;
  ascete: number;
  // vies
  viesMaxBonus: number;
  soin: number;
  bouclier: boolean;
  vampireSeuil: number;
  verreCristal: boolean;
  assuranceVie: boolean;
  infirmerie: boolean;
  tempsMort: boolean;
  pacteChoix: number;
  // thèmes
  specialiste: { mult: number; malusPct: number } | null;
  antiRepete: number;
  zoneConfortMalusPct: number;
  piocheParPalier: number;
  chasseur: boolean;
  revisionMult: number;
  encyclopedieS: number;
  retourEcoleMalusPct: number;
  // risque
  pari: boolean;
  brouillard: { pct: number; s: number } | null;
  miroirPct: number;
  monochromePct: number;
  funambulePctParVie: number;
  mainDuDestin: boolean;
  // légendaires
  echo: boolean;
  joker: boolean;
  recyclage: boolean;
  retourArriereMalusS: number;
  // fin de run
  finalMult: number;
  plancher: number;
}

/** Bonus vides (aucune relique). */
export function emptyRogueBonus(): RogueBonus {
  return {
    timerBonus: 0,
    timerMalusPct: 0,
    timerMult: 1,
    pointsFlat: null,
    primeVitesse: false,
    plancherMin: 0,
    plancherMax: 0,
    carryMax: 0,
    marathon: null,
    speed: [],
    loupeMalusS: 0,
    cinquante: null,
    intuition: false,
    eliminationMaxPts: 0,
    votePublic: false,
    barreeFlat: 0,
    indiceMalusS: 0,
    deuxiemeChancePts: 0,
    rayonXMalusS: 0,
    boussoleMalusPct: 0,
    boussole: false,
    streakStep: 1,
    streakCap: 10,
    filetSecurite: false,
    combustionSeuil: 0,
    rebond: false,
    momentumMax: 0,
    dominoVies: 0,
    fievre: null,
    pct: 0,
    flat: 0,
    interetsPct: 0,
    jackpotMult: 0,
    toutOuRien: null,
    collectionneur: false,
    dernierMotMult: 0,
    ascete: 0,
    viesMaxBonus: 0,
    soin: 0,
    bouclier: false,
    vampireSeuil: 0,
    verreCristal: false,
    assuranceVie: false,
    infirmerie: false,
    tempsMort: false,
    pacteChoix: 0,
    specialiste: null,
    antiRepete: 0,
    zoneConfortMalusPct: 0,
    piocheParPalier: 0,
    chasseur: false,
    revisionMult: 0,
    encyclopedieS: 0,
    retourEcoleMalusPct: 0,
    pari: false,
    brouillard: null,
    miroirPct: 0,
    monochromePct: 0,
    funambulePctParVie: 0,
    mainDuDestin: false,
    echo: false,
    joker: false,
    recyclage: false,
    retourArriereMalusS: 0,
    finalMult: 1,
    plancher: 0,
  };
}

/** Agrège les effets de toutes les reliques choisies en un objet RogueBonus. */
export function computeRogueBonus(relics: Relic[]): RogueBonus {
  const b = emptyRogueBonus();
  for (const r of relics) {
    const e = r.effet;
    switch (e.t) {
      case 'timer':
        b.timerBonus += e.s;
        break;
      case 'timerMalus':
        b.timerBonus -= e.s;
        b.timerMalusPct += e.p;
        break;
      case 'timerMult':
        b.timerMult *= e.m;
        if (e.flat !== undefined) b.pointsFlat = e.flat;
        break;
      case 'pointsFlat':
        b.pointsFlat = e.n;
        break;
      case 'carryOver':
        b.carryMax = Math.max(b.carryMax, e.max);
        break;
      case 'marathon':
        b.marathon = { reserve: e.reserve, mult: e.mult };
        break;
      case 'speed':
        b.speed.push({ maxS: e.maxS, n: e.n });
        break;
      case 'primeVitesse':
        b.primeVitesse = true;
        break;
      case 'loupe':
        b.loupeMalusS = Math.max(b.loupeMalusS, e.malusS);
        break;
      case 'cinquante':
        b.cinquante = { n: e.n, div: e.div };
        break;
      case 'intuition':
        b.intuition = true;
        break;
      case 'elimination':
        b.eliminationMaxPts = Math.max(b.eliminationMaxPts, e.maxPts);
        break;
      case 'votePublic':
        b.votePublic = true;
        break;
      case 'barree':
        b.barreeFlat += e.n;
        break;
      case 'indice':
        b.indiceMalusS = Math.max(b.indiceMalusS, e.malusS);
        break;
      case 'deuxiemeChance':
        b.deuxiemeChancePts = Math.max(b.deuxiemeChancePts, e.pts);
        break;
      case 'rayonX':
        b.rayonXMalusS = Math.max(b.rayonXMalusS, e.malusS);
        break;
      case 'boussole':
        b.boussole = true;
        b.boussoleMalusPct = Math.max(b.boussoleMalusPct, e.malusPct);
        break;
      case 'streakStep':
        b.streakStep = Math.max(b.streakStep, e.step);
        break;
      case 'streakCapNone':
        b.streakCap = Number.MAX_SAFE_INTEGER;
        break;
      case 'filetSecurite':
        b.filetSecurite = true;
        break;
      case 'combustion':
        b.combustionSeuil = Math.max(b.combustionSeuil, e.seuil);
        break;
      case 'rebond':
        b.rebond = true;
        break;
      case 'momentum':
        b.momentumMax = Math.max(b.momentumMax, e.max);
        break;
      case 'domino':
        b.dominoVies = Math.max(b.dominoVies, e.vies);
        break;
      case 'fievre':
        b.fievre = { n: e.n, s: e.s, mult: e.mult };
        break;
      case 'plancherPts':
        b.plancherMin = Math.max(b.plancherMin, e.min);
        b.plancherMax = Math.max(b.plancherMax, e.max);
        break;
      case 'interets':
        b.interetsPct = Math.max(b.interetsPct, e.pct);
        break;
      case 'jackpotPalier':
        b.jackpotMult = Math.max(b.jackpotMult, e.mult);
        break;
      case 'toutOuRien':
        b.toutOuRien = { mult: e.mult, malusPct: e.malusPct };
        break;
      case 'collectionneur':
        b.collectionneur = true;
        break;
      case 'dernierMot':
        b.dernierMotMult = Math.max(b.dernierMotMult, e.mult);
        break;
      case 'ascete':
        b.ascete = Math.max(b.ascete, e.n);
        break;
      case 'vie':
        b.viesMaxBonus += e.n;
        b.soin += e.soin;
        break;
      case 'bouclier':
        b.bouclier = true;
        break;
      case 'vampire':
        b.vampireSeuil = Math.max(b.vampireSeuil, e.seuil);
        break;
      case 'verreCristal':
        b.verreCristal = true;
        b.pct += 100;
        break;
      case 'assuranceVie':
        b.assuranceVie = true;
        break;
      case 'infirmerie':
        b.infirmerie = true;
        break;
      case 'tempsMort':
        b.tempsMort = true;
        break;
      case 'pacteVies':
        b.viesMaxBonus += e.vies;
        b.pacteChoix = Math.max(b.pacteChoix, e.choix);
        break;
      case 'specialiste':
        b.specialiste = { mult: e.mult, malusPct: e.malusPct };
        break;
      case 'antiRepete':
        b.antiRepete = Math.max(b.antiRepete, e.n);
        break;
      case 'zoneConfort':
        b.zoneConfortMalusPct = Math.max(b.zoneConfortMalusPct, e.malusPct);
        break;
      case 'pioche':
        b.piocheParPalier = Math.max(b.piocheParPalier, e.n);
        break;
      case 'chasseur':
        b.chasseur = true;
        break;
      case 'revision':
        b.revisionMult = Math.max(b.revisionMult, e.mult);
        break;
      case 'encyclopedie':
        b.encyclopedieS = Math.max(b.encyclopedieS, e.s);
        break;
      case 'retourEcole':
        b.retourEcoleMalusPct = Math.max(b.retourEcoleMalusPct, e.malusPct);
        break;
      case 'pari':
        b.pari = true;
        break;
      case 'brouillard':
        b.brouillard = { pct: e.pct, s: e.s };
        b.pct += e.pct;
        break;
      case 'miroir':
        b.miroirPct += e.pct;
        b.pct += e.pct;
        break;
      case 'monochrome':
        b.monochromePct += e.pct;
        b.pct += e.pct;
        break;
      case 'funambule':
        b.funambulePctParVie = Math.max(b.funambulePctParVie, e.pctParVie);
        break;
      case 'mainDuDestin':
        b.mainDuDestin = true;
        break;
      case 'echo':
        b.echo = true;
        break;
      case 'joker':
        b.joker = true;
        break;
      case 'recyclage':
        b.recyclage = true;
        break;
      case 'retourArriere':
        b.retourArriereMalusS += e.malusS;
        break;
      case 'gele':
      case 'secondSouffle':
        break; // comportements gérés directement dans useGame (boutons / état par palier)
    }
  }
  b.flat += b.barreeFlat;
  return b;
}

// --- Tirage des propositions ---

/** Tirage pondéré par rareté (poids selon la progression) d'une relique dans le pool. */
function pickWeighted(pool: Relic[], prog: number, rand: () => number): Relic {
  const total = pool.reduce((a, r) => a + poidsRarete(prog, r.rarete), 0);
  let x = rand() * total;
  for (const r of pool) {
    x -= poidsRarete(prog, r.rarete);
    if (x <= 0) return r;
  }
  return pool[pool.length - 1];
}

/**
 * Propose `nb` reliques : ni déjà prises (sauf cumulables), ni en conflit avec une
 * relique déjà prise, ni d'une rareté verrouillée à ce niveau (épique < 21,
 * légendaire < 31). Tirage pondéré par rareté, sans remise. `prog` (0..1) =
 * avancement dans la run : il fait évoluer les poids (début = plutôt commun,
 * fin = plutôt rare/légendaire). `niveau` = numéro de la question à venir (1-based).
 * `rand` permet des tests déterministes.
 */
export function drawRelicChoices(
  dejaPrises: string[],
  nb = 3,
  rand: () => number = Math.random,
  prog = 0,
  raretesMin: RelicRarity[] | null = null,
  niveau = 1
): Relic[] {
  const exclus = new Set(dejaPrises.filter((id) => !RELICS.find((r) => r.id === id)?.cumulable));
  const conf = conflitsDe(dejaPrises);
  let pool = RELICS.filter(
    (r) =>
      !exclus.has(r.id) &&
      !conf.has(r.num) &&
      (!raretesMin || raretesMin.includes(r.rarete)) &&
      rareteAutorisee(r.rarete, niveau)
  );
  const out: Relic[] = [];
  while (out.length < nb && pool.length > 0) {
    const r = pickWeighted(pool, prog, rand);
    out.push(r);
    pool = pool.filter((x) => x.id !== r.id);
  }
  return out;
}

/** Nombre de propositions au prochain choix de relique (3 de base, 2 si Pacte). */
export function nbPropositions(bonus: RogueBonus): number {
  return bonus.pacteChoix > 0 ? bonus.pacteChoix : 3;
}

/** Nombre de reliques à prendre à ce choix (1 dans cette édition). */
export function nbAPrendre(_bonus: RogueBonus): number {
  return 1;
}

// --- Calcul du gain d'une question en mode rogue (fonction PURE) ---

/** Contexte d'une réponse pour le calcul du gain rogue. */
export interface GainContext {
  correct: boolean;
  secondesEcoulees: number;
  /** Durée réelle du timer de la question (10 s de base, 13 s si « dur », reliques rogue…). */
  dureeQuestion: number;
  mancheBonus: boolean;
  /** Nouveau streak si la réponse est bonne. */
  streak: number;
  /** Bonnes réponses AVANT celle-ci. */
  bonnesAvant: number;
  /** Index 0-based de la question dans la run. */
  index: number;
  /** Position dans le palier (1..10). */
  questionDansPalier: number;
  niveau: string;
  themeId: string;
  /** Thème de la question précédente (null si 1re question). */
  themePrecedent: string | null;
  /** Vies actuelles / vies max (Funambule). */
  vies: number;
  viesMax: number;
  /** Le joueur a misé sur cette question (Pari). */
  pariPlace: boolean;
  /** Nombre de reliques possédées (Collectionneur). */
  nbReliques: number;
  /** Thème choisi par Spécialiste (null si aucune). */
  themeSpecialiste: string | null;
  /** La question vient du meilleur thème (Zone de confort). */
  zoneConfort: boolean;
  /** Question de révision (erreur revenue plus tard). */
  isRevision: boolean;
  /** Question en « fièvre » (×3, chrono court). */
  fievreActive: boolean;
  /** Rebond actif (question après une erreur). */
  rebondActif: boolean;
  /** Question jackpot du palier. */
  jackpotActif: boolean;
  /** 50/50 actif sur la question : points divisés par 2. */
  div2: boolean;
}

/**
 * Gain d'une bonne réponse en Rogue Quizz : base arcade (20 − 1 pt/s, min 10,
 * ramenée à l'échelle de la durée réelle) modifiée par toutes les reliques.
 */
export function gainRogue(b: RogueBonus, ctx: GainContext): number {
  if (!ctx.correct) return 0;
  const sec = ctx.secondesEcoulees;
  const duree = Math.max(1, ctx.dureeQuestion);
  let g: number;
  if (b.pointsFlat !== null) {
    g = b.pointsFlat; // Tortue : points fixes
  } else if (b.primeVitesse) {
    g = Math.max(5, 30 - 2 * Math.floor(sec)); // Prime de vitesse
  } else {
    g = Math.max(10, 20 - Math.floor((sec * 10) / duree));
  }
  if (b.plancherMax > 0) g = Math.min(b.plancherMax, Math.max(b.plancherMin, g)); // Plancher
  if (ctx.mancheBonus) g *= 2;
  // multiplicateurs
  g *= 1 + b.pct / 100;
  g *= 1 + b.timerMalusPct / 100;
  if (b.boussole) g *= 1 - b.boussoleMalusPct / 100;
  if (b.specialiste) {
    g *= ctx.themeId === ctx.themeSpecialiste ? b.specialiste.mult : 1 - b.specialiste.malusPct / 100;
  }
  if (ctx.zoneConfort && b.zoneConfortMalusPct > 0) g *= 1 - b.zoneConfortMalusPct / 100;
  if (b.chasseur && ctx.niveau === 'dur') g *= 2;
  if (ctx.isRevision && b.revisionMult > 0) g *= b.revisionMult;
  if (ctx.fievreActive && b.fievre) g *= b.fievre.mult;
  if (ctx.rebondActif && b.rebond) g *= 2;
  if (ctx.pariPlace && b.pari) g *= 2;
  if (ctx.jackpotActif && b.jackpotMult > 0) g *= b.jackpotMult;
  if (b.combustionSeuil > 0 && ctx.streak >= b.combustionSeuil) g *= 2;
  if (ctx.questionDansPalier === 10 && b.dernierMotMult > 0) g *= b.dernierMotMult;
  if (b.funambulePctParVie > 0) {
    const manquantes = Math.max(0, ctx.viesMax - ctx.vies);
    g *= 1 + (b.funambulePctParVie / 100) * manquantes;
  }
  // ajouts
  g += b.flat;
  for (const s of b.speed) if (sec < s.maxS) g += s.n;
  if (b.collectionneur) g += ctx.nbReliques;
  if (b.antiRepete > 0 && ctx.themePrecedent !== null && ctx.themePrecedent !== ctx.themeId)
    g += b.antiRepete;
  if (ctx.div2 && b.cinquante) g /= b.cinquante.div; // 50/50 : points /2
  if (b.eliminationMaxPts > 0) g = Math.min(g, b.eliminationMaxPts); // Élimination : plafond
  return Math.round(g);
}

/**
 * Score final d'une run rogue : multiplicateurs de fin + plancher.
 * `win` = run terminée à 100 questions. `mortsAvant` = index de la question où la run meurt.
 */
export function scoreFinalRogue(
  b: RogueBonus,
  score: number,
  _win: boolean,
  _mortsAvant: number
): number {
  let s = score * b.finalMult;
  if (b.plancher > 0) s = Math.max(s, b.plancher);
  return Math.round(s);
}
