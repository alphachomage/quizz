// relics.ts — mode Rogue Quizz : les 60 reliques, le tirage des choix et le calcul
// des bonus agrégés. Module PUR : aucune dépendance au DOM ni au stockage.
import type { LevelId } from './types.js';

/** Rareté d'une relique (couleur + poids de tirage). */
export type RelicRarity = 'commun' | 'rare' | 'epique' | 'legendaire';

export const RARETE_POIDS: Record<RelicRarity, number> = {
  commun: 50,
  rare: 30,
  epique: 15,
  legendaire: 5,
};

export const RARETE_COULEUR: Record<RelicRarity, string> = {
  commun: '#9ca3af',
  rare: '#38bdf8',
  epique: '#c084fc',
  legendaire: '#fbbf24',
};

/** Effet machine d'une relique (les descriptions sont en français pour le joueur). */
export type RelicEffet =
  | { t: 'flat'; n: number } // +n pts par bonne réponse
  | { t: 'pct'; p: number } // +p % de pts par bonne réponse
  | { t: 'pctEarly'; p: number; seuil: number } // +p % avant la question `seuil`
  | { t: 'pctLate'; p: number; seuil: number } // +p % après la question `seuil`
  | { t: 'min'; n: number } // minimum de pointsFor relevé à n
  | { t: 'timer'; s: number } // +s secondes au timer de chaque question
  | { t: 'timerMalus'; s: number; p: number } // timer -s s mais +p % de pts
  | { t: 'zen'; s: number; div: number } // timer fixé à s secondes, pts /div
  | { t: 'speed'; maxS: number; n: number } // réponse en < maxS s : +n pts
  | { t: 'speedPct'; maxS: number; p: number } // réponse en < maxS s : +p % de pts
  | { t: 'streak'; seuil: number; n: number } // streak >= seuil : +n pts par bonne réponse
  | { t: 'palier'; tous: number; n: number } // toutes les `tous` bonnes réponses : +n pts
  | { t: 'niveau'; niv: LevelId; mult: number } // questions du niveau `niv` : pts x mult
  | { t: 'manche'; mult: number } // 3e manche : x mult (défaut 2)
  | { t: 'final'; mult: number } // score final x mult
  | { t: 'finalWin'; mult: number } // score final x mult si run terminée à 100
  | { t: 'finalEarly'; mult: number; seuil: number } // score final x mult si run finie avant `seuil`
  | { t: 'plancher'; n: number } // score final minimum garanti de n points
  | { t: 'fifty'; n: number } // 50/50 (retire 1 mauvaise réponse) sur les n prochaines questions
  | { t: 'skip'; n: number } // n questions passables sans pénalité (10 pts)
  | { t: 'repioche'; n: number } // n re-pioches de la question courante
  | { t: 'pardon'; n: number } // n erreurs annulées (la run continue)
  | { t: 'pardonAuto' } // la DERNIERE erreur de la run compte comme bonne
  | { t: 'rejouer'; n: number } // n fois : une erreur rejoue la même question
  | { t: 'fige'; n: number } // timer figé sur les n prochaines questions
  | { t: 'voir'; n: number } // voir la bonne réponse n fois (vaut 10 pts)
  | { t: 'immediat'; n: number } // +n pts tout de suite
  | { t: 'jackpot'; n: number } // la prochaine question vaut n pts si bonne réponse
  | { t: 'streakOneShot'; seuil: number; n: number } // atteindre le streak `seuil` : +n pts (1 fois)
  | { t: 'palierPct'; p: number } // +p % de pts sur les questions du palier courant
  | { t: 'themeCible'; mult: number } // un thème aléatoire de la run rapporte x mult
  | { t: 'antiRepete'; n: number } // question d'un autre thème que la précédente : +n pts
  | { t: 'themeBonus'; n: number } // chaque nouveau thème joué rapporte +n pts (1 fois/thème)
  | { t: 'themeVoyant' } // révèle le thème de la prochaine question
  | { t: 'niveauVoyant' } // révèle le niveau de la prochaine question
  | { t: 'palierVoyant' } // révèle le niveau de tout le palier courant
  | { t: 'reliqueGratuite' } // +1 relique aléatoire offerte immédiatement
  | { t: 'choixPlus'; n: number } // prochain choix de relique : +n propositions
  | { t: 'doubleChoix' } // prochain choix : prendre 2 reliques au lieu d'1
  | { t: 'choixMax' } // tous les prochains paliers : 6 propositions, 2 reliques à prendre
  | { t: 'premierePalier'; s: number } // 1re question de chaque palier à s secondes
  | { t: 'tempsFixe' } // le temps écoulé ne retire plus de points (20 pts fixe si correct)
  | { t: 'intemporel' } // timer +10 s ET tempsFixe
  | { t: 'comboZen'; s: number; p: number } // timer +s s et +p % de pts

