// lib/rogueRun.ts — fonctions PURES du mode Rogue Quizz (paliers, masquage des réponses,
// durée du timer, pertes de vie, effets immédiats des reliques). Aucun import React/DOM.
import { ROGUE_STEP, dureePourNiveau, SECONDS_PER_QUESTION } from './scoring.js';
import { aRelic } from './relics.js';
import type { Relic, RelicEffet, RogueBonus } from './relics.js';
import type { Question, TaggedQuestion, Theme } from './types.js';

/** Question tirée : éventuellement taguée de son thème d'origine. */
export type RogueQuestion = Question & Partial<TaggedQuestion>;

/** Générateur aléatoire injectable (tests déterministes). */
export type Rng = () => number;

/** Compteurs/état d'un palier de 10 questions en mode rogue (reset à chaque palier). */
export interface PalierRogue {
  gele: boolean; // Arrêt sur image disponible
  secondSouffle: boolean; // Second souffle disponible
  cinquante: number; // 50/50 restants sur ce palier
  deuxiemeChance: boolean; // Deuxième chance disponible
  filet: number; // erreurs qui ne cassent pas la série (Filet de sécurité)
  bouclier: number; // erreurs sans perte de vie (Bouclier)
  pioche: number; // passes « thème » restantes (Pioche)
  retourArriere: boolean; // Annulation disponible (Retour en arrière)
  erreurs: number; // erreurs du palier
  points: number; // points marqués sur le palier (Tout ou rien)
  parfait: boolean; // palier sans erreur (Tout ou rien / Infirmerie)
  jackpot: number; // index absolu de la question jackpot du palier (−1 si aucune)
  reserve: number; // réserve de temps restante du palier (Marathon)
}

/** Palier « vide » (avant le choix de la première relique). */
export function palierVide(): PalierRogue {
  return {
    gele: false,
    secondSouffle: false,
    cinquante: 0,
    deuxiemeChance: false,
    filet: 0,
    bouclier: 0,
    pioche: 0,
    retourArriere: false,
    erreurs: 0,
    points: 0,
    parfait: true,
    jackpot: -1,
    reserve: 0,
  };
}

/** Construit l'état d'un palier à partir des reliques possédées. */
export function palierInitial(
  b: RogueBonus,
  relics: Relic[],
  indexDebut: number,
  rnd: Rng = Math.random
): PalierRogue {
  return {
    gele: aRelic(relics, 'arret-sur-image'),
    secondSouffle: aRelic(relics, 'second-souffle'),
    cinquante: b.cinquante ? b.cinquante.n : 0,
    deuxiemeChance: b.deuxiemeChancePts > 0,
    filet: b.filetSecurite ? 1 : 0,
    bouclier: b.bouclier ? 1 : 0,
    pioche: b.piocheParPalier,
    retourArriere: b.retourArriereMalusS > 0,
    erreurs: 0,
    points: 0,
    parfait: true,
    jackpot: b.jackpotMult > 0 ? indexDebut + Math.floor(rnd() * ROGUE_STEP) : -1,
    reserve: b.marathon ? b.marathon.reserve : 0,
  };
}

/** Rang (1..ROGUE_STEP) de la question dans son palier. */
export function questionDansPalier(index: number): number {
  return (index % ROGUE_STEP) + 1;
}

/** Ajoute à une question le thème d'origine. */
export function tagQuestion(q: Question, t: Theme): RogueQuestion {
  return { ...q, themeId: t.id, themeName: t.nom, themeColor: t.couleur, themeIcon: t.icone };
}

/** Élément au hasard d'un tableau non vide. */
export function pickRandom<T>(arr: T[], rnd: Rng = Math.random): T {
  return arr[Math.floor(rnd() * arr.length)];
}

/** Thème avec le plus de bonnes réponses (à défaut : le premier thème). */
export function meilleurTheme(
  dets: { themeId: string; correct: boolean }[],
  themes: Theme[]
): string | null {
  const compte = new Map<string, number>();
  for (const d of dets) if (d.correct) compte.set(d.themeId, (compte.get(d.themeId) || 0) + 1);
  let best: string | null = null;
  let max = 0;
  for (const [t, n] of compte)
    if (n > max) {
      max = n;
      best = t;
    }
  if (!best && themes.length > 0) best = themes[0].id;
  return best;
}

