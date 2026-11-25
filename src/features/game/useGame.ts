// features/game/useGame.ts — TOUTE la logique d'une partie (états, actions, effets).
// extraite de l'ancien god composant Partie.jsx. Testable hors React.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  RELIC_CHOICE_SECONDS,
  ROGUE_MAX,
  ROGUE_STEP,
  dureePourNiveau,
  pointsFor,
  roundInfo,
  SECONDS_PER_QUESTION,
} from '@lib/scoring.js';
import { addReport, loadReports } from '@lib/reports.js';
import type { StoredReport } from '@lib/reports.js';
import { seriesKey, saveSeries } from '@lib/series.js';
import { currentDailyStreak } from '@lib/streak.js';
import { playSound, soundForStreak, vibrate, startMusic, stopMusic } from '@lib/sounds.js';
import type { GameDetail, GameMode, GameResult, LevelId, Prefs, Question, Theme } from '@lib/types.js';
import {
  RELICS,
  aRelic,
  computeRogueBonus,
  drawRelicChoices,
  gainRogue,
  nbAPrendre,
  nbPropositions,
  scoreFinalRogue,
} from '@lib/relics.js';
import type { Relic, RogueBonus } from '@lib/relics.js';
import { CONFETTI_COLORS } from './constants.js';
import { drawGameQuestions } from './draw.js';
import type { DrawnQuestion, GameLaunchConfig } from './draw.js';
import { useTimer } from './useTimer.js';

/** Phases d'une partie : attente (duel), question en cours, réponse verrouillée, choix de relique (rogue). */
export type GamePhase = 'attente' | 'question' | 'reponse' | 'relique';

/** Un morceau de confetti (positions/taille/couleur calculés au lancement). */
export interface ConfettiPiece {
  id: string;
  left: number;
  delay: number;
  couleur: string;
  taille: number;
  rotation: number;
}

/** Détail interne d'une question jouée : GameDetail + champs de stats avancées. */
interface DetailPartie extends GameDetail {
  streak: number;
  bonusStreak: number;
  secondes: number;
}

/** Paramètres du hook useGame (identiques aux props de l'écran Game). */
export interface UseGameParams {
  config: GameLaunchConfig;
  prefs: Prefs;
  onFinish: (result: GameResult) => void;
  onQuit: (result: GameResult) => void;
}

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

/** Construit l'état d'un palier à partir des reliques possédées. */
export function palierInitial(b: RogueBonus, relics: Relic[], indexDebut: number): PalierRogue {
  const dansPalier = ROGUE_STEP;
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
    jackpot: b.jackpotMult > 0 ? indexDebut + Math.floor(Math.random() * dansPalier) : -1,
    reserve: b.marathon ? b.marathon.reserve : 0,
  };
}

/** État complet d'une partie exposé aux composants d'affichage. */
export interface GameState {
  config: GameLaunchConfig;
  mode: GameMode;
  niveau: LevelId | string | null;
  theme: Theme;
  players: string[];
  nbJoueurs: number;
  questions: DrawnQuestion[];
  question: DrawnQuestion;
  index: number;
  currentPlayer: number;
  phase: GamePhase;
  time: number;
  second: number;
  selection: number | null;
  scores: number[];
  bonnes: number[];
  lastGain: number;
  lastBonus: number;
  streaks: number[];
  confetti: ConfettiPiece[];
  isReported: boolean;
  answer: (i: number | null) => void;
  suivant: () => void;
  pret: () => void;
  finir: () => void;
  abandonner: () => void;
  reportQuestion: () => void;
  // --- Rogue Quizz ---
  relics: Relic[];
  proposals: Relic[];
  rogueBonus: RogueBonus;
  /** Question affichée (reliques 50/50, Domino, Miroir… appliquées). */
  questionAffichage: DrawnQuestion;
  /** Durée du timer de la question courante (niveau + reliques). */
  dureeQuestion: number;
  /** Secondes écoulées sur la question courante (pour Élimination / Brouillard). */
  ecoulees: number;
  /** Secondes restantes pour le choix de relique (auto-choix à 0). */
  tempsChoix: number;
  /** Vies restantes / vies max (mode rogue). */
  vies: number;
  viesMax: number;
  /** Compteurs du palier courant. */
  palier: PalierRogue;
  /** Mise placée sur la question courante (Pari). */
  pariPlacee: boolean;
  /** Gel du chrono en cours (Arrêt sur image), secondes restantes. */
  geleRestant: number;
  /** La bonne réponse est montrée (Rayon X). */
  bonneRevelee: boolean;
  /** Relique « Timer figé » (gel manuel) : le chrono est en pause. */
  timerFige: boolean;
  /** Indices de réponses surlignées (Loupe). */
  surbrillance: number[];
  /** Indice de la réponse barrée (Lunettes rouges). */
  barree: number | null;
  /** Pourcentages du Vote du public. */
  votePcts: number[] | null;
  /** La bonne réponse scintille (Intuition). */
  scintille: boolean;
  /** Choix de relique : étape recyclage ('sacrifice' = choisir une relique à retirer). */
  recyclageEtape: 'sacrifice' | 'nouveau' | null;
  /** Spécialiste : choisir le thème spécial (overlay de thèmes). */
  themeAPicker: boolean;
  /** Thème choisi par Spécialiste. */
  themeSpecialiste: string | null;
  choisirRelique: (id: string) => void;
  /** Refuser le choix de relique (Ascète : +150 pts). */
  refuserChoix: () => void;
  /** Retirer une relique possédée (Recyclage, étape sacrifice). */
  sacrifierRelique: (id: string) => void;
  /** Choisir le thème de Spécialiste. */
  choisirThemeSpecialiste: (themeId: string) => void;
  gelerChrono: () => void;
  miser: () => void;
  passerTheme: () => void;
  annulerReponse: () => void;
}

/** Pastille de thème affichée dans la barre du haut (champs optionnels : thème courant variable). */
export interface ThemeBadge {
  nom?: string;
  icone?: string;
  couleur?: string;
}