/** Une relique : identité affichée + effet machine. */
export interface Relic {
  id: string;
  nom: string;
  icone: string;
  rarete: RelicRarity;
  desc: string;
  effet: RelicEffet;
}

/** Les 60 reliques du Rogue Quizz (24 commun, 18 rare, 12 épique, 6 légendaire). */
export const RELICS: Relic[] = [
  // --- COMMUNS (24) ---
  { id: 'cuillere-or', nom: 'Cuillère en or', icone: 'utensils', rarete: 'commun', desc: '+5 points à chaque bonne réponse', effet: { t: 'flat', n: 5 } },
  { id: 'petite-piece', nom: 'Petite pièce', icone: 'star', rarete: 'commun', desc: '+25 % de points sur chaque bonne réponse', effet: { t: 'pct', p: 25 } },
  { id: 'sablier', nom: 'Sablier', icone: 'hourglass', rarete: 'commun', desc: '+3 secondes par question (13 s)', effet: { t: 'timer', s: 3 } },
  { id: 'fer-a-cheval', nom: 'Fer à cheval', icone: 'clover', rarete: 'commun', desc: '+1 relique aléatoire offerte immédiatement', effet: { t: 'reliqueGratuite' } },
  { id: 'carte-tresor', nom: 'Carte au trésor', icone: 'map', rarete: 'commun', desc: 'Révèle le thème de la prochaine question', effet: { t: 'themeVoyant' } },
  { id: 'mulligan', nom: 'Mulligan', icone: 'refresh', rarete: 'commun', desc: 'Re-piocher la question courante (1 fois)', effet: { t: 'repioche', n: 1 } },
  { id: 'sprinter', nom: 'Sprinter', icone: 'play', rarete: 'commun', desc: '+25 % de points avant la 20e question', effet: { t: 'pctEarly', p: 25, seuil: 20 } },
  { id: 'lunettes', nom: 'Lunettes', icone: 'glasses', rarete: 'commun', desc: 'Affiche le niveau de la prochaine question', effet: { t: 'niveauVoyant' } },
  { id: 'cartographe', nom: 'Cartographe', icone: 'compass', rarete: 'commun', desc: 'Question d’un autre thème que la précédente : +25 points', effet: { t: 'antiRepete', n: 25 } },
  { id: 'montre', nom: 'Montre', icone: 'watch', rarete: 'commun', desc: '+2 secondes par question (12 s)', effet: { t: 'timer', s: 2 } },
  { id: 'cinquante', nom: '50/50', icone: 'scissors', rarete: 'commun', desc: 'Retire 1 mauvaise réponse sur la prochaine question', effet: { t: 'fifty', n: 1 } },
  { id: 'regard', nom: 'Regard perçant', icone: 'eye', rarete: 'commun', desc: 'Voir la bonne réponse (1 fois, vaut 10 pts)', effet: { t: 'voir', n: 1 } },
  { id: 'regen', nom: 'Régénération', icone: 'heart', rarete: 'commun', desc: '+50 points toutes les 10 bonnes réponses', effet: { t: 'palier', tous: 10, n: 50 } },
  { id: 'flamme', nom: 'Flamme', icone: 'flame', rarete: 'commun', desc: 'Dès 3 bonnes d’affilée : +10 points', effet: { t: 'streak', seuil: 3, n: 10 } },
  { id: 'eclair', nom: 'Éclair', icone: 'bolt', rarete: 'commun', desc: 'Réponse en moins de 3 s : +10 points', effet: { t: 'speed', maxS: 3, n: 10 } },
  { id: 'minuteur', nom: 'Minuteur', icone: 'alarm-clock', rarete: 'commun', desc: 'Réponse en moins de 5 s : +10 points', effet: { t: 'speed', maxS: 5, n: 10 } },
  { id: 'petite-montee', nom: 'Petite montée', icone: 'trending-up', rarete: 'commun', desc: 'Minimum de points relevé à 15', effet: { t: 'min', n: 15 } },
  { id: 'echelle', nom: 'Échelle', icone: 'scale', rarete: 'commun', desc: 'Timer −1 s mais +50 % de points', effet: { t: 'timerMalus', s: 1, p: 50 } },
  { id: 'zen', nom: 'Zen', icone: 'sun', rarete: 'commun', desc: '30 s par question mais points divisés par 2', effet: { t: 'zen', s: 30, div: 2 } },
  { id: 'des-fortune', nom: 'Dés de la fortune', icone: 'dice', rarete: 'commun', desc: 'Au prochain palier : 4 reliques proposées au lieu de 3', effet: { t: 'choixPlus', n: 1 } },
  { id: 'tresor', nom: 'Trésor enfoui', icone: 'gem', rarete: 'commun', desc: '+200 points immédiatement', effet: { t: 'immediat', n: 200 } },
  { id: 'coquillage', nom: 'Coquillage', icone: 'pin', rarete: 'commun', desc: '+15 % de points avant la 10e question', effet: { t: 'pctEarly', p: 15, seuil: 10 } },
  { id: 'arc', nom: 'Arc-descente', icone: 'trending-down', rarete: 'commun', desc: 'Toutes les questions du palier courant rapportent +50 %', effet: { t: 'palierPct', p: 50 } },
  { id: 'cible', nom: 'Cible', icone: 'target', rarete: 'commun', desc: 'Un thème aléatoire de la run rapporte ×2', effet: { t: 'themeCible', mult: 2 } },
  // --- RARES (18) ---
  { id: 'grosse-piece', nom: 'Grosse pièce', icone: 'coins', rarete: 'rare', desc: '+50 % de points sur chaque bonne réponse', effet: { t: 'pct', p: 50 } },
  { id: 'grosse-montee', nom: 'Grosse montée', icone: 'chart', rarete: 'rare', desc: 'Minimum de points relevé à 18', effet: { t: 'min', n: 18 } },
  { id: 'sablier-long', nom: 'Sablier long', icone: 'hourglass', rarete: 'rare', desc: '+5 secondes par question (15 s)', effet: { t: 'timer', s: 5 } },
  { id: 'cinquante-plus', nom: '50/50 +', icone: 'scissors', rarete: 'rare', desc: '50/50 sur les 3 prochaines questions', effet: { t: 'fifty', n: 3 } },
  { id: 'skip', nom: 'Skip', icone: 'forward', rarete: 'rare', desc: 'Passer 1 question sans pénalité (10 pts)', effet: { t: 'skip', n: 1 } },
  { id: 'mulligan-plus', nom: 'Mulligan +', icone: 'replay', rarete: 'rare', desc: 'Re-piocher la question courante (3 fois)', effet: { t: 'repioche', n: 3 } },
  { id: 'flamme-vive', nom: 'Flamme vive', icone: 'flame', rarete: 'rare', desc: 'Dès 5 bonnes d’affilée : +20 points', effet: { t: 'streak', seuil: 5, n: 20 } },
  { id: 'trophee-palier', nom: 'Trophée de palier', icone: 'trophy', rarete: 'rare', desc: '+100 points toutes les 10 bonnes réponses', effet: { t: 'palier', tous: 10, n: 100 } },
  { id: 'esprit-gardien', nom: 'Esprit gardien', icone: 'shield', rarete: 'rare', desc: '1 fois : une erreur rejoue la même question', effet: { t: 'rejouer', n: 1 } },
  { id: 'assurance', nom: 'Assurance', icone: 'umbrella', rarete: 'rare', desc: 'Score final minimum garanti de 500 points', effet: { t: 'plancher', n: 500 } },
  { id: 'sniper', nom: 'Sniper', icone: 'crosshair', rarete: 'rare', desc: 'Réponse en moins de 2 s : +50 % de points', effet: { t: 'speedPct', maxS: 2, p: 50 } },
  { id: 'moteur', nom: 'Moteur', icone: 'car', rarete: 'rare', desc: 'Réponse en moins de 2 s : points ×2', effet: { t: 'speedPct', maxS: 2, p: 100 } },
  { id: 'boule-cristal', nom: 'Boule de cristal', icone: 'orbit', rarete: 'rare', desc: 'Révèle le niveau de tout le palier courant', effet: { t: 'palierVoyant' } },
  { id: 'marathonien', nom: 'Marathonien', icone: 'podium', rarete: 'rare', desc: '+25 % de points après la 50e question', effet: { t: 'pctLate', p: 25, seuil: 50 } },
  { id: 'equilibre', nom: 'Équilibriste', icone: 'scale', rarete: 'rare', desc: 'Les questions faciles rapportent ×2', effet: { t: 'niveau', niv: 'facile', mult: 2 } },
  { id: 'verrou', nom: 'Verrou', icone: 'lock', rarete: 'rare', desc: 'Le temps écoulé ne retire plus de points', effet: { t: 'tempsFixe' } },
  { id: 'alarme', nom: 'Alarme', icone: 'timer', rarete: 'rare', desc: 'La 1re question de chaque palier démarre à 20 s', effet: { t: 'premierePalier', s: 20 } },
  { id: 'zigzag', nom: 'Zigzag', icone: 'sliders', rarete: 'rare', desc: 'Timer −2 s mais points ×2', effet: { t: 'timerMalus', s: 2, p: 100 } },
  // --- ÉPIQUES (12) ---
  { id: 'lame-double', nom: 'Lame double', icone: 'swords', rarete: 'epique', desc: 'Points ×2 sur chaque bonne réponse', effet: { t: 'pct', p: 100 } },
  { id: 'cinquante-ultime', nom: '50/50 ultime', icone: 'scissors', rarete: 'epique', desc: '50/50 sur toutes les questions restantes', effet: { t: 'fifty', n: 999 } },
  { id: 'skip-plus', nom: 'Skip +', icone: 'device', rarete: 'epique', desc: 'Passer 3 questions sans pénalité (10 pts)', effet: { t: 'skip', n: 3 } },
  { id: 'flamme-ardente', nom: 'Flamme ardente', icone: 'flame', rarete: 'epique', desc: 'Dès 10 bonnes d’affilée : +50 points', effet: { t: 'streak', seuil: 10, n: 50 } },
  { id: 'manches-x3', nom: 'Étincelles', icone: 'sparkles', rarete: 'epique', desc: 'La 3e manche rapporte ×3 au lieu de ×2', effet: { t: 'manche', mult: 3 } },
  { id: 'ankh', nom: 'Ankh', icone: 'ankh', rarete: 'epique', desc: 'Annule 1 erreur (la run continue)', effet: { t: 'pardon', n: 1 } },
  { id: 'jackpot', nom: 'Jackpot', icone: 'ticket', rarete: 'epique', desc: 'La prochaine question vaut 300 pts si bonne réponse', effet: { t: 'jackpot', n: 300 } },
  { id: 'combo-dore', nom: 'Combo doré', icone: 'crown', rarete: 'epique', desc: 'Atteindre 15 bonnes d’affilée : +500 points', effet: { t: 'streakOneShot', seuil: 15, n: 500 } },
  { id: 'double-choix', nom: 'Double relique', icone: 'copy', rarete: 'epique', desc: 'Au prochain palier, choisir 2 reliques au lieu d’1', effet: { t: 'doubleChoix' } },
  { id: 'fusee', nom: 'Fusée', icone: 'rocket', rarete: 'epique', desc: 'Run terminée à 100 questions : score final ×2', effet: { t: 'finalWin', mult: 2 } },
  { id: 'pause', nom: 'Pause', icone: 'pause', rarete: 'epique', desc: 'Timer figé sur les 3 prochaines questions', effet: { t: 'fige', n: 3 } },
  { id: 'cerveau', nom: 'Cerveau', icone: 'flask', rarete: 'epique', desc: 'Les questions difficiles rapportent ×2', effet: { t: 'niveau', niv: 'dur', mult: 2 } },
  // --- LÉGENDAIRES (6) ---
  { id: 'pacte', nom: 'Pacte du diable', icone: 'skull', rarete: 'legendaire', desc: 'Timer à 5 s mais points ×3', effet: { t: 'timerMalus', s: 5, p: 200 } },
  { id: 'seconde-chance', nom: 'Seconde chance', icone: 'heart-pulse', rarete: 'legendaire', desc: 'Annule 2 erreurs dans la run', effet: { t: 'pardon', n: 2 } },
  { id: 'intemporel', nom: 'Intemporel', icone: 'infinity', rarete: 'legendaire', desc: 'Timer +10 s ET le temps ne retire plus de points', effet: { t: 'intemporel' } },
  { id: 'phenix', nom: 'Phénix', icone: 'star', rarete: 'legendaire', desc: 'La dernière erreur de la run compte comme bonne', effet: { t: 'pardonAuto' } },
  { id: 'tresor-roi', nom: 'Trésor du roi', icone: 'podium', rarete: 'legendaire', desc: '+1000 points immédiatement', effet: { t: 'immediat', n: 1000 } },
  { id: 'relique-x4', nom: 'Relique ×4', icone: 'gem', rarete: 'legendaire', desc: 'Tous les prochains paliers : 6 propositions, 2 reliques à prendre', effet: { t: 'choixMax' } },
];