/** Questions d'un niveau donné pas encore jouées, dans les thèmes fournis. */
export function candidates(
  themes: Theme[],
  niveau: string | undefined,
  dejaJouee: (q: string) => boolean
): RogueQuestion[] {
  return themes.flatMap((t) =>
    t.questions.filter((x) => x.niveau === niveau && !dejaJouee(x.q)).map((x) => tagQuestion(x, t))
  );
}

/** Niveau immédiatement inférieur (Retour à l'école). */
export function niveauInferieur(niveau: string | undefined): string | undefined {
  return niveau === 'dur' ? 'moyen' : niveau === 'moyen' ? 'facile' : niveau;
}

/** Niveau immédiatement supérieur (Pioche). */
export function niveauSuperieur(niveau: string | undefined): string {
  return niveau === 'facile' ? 'moyen' : 'dur';
}

/** Indices des mauvaises réponses. */
function mauvaises(q: Question): number[] {
  return q.reponses.map((_, i) => i).filter((i) => i !== q.bonne);
}

/** Réponses à masquer : 50/50 (2 mauvaises) puis Domino (ne garder que la bonne + 1 mauvaise). */
export function reponsesAMasquer(
  q: Question,
  opts: { cinquante: boolean; domino: boolean },
  rnd: Rng = Math.random
): number[] {
  const masquees: number[] = [];
  if (opts.cinquante && q.reponses.length > 3) {
    const m = mauvaises(q);
    const m1 = m[Math.floor(rnd() * m.length)];
    const reste = m.filter((i) => i !== m1);
    masquees.push(m1, reste[Math.floor(rnd() * reste.length)]);
  }
  if (opts.domino && q.reponses.length > 2) masquees.push(...mauvaises(q).slice(1));
  return masquees;
}

/** Retire les réponses masquées et recale l'index de la bonne réponse. */
export function appliquerMasquees<T extends Question>(q: T, masquees: number[]): T {
  const reponses = q.reponses.filter((_, i) => !masquees.includes(i));
  // Nouvel index = ancien index − nombre de réponses masquées situées avant la bonne.
  const bonne = q.bonne - masquees.filter((m) => m < q.bonne).length;
  return { ...q, reponses, bonne };
}

/** Mélange l'ordre des réponses (Miroir, Pioche) en recalculant la bonne. */
export function melangerReponses<T extends Question>(q: T, rnd: Rng = Math.random): T {
  const ordre = q.reponses.map((_, i) => i).sort(() => rnd() - 0.5);
  return { ...q, reponses: ordre.map((i) => q.reponses[i]), bonne: ordre.indexOf(q.bonne) };
}

/** Indices surlignés par la Loupe : la bonne + 1 mauvaise. */
export function surbrillanceLoupe(q: Question, rnd: Rng = Math.random): number[] {
  return [q.bonne, pickRandom(mauvaises(q), rnd)];
}

/** Réponse barrée (Lunettes rouges) : 1 mauvaise au hasard. */
export function reponseBarree(q: Question, rnd: Rng = Math.random): number | null {
  const m = mauvaises(q);
  return m.length > 0 ? pickRandom(m, rnd) : null;
}

/** Pourcentages du Vote du public (~75 % fiables : la bonne est en tête). */
export function votePublicPcts(q: Question, rnd: Rng = Math.random): number[] {
  const pcts = q.reponses.map(() => 5 + Math.floor(rnd() * 90));
  const total = pcts.reduce((a, x) => a + x, 0);
  const normalises = pcts.map((x) => Math.round((x / total) * 100));
  if (rnd() < 0.75) {
    const maxAutre = Math.max(...normalises.filter((_, i) => i !== q.bonne));
    normalises[q.bonne] = maxAutre + 1 + Math.floor(rnd() * 20);
  }
  return normalises;
}

/** Paramètres de calcul de la durée du timer rogue. */
export interface DureeRogueParams {
  b: RogueBonus;
  niveau: string | undefined;
  index: number;
  carryBonus: number;
  retourArriereMalus: number;
  reserve: number;
  streak: number;
  fievreRestant: number;
}