/** État de jeu enrichi pour l'affichage : GameState + manche en cours et thème courant. */
export interface GameViewState extends GameState {
  round: number;
  bonus: boolean;
  withRounds: boolean;
  currentTheme: ThemeBadge;
}

/** Snapshot pour « Retour en arrière » : restaure l'état d'avant la dernière réponse. */
interface Snapshot {
  scores: number[];
  bonnes: number[];
  streaks: number[];
  vies: number;
  details: DetailPartie[];
  index: number;
}

export function useGame({ config, prefs, onFinish, onQuit }: UseGameParams): GameState {
  const { mode, niveau, theme, players = [] } = config;
  const nbJoueurs = mode === 'duel' ? 2 : 1;

  // ALEATOIRE : à chaque partie, chaque joueur reçoit son propre tirage au hasard.
  const questionsPerPlayer = useMemo(() => drawGameQuestions(config), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = useState(0); // question courante (0..n-1)
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [phase, setPhase] = useState<GamePhase>(
    mode === 'duel' ? 'attente' : mode === 'rogue' ? 'relique' : 'question'
  );
  const [selection, setSelection] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [bonnes, setBonnes] = useState<number[]>([0, 0]);
  const [lastGain, setLastGain] = useState(0);
  const [lastBonus, setLastBonus] = useState(0);
  const [streaks, setStreaks] = useState<number[]>([0, 0]);
  const [lastCorrect, setLastCorrect] = useState(true);
  const [details, setDetails] = useState<DetailPartie[]>([]);
  const [confetti, setConfettis] = useState<ConfettiPiece[]>([]);
  const [signales, setSignales] = useState<StoredReport[]>(() => loadReports());

  // --- État Rogue Quizz (reliques, vies, paliers) ---
  const [relics, setRelics] = useState<Relic[]>([]);
  const [proposals, setProposals] = useState<Relic[]>([]);
  const [aPrendre, setAPrendre] = useState(1);
  const [questionAffichage, setQuestionAffichage] = useState<DrawnQuestion>(
    () => questionsPerPlayer[0][0]
  );
  const [reponsesMasquees, setReponsesMasquees] = useState<number[]>([]); // 50/50
  const [dominoActif, setDominoActif] = useState(false); // question à 2 réponses
  const [bonneRevelee, setBonneRevelee] = useState(false); // Rayon X
  const [timerFige, setTimerFige] = useState(false); // gel manuel en cours
  const [vies, setVies] = useState(1);
  const [viesMax, setViesMax] = useState(1);
  const [palier, setPalier] = useState<PalierRogue>(() => ({
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
  }));
  const [pariPlacee, setPariPlacee] = useState(false);
  const [geleRestant, setGeleRestant] = useState(0);
  const [dureeOverride, setDureeOverride] = useState<number | null>(null); // Second souffle
  const [carryBonus, setCarryBonus] = useState(0); // temps reporté (Horloge partagée / Momentum / Encyclopédie)
  const [fievreRestant, setFievreRestant] = useState(0);
  const [rebondActif, setRebondActif] = useState(false);
  const [revisionPool, setRevisionPool] = useState<DrawnQuestion[]>([]);
  const [isRevisionQ, setIsRevisionQ] = useState(false);
  const [zoneConfortQ, setZoneConfortQ] = useState(false);
  const [surbrillance, setSurbrillance] = useState<number[]>([]);
  const [barree, setBarree] = useState<number | null>(null);
  const [votePcts, setVotePcts] = useState<number[] | null>(null);
  const [scintille, setScintille] = useState(false);
  const [miroirFait, setMiroirFait] = useState(false);
  const [retryEnCours, setRetryEnCours] = useState(false);
  const [themeSpecialiste, setThemeSpecialiste] = useState<string | null>(null);
  const [themeAPicker, setThemeAPicker] = useState(false);
  const [recyclageEtape, setRecyclageEtape] = useState<'sacrifice' | 'nouveau' | null>(null);
  const [echoActif, setEchoActif] = useState(false);
  const [dernierChoix, setDernierChoix] = useState<string | null>(null);
  const [assuranceUtilise, setAssuranceUtilise] = useState(false);
  const [palierEcole, setPalierEcole] = useState<number | null>(null); // Retour à l'école
  const rogueBonus = useMemo(() => computeRogueBonus(relics), [relics]);

  // Refs miroirs (évite les closures périmées dans les callbacks du timer).
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const viesRef = useRef(1);
  const palierRef = useRef(palier);
  palierRef.current = palier;
  const rogueBonusRef = useRef(rogueBonus);
  rogueBonusRef.current = rogueBonus;
  const relicsRef = useRef(relics);
  relicsRef.current = relics;
  const snapshotRef = useRef<Snapshot | null>(null);
  const qAffRef = useRef(questionAffichage);
  qAffRef.current = questionAffichage;
  // Refs miroirs supplémentaires (déclarés tôt : le mémo dureeQuestion les lit au rendu).
  const scoresRef = useRef(scores);
  scoresRef.current = scores;
  const bonnesRef = useRef(bonnes);
  bonnesRef.current = bonnes;
  const streaksRef = useRef(streaks);
  streaksRef.current = streaks;
  const detailsRef = useRef(details);
  detailsRef.current = details;
  const revisionPoolRef = useRef(revisionPool);
  revisionPoolRef.current = revisionPool;
  const palierEcoleRef = useRef(palierEcole);
  palierEcoleRef.current = palierEcole;
  const retourArriereMalusRef = useRef(0);
  const answerRef = useRef<(i: number | null) => void>(() => {});
  const pariPlaceeRef = useRef(pariPlacee);
  pariPlaceeRef.current = pariPlacee;
  const viesMaxRef = useRef(viesMax);
  viesMaxRef.current = viesMax;
  const fievreRestantRef = useRef(fievreRestant);
  fievreRestantRef.current = fievreRestant;
  const reponsesMasqueesRef = useRef(reponsesMasquees);
  reponsesMasqueesRef.current = reponsesMasquees;
  const assuranceUtiliseRef = useRef(assuranceUtilise);
  assuranceUtiliseRef.current = assuranceUtilise;
  const carryBonusRef = useRef(carryBonus);
  carryBonusRef.current = carryBonus;

  // En rogue, les questions sont dans un état mutable (Pioche, Révision, Zone de confort…).
  const [questionsRogue, setQuestionsRogue] = useState<DrawnQuestion[] | null>(() =>
    mode === 'rogue' ? questionsPerPlayer[currentPlayer] : null
  );
  const questions = mode === 'rogue' && questionsRogue ? questionsRogue : questionsPerPlayer[currentPlayer];
  const question = questions[Math.min(index, questions.length - 1)];

  // Au lancement d'une run rogue : première proposition de reliques (choix de départ).
  useEffect(() => {
    if (mode === 'rogue' && proposals.length === 0 && relics.length === 0) {
      setProposals(drawRelicChoices([], nbPropositions(computeRogueBonus([])), Math.random, 0));
      setAPrendre(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // --- Mise en place de chaque question (mode rogue) ---
  const modifieRef = useRef(new Set<number>());
  useEffect(() => {
    if (mode !== 'rogue') {
      setQuestionAffichage(question);
      return;
    }
    const b = rogueBonusRef.current;
    const qDansPalier = (index % ROGUE_STEP) + 1;
    let q = questions[Math.min(index, questions.length - 1)];
    // Swaps de question (une fois par index) : Révision, Zone de confort, Chasseur, Retour à l'école.
    if (!modifieRef.current.has(index)) {
      modifieRef.current.add(index);
      let zoneConfort = false;
      let revision = false;
      // Révision : les erreurs reviennent en fin de palier
      if (b.revisionMult > 0 && revisionPoolRef.current.length > 0 && qDansPalier >= ROGUE_STEP - 1) {
        const rev = revisionPoolRef.current[0];
        revisionPoolRef.current = revisionPoolRef.current.slice(1);
        q = rev;
        revision = true;
        setQuestionsRogue((qs) => (qs ? [...qs.slice(0, index), q, ...qs.slice(index + 1)] : qs));
      }
      // Zone de confort : 1 question sur 3 vient du meilleur thème
      if (b.zoneConfortMalusPct > 0 && qDansPalier % 3 === 1) {
        const bestId = meilleurTheme(detailsRef.current, config.allThemes || []);
        const bestThemeObj = (config.allThemes || []).find((t) => t.id === bestId);
        if (bestId && bestThemeObj && q.themeId !== bestId) {
          const cand = bestThemeObj.questions
            .filter((x) => x.niveau === q.niveau && !dejaJouee(x.q))
            .map((x) => tag(x, bestThemeObj));
          if (cand.length > 0) {
            q = cand[Math.floor(Math.random() * cand.length)];
            zoneConfort = true;
            setQuestionsRogue((qs) => (qs ? [...qs.slice(0, index), q, ...qs.slice(index + 1)] : qs));
          }
        }
      }
      // Chasseur : les questions dur arrivent plus souvent (swap ~1/3 des non-dur)
      if (b.chasseur && q.niveau !== 'dur' && Math.random() < 0.34) {
        const cand = (config.allThemes || []).flatMap((t) =>
          t.questions.filter((x) => x.niveau === 'dur' && !dejaJouee(x.q)).map((x) => tag(x, t))
        );
        if (cand.length > 0) {
          q = cand[Math.floor(Math.random() * cand.length)];
          setQuestionsRogue((qs) => (qs ? [...qs.slice(0, index), q, ...qs.slice(index + 1)] : qs));
        }
      }
      // Retour à l'école : ce palier est un cran moins difficile
      if (palierEcoleRef.current === Math.floor(index / ROGUE_STEP)) {
        const nivInf = q.niveau === 'dur' ? 'moyen' : q.niveau === 'moyen' ? 'facile' : q.niveau;
        const cand = (config.allThemes || []).flatMap((t) =>
          t.questions
            .filter((x) => x.niveau === nivInf && !dejaJouee(x.q))
            .map((x) => tag(x, t))
        );
        if (cand.length > 0) {
          q = cand[Math.floor(Math.random() * cand.length)];
          setQuestionsRogue((qs) => (qs ? [...qs.slice(0, index), q, ...qs.slice(index + 1)] : qs));
        }
      }
      setIsRevisionQ(revision);
      setZoneConfortQ(zoneConfort);
    }
    // Marathon : réserve à 0 -> toutes les questions restantes du palier sont ratées.
    if (b.marathon && palierRef.current.reserve <= 0) {
      setQuestionAffichage(q);
      answerRef.current(null);
      return;
    }
    // Effets visuels / structurels de la question.
    const masquees: number[] = [];
    let domino = false;
    if (palierRef.current.cinquante > 0 && q.reponses.length > 3) {
      const mauvaises = q.reponses.map((_, i) => i).filter((i) => i !== q.bonne);
      // retire 2 mauvaises réponses
      const m1 = mauvaises[Math.floor(Math.random() * mauvaises.length)];
      const reste = mauvaises.filter((i) => i !== m1);
      const m2 = reste[Math.floor(Math.random() * reste.length)];
      masquees.push(m1, m2);
      setPalier((p) => ({ ...p, cinquante: p.cinquante - 1 }));
    }
    if (b.dominoVies > 0 && streaksRef.current[currentPlayer] >= 3 && q.reponses.length > 2) {
      domino = true; // on ne garde que la bonne + 1 mauvaise
      const mauvaise = q.reponses.map((_, i) => i).filter((i) => i !== q.bonne);
      masquees.push(...mauvaise.slice(1));
    }
    setDominoActif(domino);
    setReponsesMasquees(masquees);
    // Loupe : surligne la bonne + 1 mauvaise
    if (b.loupeMalusS > 0) {
      const mauvaises = q.reponses.map((_, i) => i).filter((i) => i !== q.bonne);
      setSurbrillance([q.bonne, mauvaises[Math.floor(Math.random() * mauvaises.length)]]);
    } else setSurbrillance([]);
    // Lunettes rouges : barre 1 mauvaise réponse
    if (b.barreeFlat < 0) {
      const mauvaises = q.reponses.map((_, i) => i).filter((i) => i !== q.bonne);
      setBarree(mauvaises.length > 0 ? mauvaises[Math.floor(Math.random() * mauvaises.length)] : null);
    } else setBarree(null);
    // Vote du public : pourcentages (~75 % fiables)
    if (b.votePublic) {
      const pcts = q.reponses.map(() => 5 + Math.floor(Math.random() * 90));
      const total = pcts.reduce((a, x) => a + x, 0);
      const normalises = pcts.map((x) => Math.round((x / total) * 100));
      if (Math.random() < 0.75) {
        // la bonne réponse a le plus gros pourcentage
        const maxAutre = Math.max(...normalises.filter((_, i) => i !== q.bonne));
        normalises[q.bonne] = maxAutre + 1 + Math.floor(Math.random() * 20);
      }
      setVotePcts(normalises);
    } else setVotePcts(null);
    // Intuition : 1 question sur 3, la bonne scintille
    setScintille(b.intuition && qDansPalier % 3 === 1);
    // Rayon X : 1re question du palier, la bonne réponse est montrée
    setBonneRevelee(b.rayonXMalusS > 0 && qDansPalier === 1);
    setPariPlacee(false);
    setMiroirFait(false);
    setRetryEnCours(false);
    setDureeOverride(null);
    // Snapshot pour « Retour en arrière »
    snapshotRef.current = {
      scores: scoresRef.current,
      bonnes: bonnesRef.current,
      streaks: streaksRef.current,
      vies: viesRef.current,
      details: detailsRef.current,
      index,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode]);

  // Application structurelle des réponses masquées (50/50, Domino) sur la question affichée.
  useEffect(() => {
    if (mode !== 'rogue') {
      setQuestionAffichage(question);
      return;
    }
    if (reponsesMasquees.length === 0) {
      setQuestionAffichage(question);
      return;
    }
    const masq = [...reponsesMasquees].sort((a, b) => a - b);
    const reponses = question.reponses.filter((_, i) => !masq.includes(i));
    let bonne = question.bonne;
    for (const m of masq) if (m < bonne) bonne -= 1;
    setQuestionAffichage({ ...question, reponses, bonne });
  }, [mode, question, reponsesMasquees]);

  // Guard pool vide.
  const finiVideRef = useRef(false);
  useEffect(() => {
    if (questions.length === 0 && !finiVideRef.current) {
      finiVideRef.current = true;
      finir();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);

  // Durée du timer de la question courante.
  const dureeQuestion = useMemo(() => {
    if (mode !== 'rogue') return dureePourNiveau(question.niveau, SECONDS_PER_QUESTION);
    if (dureeOverride !== null) return dureeOverride;
    const b = rogueBonus;
    const qDansPalier = (index % ROGUE_STEP) + 1;
    // Marathon : le timer = la réserve restante du palier.
    if (b.marathon) return Math.max(1, palier.reserve);
    let d = dureePourNiveau(question.niveau, SECONDS_PER_QUESTION);
    d += b.timerBonus + carryBonus - (retourArriereMalusRef.current || 0);
    if (b.loupeMalusS > 0) d -= b.loupeMalusS;
    if (b.indiceMalusS > 0) d -= b.indiceMalusS;
    if (b.rayonXMalusS > 0 && qDansPalier > 1) d -= b.rayonXMalusS;
    if (b.combustionSeuil > 0 && streaks[currentPlayer] >= b.combustionSeuil)
      d = Math.max(4, d - (streaks[currentPlayer] - b.combustionSeuil));
    d *= b.timerMult;
    if (b.fievre && fievreRestant > 0) d = b.fievre.s;
    return Math.max(1, Math.round(d));
  }, [mode, rogueBonus, index, question.niveau, carryBonus, dureeOverride, palier.reserve, fievreRestant, streaks, currentPlayer]);

  // Gel manuel (Arrêt sur image) : décompte des secondes de gel.
  useEffect(() => {
    if (geleRestant <= 0) return undefined;
    const t = setInterval(() => setGeleRestant((g) => Math.max(0, g - 0.2)), 200);
    return () => clearInterval(t);
  }, [geleRestant > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const onExpire = () => {
    // Second souffle : 1re fois par palier à 0 s, on rajoute du temps au lieu de rater.
    if (
      mode === 'rogue' &&
      palierRef.current.secondSouffle &&
      aRelic(relicsRef.current, 'second-souffle') &&
      phaseRef.current === 'question'
    ) {
      setPalier((p) => ({ ...p, secondSouffle: false }));
      setDureeOverride(5);
      return;
    }
    answerRef.current(null);
  };
  const { time, reset } = useTimer(
    phase === 'question' && !timerFige && geleRestant <= 0,
    dureeQuestion,
    onExpire
  );
  // Timer du choix de relique (rogue) : 20 s, puis une relique est choisie automatiquement.
  const { time: tempsChoix } = useTimer(phase === 'relique', RELIC_CHOICE_SECONDS, () => {
    if (proposals.length > 0)
      choisirRelique(proposals[Math.floor(Math.random() * proposals.length)].id);
  });

  // Miroir : les réponses se mélangent une fois à mi-chrono.
  useEffect(() => {
    if (mode !== 'rogue' || rogueBonus.miroirPct <= 0 || phase !== 'question' || miroirFait) return;
    const ecoulees = dureeQuestion - time;
    if (ecoulees >= dureeQuestion / 2) {
      const q = qAffRef.current;
      const ordre = q.reponses.map((_, i) => i).sort(() => Math.random() - 0.5);
      setQuestionAffichage({
        ...q,
        reponses: ordre.map((i) => q.reponses[i]),
        bonne: ordre.indexOf(q.bonne),
      });
      setMiroirFait(true);
    }
  }, [time, mode, phase, miroirFait, dureeQuestion, rogueBonus.miroirPct]);

  // Ambiance sonore de la partie.
  const musicOn = !!(prefs && prefs.music !== false);
  useEffect(() => {
    if (musicOn) startMusic(prefs);
    else stopMusic();
    return () => stopMusic();
  }, [musicOn, prefs]);

  // Bip chaque seconde quand il reste 3 s ou moins.
  const second = Math.ceil(time);
  useEffect(() => {
    if (phase === 'question' && second > 0 && second <= 3) playSound('tick', prefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [second, phase]);

  // Enchaînement AUTOMATIQUE : 2 s après la réponse, on passe à la suite.
  useEffect(() => {
    if (phase !== 'reponse') return undefined;
    const t = setTimeout(() => suivant(), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, currentPlayer]);

  // --- Helpers internes ---
  const dejaJouee = (q: string): boolean => detailsRef.current.some((d) => d.q === q);
  const tag = (q: Question, t: Theme): DrawnQuestion => ({
    ...q,
    themeId: t.id,
    themeName: t.nom,
    themeColor: t.couleur,
    themeIcon: t.icone,
  });
  const meilleurTheme = (dets: DetailPartie[], themes: Theme[]): string | null => {
    const compte = new Map<string, number>();
    for (const d of dets) if (d.correct) compte.set(d.themeId, (compte.get(d.themeId) || 0) + 1);
    let best: string | null = null;
    let max = 0;
    for (const [t, n] of compte) if (n > max) {
      max = n;
      best = t;
    }
    if (!best && themes.length > 0) best = themes[0].id;
    return best;
  };

  function answer(i: number | null) {
    if (phaseRef.current !== 'question') return;
    const qAff = qAffRef.current;
    const correct = i !== null && i === qAff.bonne;
    const secondsElapsed = Math.max(0, dureeQuestion - time);
    const b = rogueBonusRef.current;
    const withBonus = mode === 'solo' || mode === 'duel' || mode === 'rogue';
    const { bonus: mancheBonus } = withBonus ? roundInfo(index, questions.length) : { bonus: false };
    const qDansPalier = (index % ROGUE_STEP) + 1;
    // Streak (Élan : +2 par cran, Plafond brisé : pas de plafond, Filet de sécurité).
    const step = mode === 'rogue' ? b.streakStep : 1;
    const cap = mode === 'rogue' ? b.streakCap : 10;
    let nouveauStreak = correct ? streaksRef.current[currentPlayer] + step : 0;
    if (!correct && mode === 'rogue' && palierRef.current.filet > 0) {
      nouveauStreak = streaksRef.current[currentPlayer]; // la série continue
      setPalier((p) => ({ ...p, filet: p.filet - 1 }));
    }
    const bonusStreak = correct ? Math.min(cap, Math.max(0, nouveauStreak - 1)) : 0;
    let gain: number;
    if (mode === 'rogue') {
      const themeIdQ = qAff.themeId || theme.id;
      const precedent = detailsRef.current.length > 0 ? detailsRef.current[detailsRef.current.length - 1] : null;
      const retryGain = retryEnCours && b.deuxiemeChancePts > 0;
      gain = correct
        ? retryGain
          ? b.deuxiemeChancePts // Deuxième chance : 5 pts fixes
          : gainRogue(b, {
              correct,
              secondesEcoulees: secondsElapsed,
              dureeQuestion,
              mancheBonus,
              streak: nouveauStreak,
              bonnesAvant: bonnesRef.current[currentPlayer],
              index,
              questionDansPalier: qDansPalier,
              niveau: qAff.niveau || 'mix',
              themeId: themeIdQ,
              themePrecedent: precedent ? precedent.themeId : null,
              vies: viesRef.current,
              viesMax: viesMaxRef.current,
              pariPlace: pariPlaceeRef.current,
              nbReliques: relicsRef.current.length,
              themeSpecialiste,
              zoneConfort: zoneConfortQ,
              isRevision: isRevisionQ,
              fievreActive: fievreRestantRef.current > 0,
              rebondActif,
              jackpotActif: palierRef.current.jackpot === index,
              div2: reponsesMasqueesRef.current.length > 0 && b.cinquante !== null,
            })
        : 0;
      gain += bonusStreak;
      // Fièvre : à 10 d'affilée, lance les 3 questions « fièvre »
      if (correct && b.fievre && nouveauStreak >= 10 && fievreRestantRef.current === 0)
        setFievreRestant(b.fievre.n);
      if (correct && b.fievre && fievreRestantRef.current > 0)
        setFievreRestant((f) => Math.max(0, f - 1));
      // Vampire : toutes les N bonnes d'affilée rendent 1 vie
      if (correct && b.vampireSeuil > 0 && nouveauStreak % b.vampireSeuil === 0)
        setVies((v) => Math.min(viesMaxRef.current, v + 1));
      // Rebond : après une erreur, la question suivante vaut ×2
      setRebondActif(!correct && b.rebond);
      // Révision : l'erreur reviendra plus tard
      if (!correct && b.revisionMult > 0) {
        setRevisionPool((r) => [...r, qAff]);
      }
      // Carry du temps pour la question suivante (Horloge partagée / Momentum / Encyclopédie)
      let carry = carryBonusRef.current;
      if (correct) {
        if (b.carryMax > 0) carry = Math.min(b.carryMax, Math.max(0, dureeQuestion - secondsElapsed));
        else if (b.momentumMax > 0) carry = secondsElapsed < 5 ? Math.min(b.momentumMax, carry + 1) : 0;
        carry = Math.min(b.carryMax + b.momentumMax + b.encyclopedieS || 5, carry + (b.encyclopedieS > 0 ? b.encyclopedieS : 0));
      } else carry = 0;
      setCarryBonus(carry);
      // Marathon : la réserve du palier diminue du temps écoulé
      if (b.marathon) {
        const reste = Math.max(0, palierRef.current.reserve - secondsElapsed);
        setPalier((p) => ({ ...p, reserve: reste }));
      }
      // Perte de vie
      if (!correct) {
        let perte = 1;
        if (dominoActif && b.dominoVies > 0) perte = b.dominoVies; // Domino : −2 vies
        if (pariPlaceeRef.current && b.pari) perte += 1; // Pari perdu : −1 vie de plus
        if (i === null && b.tempsMort) perte = 0; // Temps mort : le chrono ne coûte plus de vie
        if (palierRef.current.bouclier > 0) {
          perte = 0; // Bouclier : 1re erreur du palier sans perte de vie
          setPalier((p) => ({ ...p, bouclier: p.bouclier - 1 }));
        }
        let nv = viesRef.current - perte;
        if (nv <= 0 && b.assuranceVie && !assuranceUtiliseRef.current) {
          // Assurance : on revient avec 1 vie, −50 % des points (une seule fois)
          setAssuranceUtilise(true);
          assuranceUtiliseRef.current = true;
          nv = 1;
          setScores((s) => {
            const n = [...s];
            n[currentPlayer] = Math.round(n[currentPlayer] * 0.5);
            return n;
          });
        }
        setVies(nv);
        viesRef.current = nv;
        setPalier((p) => ({ ...p, erreurs: p.erreurs + 1, parfait: false }));
      } else {
        setPalier((p) => ({ ...p, points: p.points + gain }));
      }
    } else {
      gain = pointsFor(correct, secondsElapsed, mancheBonus, dureeQuestion) + bonusStreak;
      if (mode === 'quotidien' && currentDailyStreak().account >= 3) gain = Math.round(gain * 1.5);
    }
    setSelection(i);
    setLastGain(gain);
    setLastBonus(bonusStreak);
    setStreaks((s) => {
      const n = [...s];
      n[currentPlayer] = nouveauStreak;
      return n;
    });
    setLastCorrect(correct);
    setDetails((d) => [
      ...d,
      {
        themeId: qAff.themeId || theme.id,
        themeName: qAff.themeName || theme.nom,
        niveau: (qAff.niveau || niveau) as LevelId | string,
        correct,
        gain,
        streak: nouveauStreak,
        bonusStreak,
        secondes: secondsElapsed,
        q: qAff.q,
      },
    ]);
    setScores((s) => {
      const n = [...s];
      n[currentPlayer] += gain;
      return n;
    });
    if (correct) {
      setBonnes((b2) => {
        const n = [...b2];
        n[currentPlayer] += 1;
        return n;
      });
      playSound(soundForStreak(nouveauStreak), prefs);
      vibrate(
        nouveauStreak >= 10 ? [60, 50, 60, 50, 140] : nouveauStreak >= 6 ? [50, 40, 90] : nouveauStreak >= 3 ? [40, 40, 70] : 40,
        prefs
      );
      if (prefs && prefs.animations !== false) lancerConfettis();
    } else {
      playSound('faux', prefs);
      vibrate([180], prefs);
    }
    setPhase('reponse');
  }
  answerRef.current = answer;

  function lancerConfettis() {
    const pieces: ConfettiPiece[] = Array.from({ length: 26 }, (_, k) => ({
      id: `${Date.now()}-${k}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      couleur: CONFETTI_COLORS[k % CONFETTI_COLORS.length],
      taille: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
    }));
    setConfettis(pieces);
    setTimeout(() => setConfettis([]), 1500);
  }

  // --- Fin de palier (tous les ROGUE_STEP questions) : effets puis nouveau palier ---
  function finPalier() {
    const b = rogueBonusRef.current;
    const p = palierRef.current;
    const idxFin = index; // dernière question du palier qui se termine
    // Intérêts : +p % du score total
    if (b.interetsPct > 0) {
      setScores((s) => {
        const n = [...s];
        n[currentPlayer] += Math.round((n[currentPlayer] * b.interetsPct) / 100);
        return n;
      });
    }
    // Tout ou rien : palier parfait ×mult, sinon −p % sur les points du palier
    if (b.toutOuRien) {
      const delta = p.parfait
        ? Math.round(p.points * (b.toutOuRien.mult - 1))
        : -Math.round((p.points * b.toutOuRien.malusPct) / 100);
      setScores((s) => {
        const n = [...s];
        n[currentPlayer] += delta;
        return n;
      });
    }
    // Infirmerie : palier sans erreur -> +1 vie
    if (b.infirmerie && p.erreurs === 0) setVies((v) => Math.min(viesMaxRef.current, v + 1));
    // Marathon : le temps restant de la réserve est converti en points
    if (b.marathon && p.reserve > 0) {
      const gain = Math.round(p.reserve * b.marathon.mult);
      setScores((s) => {
        const n = [...s];
        n[currentPlayer] += gain;
        return n;
      });
    }
    // Main du destin : une relique au hasard est ajoutée à chaque palier
    if (b.mainDuDestin) {
      const prog = Math.min(1, idxFin / ROGUE_MAX);
      const auto = drawRelicChoices(relicsRef.current.map((r) => r.id), 1, Math.random, prog)[0];
      if (auto) setRelics((r) => [...r, auto]);
    }
    // Nouveau palier
    const nouveau = palierInitial(b, relicsRef.current, idxFin + 1);
    setPalier(nouveau);
  }

  // Ouvrir le choix de relique (phase 'relique') : propositions sans remise, pondérées.
  function ouvrirChoixRelique() {
    const b = rogueBonusRef.current;
    const prog = Math.min(1, index / ROGUE_MAX);
    setProposals(drawRelicChoices(relicsRef.current.map((r) => r.id), nbPropositions(b), Math.random, prog));
    setAPrendre(nbAPrendre(b));
    setPhase('relique');
  }

  function suivant() {
    reset();
    setSelection(null);
    if (mode === 'rogue') {
      if (!lastCorrect) {
        // Deuxième chance : on retente la même question (1 fois par palier)
        if (rogueBonusRef.current.deuxiemeChancePts > 0 && palierRef.current.deuxiemeChance) {
          setPalier((p) => ({ ...p, deuxiemeChance: false }));
          setRetryEnCours(true);
          setPhase('question');
          return;
        }
        // La run continue s'il reste des vies (Bouclier, Cœur en plus, Pacte…)
        if (viesRef.current > 0) {
          if (index + 1 >= questions.length) return finir();
          if ((index + 1) % ROGUE_STEP === 0) {
            finPalier();
            setIndex((i) => i + 1);
            ouvrirChoixRelique();
            return;
          }
          setIndex((i) => i + 1);
          setPhase('question');
          return;
        }
        return finir(); // plus de vie : fin de la run
      }
      if (index + 1 >= questions.length) return finir();
      if ((index + 1) % ROGUE_STEP === 0) {
        finPalier();
        setIndex((i) => i + 1);
        ouvrirChoixRelique();
        return;
      }
      setIndex((i) => i + 1);
      setPhase('question');
      return;
    }
    if (mode === 'solo' || mode === 'quotidien') {
      if (index + 1 >= questions.length) return finir();
      setIndex((i) => i + 1);
      setPhase('question');
    } else if (currentPlayer === 0) {
      setCurrentPlayer(1);
      setPhase('attente');
    } else {
      if (index + 1 >= questions.length) return finir();
      setIndex((i) => i + 1);
      setCurrentPlayer(0);
      setPhase('attente');
    }
  }
  function pret() {
    reset();
    setPhase('question');
  }

  const isReported = signales.some((s) => s.q === question.q);
  function reportQuestion() {
    if (isReported) return;
    playSound('clic', prefs);
    addReport({
      q: question.q,
      themeId: question.themeId || theme.id,
      themeName: question.themeName || theme.nom,
    });
    vibrate(30, prefs);
    setSignales(loadReports());
  }
  function finir() {
    playSound('fin', prefs);
    if (mode !== 'quotidien') {
      saveSeries(seriesKey(mode, niveau, theme.id), questionsPerPlayer.flat());
    }
    let scoresFin = scores.slice(0, nbJoueurs);
    if (mode === 'rogue') {
      const win = lastCorrect && index + 1 >= questions.length;
      scoresFin = [scoreFinalRogue(rogueBonus, scores[currentPlayer], win, index)];
    }
    onFinish({
      mode,
      niveau,
      theme,
      players,
      scores: scoresFin,
      bonnes: bonnes.slice(0, nbJoueurs),
      total: mode === 'rogue' ? index + 1 : questions.length,
      details,
      relics: mode === 'rogue' ? relics.map((r) => r.id) : undefined,
    });
  }
  function abandonner() {
    playSound('clic', prefs);
    if (mode !== 'quotidien') {
      saveSeries(seriesKey(mode, niveau, theme.id), questionsPerPlayer.flat());
    }
    let scoresFin = scores.slice(0, nbJoueurs);
    if (mode === 'rogue') {
      scoresFin = [scoreFinalRogue(rogueBonus, scores[currentPlayer], false, index)];
    }
    onQuit({
      mode,
      niveau,
      theme,
      players,
      scores: scoresFin,
      bonnes: bonnes.slice(0, nbJoueurs),
      total: index,
      details,
      relics: mode === 'rogue' ? relics.map((r) => r.id) : undefined,
    });
  }

  // --- Actions Rogue Quizz ---

  /** Choisir une relique parmi les propositions (phase 'relique'). */
  function choisirRelique(id: string) {
    const r = proposals.find((p) => p.id === id);
    if (!r || phase !== 'relique') return;
    playSound('clic', prefs);
    // Recyclage : on ne garde pas la relique, on passe à l'étape sacrifice.
    if (r.effet.t === 'recyclage') {
      setRecyclageEtape('sacrifice');
      return;
    }
    let nouvelles = [...relics, r];
    // Écho : la relique choisie compte en double
    if (echoActif) {
      nouvelles.push(r);
      setEchoActif(false);
    }
    // Joker : copie l'effet de la dernière relique choisie
    if (aRelic(nouvelles, 'joker') && dernierChoix) {
      const copie = RELICS.find((x) => x.id === dernierChoix);
      if (copie) nouvelles = [...nouvelles, copie];
    }
    setDernierChoix(r.id);
    // Effets immédiats sur les vies (valeurs capturées hors des callbacks d'état)
    const e = r.effet;
    if (e.t === 'vie') {
      const { n, soin } = e;
      setViesMax((vm) => vm + n);
      setVies((v) => Math.min(v + soin, viesMaxRef.current + n));
      viesRef.current = Math.min(viesRef.current + soin, viesMaxRef.current + n);
    }
    if (e.t === 'verreCristal') {
      setViesMax(1);
      setVies((v) => Math.min(v, 1));
      viesRef.current = Math.min(viesRef.current, 1);
    }
    if (e.t === 'pacteVies') {
      const v2 = e.vies;
      setViesMax((vm) => vm + v2);
      setVies((v) => Math.min(v, viesMaxRef.current + v2));
      viesRef.current = Math.min(viesRef.current, viesMaxRef.current + v2);
    }
    // Reliques qui débloquent des compteurs du palier courant
    const dGele = e.t === 'gele';
    const dSouffle = e.t === 'secondSouffle';
    const dCinquante = e.t === 'cinquante' ? e.n : 0;
    const dDeuxieme = e.t === 'deuxiemeChance';
    const dFilet = e.t === 'filetSecurite' ? 1 : 0;
    const dBouclier = e.t === 'bouclier' ? 1 : 0;
    const dPioche = e.t === 'pioche' ? e.n : 0;
    const dRetour = e.t === 'retourArriere';
    const dJackpot = e.t === 'jackpotPalier';
    const dReserve = e.t === 'marathon' ? e.reserve : null;
    setPalier((p) => ({
      ...p,
      gele: p.gele || dGele,
      secondSouffle: p.secondSouffle || dSouffle,
      cinquante: p.cinquante + dCinquante,
      deuxiemeChance: p.deuxiemeChance || dDeuxieme,
      filet: p.filet + dFilet,
      bouclier: p.bouclier + dBouclier,
      pioche: p.pioche + dPioche,
      retourArriere: p.retourArriere || dRetour,
      jackpot: p.jackpot >= 0 ? p.jackpot : dJackpot ? index + 1 + Math.floor(Math.random() * (ROGUE_STEP - 1)) : -1,
      reserve: dReserve !== null ? dReserve : p.reserve,
    }));
    if (r.effet.t === 'echo') setEchoActif(true);
    // Retour à l'école : le prochain palier est un cran moins difficile
    if (r.effet.t === 'retourEcole') setPalierEcole(Math.floor(index / ROGUE_STEP) + 1);
    setRelics(nouvelles);
    const restant = aPrendre - 1;
    setAPrendre(restant);
    if (restant > 0) {
      const b = computeRogueBonus(nouvelles);
      const prog = Math.min(1, index / ROGUE_MAX);
      setProposals(drawRelicChoices(nouvelles.map((x) => x.id), nbPropositions(b), Math.random, prog));
    } else if (r.effet.t === 'specialiste') {
      // Spécialiste : choisir le thème qui vaut ×2
      setThemeAPicker(true);
      setProposals([]);
    } else {
      setProposals([]);
      setRecyclageEtape(null);
      setPhase('question');
    }
  }

  /** Refuser le choix de relique (Ascète : +150 pts), puis continuer la run. */
  function refuserChoix() {
    if (mode !== 'rogue' || phase !== 'relique') return;
    const b = rogueBonusRef.current;
    if (b.ascete <= 0) return;
    playSound('clic', prefs);
    setScores((s) => {
      const n = [...s];
      n[currentPlayer] += b.ascete;
      return n;
    });
    setProposals([]);
    setRecyclageEtape(null);
    setPhase('question');
  }

  /** Recyclage, étape 1 : retirer une relique possédée, puis re-proposer 3 reliques rares+. */
  function sacrifierRelique(id: string) {
    if (recyclageEtape !== 'sacrifice') return;
    const nouvelles = relics.filter((r) => r.id !== id);
    setRelics(nouvelles);
    const prog = Math.min(1, index / ROGUE_MAX);
    setProposals(
      drawRelicChoices(nouvelles.map((x) => x.id), 3, Math.random, prog, ['rare', 'legendaire'])
    );
    setRecyclageEtape('nouveau');
  }

  /** Spécialiste : choisir le thème qui rapporte ×2. */
  function choisirThemeSpecialiste(themeId: string) {
    setThemeSpecialiste(themeId);
    setThemeAPicker(false);
    setPhase('question');
  }

  /** Arrêt sur image : gèle le chrono 5 s (1 fois par palier). */
  function gelerChrono() {
    if (mode !== 'rogue' || phase !== 'question' || !palier.gele || geleRestant > 0) return;
    setPalier((p) => ({ ...p, gele: false }));
    setGeleRestant(5);
    setTimerFige(true);
    setTimeout(() => setTimerFige(false), 5000);
    playSound('clic', prefs);
  }

  /** Pari : miser sur la question courante (×2 si juste, −1 vie de plus si faux). */
  function miser() {
    if (mode !== 'rogue' || phase !== 'question' || !rogueBonus.pari) return;
    setPariPlacee((p) => !p);
    playSound('clic', prefs);
  }

  /** Pioche : passer le thème de la question (remplacée par une plus difficile). */
  function passerTheme() {
    if (mode !== 'rogue' || phase !== 'question' || palier.pioche <= 0) return;
    setPalier((p) => ({ ...p, pioche: p.pioche - 1 }));
    playSound('clic', prefs);
    const nivSup = question.niveau === 'facile' ? 'moyen' : question.niveau === 'moyen' ? 'dur' : 'dur';
    const pool = (config.allThemes || []).flatMap((t) =>
      t.questions.filter((q) => q.niveau === nivSup && !dejaJouee(q.q)).map((q) => tag(q, t))
    );
    if (pool.length === 0) return;
    const nouvelle = pool[Math.floor(Math.random() * pool.length)];
    const ordre = nouvelle.reponses.map((_, i) => i).sort(() => Math.random() - 0.5);
    const q2 = { ...nouvelle, reponses: ordre.map((i) => nouvelle.reponses[i]), bonne: ordre.indexOf(nouvelle.bonne) };
    setQuestionsRogue([...questions.slice(0, index), q2, ...questions.slice(index + 1)]);
    setReponsesMasquees([]);
    reset();
    setPhase('question');
  }

  /** Retour en arrière : annule la dernière réponse (1 fois par palier, −1 s toute la partie). */
  function annulerReponse() {
    if (mode !== 'rogue' || phase !== 'reponse' || !palier.retourArriere || !snapshotRef.current) return;
    const snap = snapshotRef.current;
    setPalier((p) => ({ ...p, retourArriere: false }));
    retourArriereMalusRef.current += rogueBonus.retourArriereMalusS;
    setScores(snap.scores);
    setBonnes(snap.bonnes);
    setStreaks(snap.streaks);
    setVies(snap.vies);
    viesRef.current = snap.vies;
    setDetails(snap.details);
    setIndex(snap.index);
    setLastCorrect(true);
    setLastGain(0);
    setSelection(null);
    reset();
    setPhase('question');
    playSound('clic', prefs);
  }

  const ecoulees = Math.max(0, dureeQuestion - time);

  return {
    config,
    mode,
    niveau,
    theme,
    players,
    nbJoueurs,
    questions,
    question,
    index,
    currentPlayer,
    phase,
    time,
    second,
    selection,
    scores,
    bonnes,
    lastGain,
    lastBonus,
    streaks,
    confetti,
    isReported,
    answer,
    suivant,
    pret,
    finir,
    abandonner,
    reportQuestion,
    relics,
    proposals,
    rogueBonus,
    questionAffichage,
    dureeQuestion,
    ecoulees,
    tempsChoix,
    vies,
    viesMax,
    palier,
    pariPlacee,
    geleRestant,
    bonneRevelee,
    timerFige,
    surbrillance,
    barree,
    votePcts,
    scintille,
    recyclageEtape,
    themeAPicker,
    themeSpecialiste,
    choisirRelique,
    refuserChoix,
    sacrifierRelique,
    choisirThemeSpecialiste,
    gelerChrono,
    miser,
    passerTheme,
    annulerReponse,
  };
}