/** Bonus agrégés d'une run, calculés à partir des reliques choisies. */
export interface RogueBonus {
  flat: number;
  pct: number;
  pctEarly: { p: number; seuil: number }[];
  pctLate: { p: number; seuil: number }[];
  min: number;
  timerBonus: number;
  timerFixe: number | null; // timer fixé à cette valeur (zen)
  timerDiv: number; // diviseur de points (zen)
  timerMalusPct: number;
  tempsFixe: boolean;
  mancheMult: number;
  finalMult: number;
  finalWinMult: number;
  finalEarly: { mult: number; seuil: number } | null;
  plancher: number;
  niveauMult: Partial<Record<LevelId, number>>;
  streak: { seuil: number; n: number }[];
  palier: { tous: number; n: number }[];
  speed: { maxS: number; n: number; p: number }[];
  charges: {
    fifty: number;
    skip: number;
    repioche: number;
    pardon: number;
    rejouer: number;
    fige: number;
    voir: number;
  };
  jackpot: number;
  streakOneShot: { seuil: number; n: number }[];
  premierePalier: number;
  palierPct: number;
  themeCibleMult: number;
  antiRepete: number;
  themeBonus: number;
  themeVoyant: boolean;
  niveauVoyant: boolean;
  palierVoyant: boolean;
  reliqueGratuite: number;
  choixPlus: number;
  doubleChoix: boolean;
  choixMax: boolean;
  pardonAuto: boolean;
}