/** Durée du timer d'une question rogue (niveau + reliques + malus). */
export function dureeRogue(p: DureeRogueParams): number {
  const { b } = p;
  if (b.marathon) return Math.max(1, p.reserve); // le timer = la réserve restante du palier
  let d = dureePourNiveau(p.niveau, SECONDS_PER_QUESTION);
  d += b.timerBonus + p.carryBonus - p.retourArriereMalus;
  if (b.loupeMalusS > 0) d -= b.loupeMalusS;
  if (b.indiceMalusS > 0) d -= b.indiceMalusS;
  if (b.rayonXMalusS > 0 && questionDansPalier(p.index) > 1) d -= b.rayonXMalusS;
  if (b.combustionSeuil > 0 && p.streak >= b.combustionSeuil)
    d = Math.max(4, d - (p.streak - b.combustionSeuil));
  d *= b.timerMult;
  if (b.fievre && p.fievreRestant > 0) d = b.fievre.s;
  return Math.max(1, Math.round(d));
}

/** Temps reporté à la question suivante (Horloge partagée / Momentum / Encyclopédie). */
export function carrySuivant(
  b: RogueBonus,
  correct: boolean,
  carryActuel: number,
  duree: number,
  ecoulees: number
): number {
  if (!correct) return 0;
  let carry = carryActuel;
  if (b.carryMax > 0) carry = Math.min(b.carryMax, Math.max(0, duree - ecoulees));
  else if (b.momentumMax > 0) carry = ecoulees < 5 ? Math.min(b.momentumMax, carry + 1) : 0;
  const plafond = b.carryMax + b.momentumMax + b.encyclopedieS || 5;
  return Math.min(plafond, carry + (b.encyclopedieS > 0 ? b.encyclopedieS : 0));
}

/** Vies perdues sur une erreur (Domino, Pari, Temps mort), avant Bouclier. */
export function viesPerdues(
  b: RogueBonus,
  o: { domino: boolean; pariPlace: boolean; tempsEcoule: boolean }
): number {
  let perte = 1;
  if (o.domino && b.dominoVies > 0) perte = b.dominoVies; // Domino : −2 vies
  if (o.pariPlace && b.pari) perte += 1; // Pari perdu : −1 vie de plus
  if (o.tempsEcoule && b.tempsMort) perte = 0; // Temps mort : le chrono ne coûte plus de vie
  return perte;
}

/** Effet d'une relique sur les vies au moment du choix ({vies, viesMax} après effet). */
export function appliquerEffetVies(
  e: RelicEffet,
  vies: number,
  viesMax: number
): { vies: number; viesMax: number } {
  if (e.t === 'vie') return { viesMax: viesMax + e.n, vies: Math.min(vies + e.soin, viesMax + e.n) };
  if (e.t === 'verreCristal') return { viesMax: 1, vies: Math.min(vies, 1) };
  if (e.t === 'pacteVies') return { viesMax: viesMax + e.vies, vies: Math.min(vies, viesMax + e.vies) };
  return { vies, viesMax };
}

/** Débloque, sur le palier courant, les compteurs de la relique qui vient d'être choisie. */
export function appliquerEffetPalier(
  p: PalierRogue,
  e: RelicEffet,
  index: number,
  rnd: Rng = Math.random
): PalierRogue {
  return {
    ...p,
    gele: p.gele || e.t === 'gele',
    secondSouffle: p.secondSouffle || e.t === 'secondSouffle',
    cinquante: p.cinquante + (e.t === 'cinquante' ? e.n : 0),
    deuxiemeChance: p.deuxiemeChance || e.t === 'deuxiemeChance',
    filet: p.filet + (e.t === 'filetSecurite' ? 1 : 0),
    bouclier: p.bouclier + (e.t === 'bouclier' ? 1 : 0),
    pioche: p.pioche + (e.t === 'pioche' ? e.n : 0),
    retourArriere: p.retourArriere || e.t === 'retourArriere',
    jackpot:
      p.jackpot >= 0
        ? p.jackpot
        : e.t === 'jackpotPalier'
          ? index + 1 + Math.floor(rnd() * (ROGUE_STEP - 1))
          : -1,
    reserve: e.t === 'marathon' ? e.reserve : p.reserve,
  };
}