/** Bonus vides (aucune relique). */
export function emptyRogueBonus(): RogueBonus {
  return {
    flat: 0,
    pct: 0,
    pctEarly: [],
    pctLate: [],
    min: 0,
    timerBonus: 0,
    timerFixe: null,
    timerDiv: 1,
    timerMalusPct: 0,
    tempsFixe: false,
    mancheMult: 2,
    finalMult: 1,
    finalWinMult: 1,
    finalEarly: null,
    plancher: 0,
    niveauMult: {},
    streak: [],
    palier: [],
    speed: [],
    charges: { fifty: 0, skip: 0, repioche: 0, pardon: 0, rejouer: 0, fige: 0, voir: 0 },
    jackpot: 0,
    streakOneShot: [],
    premierePalier: 0,
    palierPct: 0,
    themeCibleMult: 1,
    antiRepete: 0,
    themeBonus: 0,
    themeVoyant: false,
    niveauVoyant: false,
    palierVoyant: false,
    reliqueGratuite: 0,
    choixPlus: 0,
    doubleChoix: false,
    choixMax: false,
    pardonAuto: false,
  };
}

/** Agrège les effets de toutes les reliques choisies en un objet RogueBonus. */
export function computeRogueBonus(relics: Relic[]): RogueBonus {
  const b = emptyRogueBonus();
  for (const r of relics) {
    const e = r.effet;
    switch (e.t) {
      case 'flat':
        b.flat += e.n;
        break;
      case 'pct':
        b.pct += e.p;
        break;
      case 'pctEarly':
        b.pctEarly.push({ p: e.p, seuil: e.seuil });
        break;
      case 'pctLate':
        b.pctLate.push({ p: e.p, seuil: e.seuil });
        break;
      case 'min':
        b.min = Math.max(b.min, e.n);
        break;
      case 'timer':
        b.timerBonus += e.s;
        break;
      case 'timerMalus':
        b.timerBonus -= e.s;
        b.timerMalusPct += e.p;
        break;
      case 'zen':
        b.timerFixe = e.s;
        b.timerDiv = e.div;
        break;
      case 'speed':
        b.speed.push({ maxS: e.maxS, n: e.n, p: 0 });
        break;
      case 'speedPct':
        b.speed.push({ maxS: e.maxS, n: 0, p: e.p });
        break;
      case 'streak':
        b.streak.push({ seuil: e.seuil, n: e.n });
        break;
      case 'palier':
        b.palier.push({ tous: e.tous, n: e.n });
        break;
      case 'niveau':
        b.niveauMult[e.niv] = Math.max(b.niveauMult[e.niv] || 1, e.mult);
        break;
      case 'manche':
        b.mancheMult = Math.max(b.mancheMult, e.mult);
        break;
      case 'final':
        b.finalMult *= e.mult;
        break;
      case 'finalWin':
        b.finalWinMult = Math.max(b.finalWinMult, e.mult);
        break;
      case 'finalEarly':
        b.finalEarly = { mult: e.mult, seuil: e.seuil };
        break;
      case 'fifty':
        b.charges.fifty += e.n;
        break;
      case 'skip':
        b.charges.skip += e.n;
        break;
      case 'repioche':
        b.charges.repioche += e.n;
        break;
      case 'pardon':
        b.charges.pardon += e.n;
        break;
      case 'pardonAuto':
        b.pardonAuto = true;
        break;
      case 'rejouer':
        b.charges.rejouer += e.n;
        break;
      case 'fige':
        b.charges.fige += e.n;
        break;
      case 'voir':
        b.charges.voir += e.n;
        break;
      case 'immediat':
        break; // appliqué au choix (pas un bonus passif)
      case 'jackpot':
        b.jackpot = Math.max(b.jackpot, e.n);
        break;
      case 'streakOneShot':
        b.streakOneShot.push({ seuil: e.seuil, n: e.n });
        break;
      case 'palierPct':
        b.palierPct = Math.max(b.palierPct, e.p);
        break;
      case 'themeCible':
        b.themeCibleMult = Math.max(b.themeCibleMult, e.mult);
        break;
      case 'antiRepete':
        b.antiRepete = Math.max(b.antiRepete, e.n);
        break;
      case 'plancher':
        b.plancher = Math.max(b.plancher, e.n);
        break;
      case 'themeBonus':
        b.themeBonus = Math.max(b.themeBonus, e.n);
        break;
      case 'themeVoyant':
        b.themeVoyant = true;
        break;
      case 'niveauVoyant':
        b.niveauVoyant = true;
        break;
      case 'palierVoyant':
        b.palierVoyant = true;
        break;
      case 'reliqueGratuite':
        b.reliqueGratuite += 1;
        break;
      case 'choixPlus':
        b.choixPlus += e.n;
        break;
      case 'doubleChoix':
        b.doubleChoix = true;
        break;
      case 'choixMax':
        b.choixMax = true;
        break;
      case 'premierePalier':
        b.premierePalier = Math.max(b.premierePalier, e.s);
        break;
      case 'tempsFixe':
        b.tempsFixe = true;
        break;
      case 'intemporel':
        b.tempsFixe = true;
        b.timerBonus += 10;
        break;
      case 'comboZen':
        b.timerBonus += e.s;
        b.pct += e.p;
        break;
    }
  }
  return b;
}

/** Tirage pondéré par rareté d'une relique dans le pool (sans remise). */
function pickWeighted(pool: Relic[], rand: () => number): Relic {
  const total = pool.reduce((a, r) => a + RARETE_POIDS[r.rarete], 0);
  let x = rand() * total;
  for (const r of pool) {
    x -= RARETE_POIDS[r.rarete];
    if (x <= 0) return r;
  }
  return pool[pool.length - 1];
}

/**
 * Propose `nb` reliques parmi celles dont les ids ne sont pas dans `dejaPrises`.
 * Tirage pondéré par rareté, sans remise. `rand` permet des tests déterministes.
 */
export function drawRelicChoices(
  dejaPrises: string[],
  nb = 3,
  rand: () => number = Math.random
): Relic[] {
  const pool = RELICS.filter((r) => !dejaPrises.includes(r.id));
  const out: Relic[] = [];
  const restant = [...pool];
  while (out.length < nb && restant.length > 0) {
    const r = pickWeighted(restant, rand);
    out.push(r);
    restant.splice(restant.indexOf(r), 1);
  }
  return out;
}

/** Nombre de propositions au prochain choix de relique (3 de base + bonus). */
export function nbPropositions(bonus: RogueBonus): number {
  if (bonus.choixMax) return 6;
  return 3 + bonus.choixPlus;
}

/** Nombre de reliques à prendre à ce choix (1 de base, 2 si doubleChoix/choixMax). */
export function nbAPrendre(bonus: RogueBonus): number {
  return bonus.choixMax || bonus.doubleChoix ? 2 : 1;
}

// --- Calcul du gain d'une question en mode rogue (fonction PURE) ---

/** Contexte d'une réponse pour le calcul du gain rogue. */
export interface GainContext {
  correct: boolean;
  secondesEcoulees: number;
  mancheBonus: boolean;
  /** Nouveau streak si la réponse est bonne. */
  streak: number;
  /** Bonnes réponses AVANT celle-ci. */
  bonnesAvant: number;
  /** Index 0-based de la question dans la run. */
  index: number;
  niveau: string;
  themeId: string;
  /** Thème de la question précédente (null si 1re question). */
  themePrecedent: string | null;
  /** Le thème de la question a déjà été joué dans la run. */
  themeDejaVu: boolean;
  /** Thème désigné par la relique « Cible » (null si aucune). */
  themeCibleId: string | null;
}

/**
 * Gain d'une bonne réponse en Rogue Quizz : base arcade (20 − 1 pt/s, min 10,
 * ×manche en 3e manche) modifiée par toutes les reliques passives.
 * `jackpot` > 0 remplace la base (relique Jackpot).
 */
export function gainRogue(b: RogueBonus, ctx: GainContext, jackpot: number): number {
  if (!ctx.correct) return 0;
  const sec = b.tempsFixe ? 0 : ctx.secondesEcoulees;
  const min = Math.max(10, b.min);
  let g = Math.max(min, 20 - Math.floor(sec));
  if (ctx.mancheBonus) g *= b.mancheMult; // mancheMult vaut 2 par défaut
  if (jackpot > 0) g = jackpot;
  const multNiv = b.niveauMult[ctx.niveau as LevelId] || 1;
  g *= multNiv;
  g *= 1 + b.pct / 100;
  g *= 1 + b.timerMalusPct / 100;
  const numQ = ctx.index + 1;
  for (const e of b.pctEarly) if (numQ < e.seuil) g *= 1 + e.p / 100;
  for (const e of b.pctLate) if (numQ > e.seuil) g *= 1 + e.p / 100;
  if (b.palierPct > 0) g *= 1 + b.palierPct / 100; // palier courant entier
  g += b.flat;
  for (const s of b.speed) if (sec < s.maxS) {
    g += s.n;
    g *= 1 + s.p / 100;
  }
  for (const st of b.streak) if (ctx.streak >= st.seuil) g += st.n;
  for (const p of b.palier) if ((ctx.bonnesAvant + 1) % p.tous === 0) g += p.n;
  if (b.antiRepete > 0 && ctx.themePrecedent !== null && ctx.themePrecedent !== ctx.themeId)
    g += b.antiRepete;
  if (ctx.themeCibleId && ctx.themeId === ctx.themeCibleId) g *= b.themeCibleMult;
  if (b.themeBonus > 0 && !ctx.themeDejaVu) g += b.themeBonus;
  return Math.round(g);
}

/**
 * Score final d'une run rogue : multiplicateurs de fin + plancher (Assurance).
 * `win` = run terminée à 100 questions sans erreur. `mortsAvant` = index de la question où la run meurt.
 */
export function scoreFinalRogue(
  b: RogueBonus,
  score: number,
  win: boolean,
  mortsAvant: number
): number {
  let s = score * b.finalMult;
  if (win) s *= b.finalWinMult;
  if (b.finalEarly && mortsAvant < b.finalEarly.seuil) s *= b.finalEarly.mult;
  if (b.plancher > 0) s = Math.max(s, b.plancher);
  return Math.round(s);
}
