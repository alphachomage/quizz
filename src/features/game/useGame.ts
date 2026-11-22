// features/game/useGame.ts — TOUTE la logique d'une partie (états, actions, effets).
// extraite de l'ancien god composant Partie.jsx. Testable hors React.
import { useEffect, useMemo, useRef, useState } from 'react';
import { roundInfo, pointsFor, SECONDS_PER_QUESTION } from '@lib/scoring.js';
import { addReport, loadReports } from '@lib/reports.js';
import type { StoredReport } from '@lib/reports.js';
import { seriesKey, saveSeries } from '@lib/series.js';
import { currentDailyStreak } from '@lib/streak.js';
import { playSound, soundForStreak, vibrate, startMusic, stopMusic } from '@lib/sounds.js';
import type { GameDetail, GameMode, GameResult, LevelId, Prefs, Theme } from '@lib/types.js';
import { CONFETTI_COLORS } from './constants.js';
import { drawGameQuestions } from './draw.js';
import type { DrawnQuestion, GameLaunchConfig } from './draw.js';
import { useTimer } from './useTimer.js';

/** Phases d'une partie : attente de l'autre joueur (duel), question en cours, réponse verrouillée. */
export type GamePhase = 'attente' | 'question' | 'reponse';

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
  reportQuestion: () => void;
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

export function useGame({ config, prefs, onFinish }: UseGameParams): GameState {
  const { mode, niveau, theme, players = [] } = config;
  const nbJoueurs = mode === 'duel' ? 2 : 1;

  // ALEATOIRE : à chaque partie, chaque joueur reçoit son propre tirage au hasard.
  const questionsPerPlayer = useMemo(() => drawGameQuestions(config), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = useState(0); // question courante (0..n-1)
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [phase, setPhase] = useState<GamePhase>(mode === 'duel' ? 'attente' : 'question'); // 'attente' | 'question' | 'reponse'
  const [selection, setSelection] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [bonnes, setBonnes] = useState<number[]>([0, 0]);
  const [lastGain, setLastGain] = useState(0);
  const [lastBonus, setLastBonus] = useState(0); // bonus de série (streak)
  const [streaks, setStreaks] = useState<number[]>([0, 0]); // bonnes réponses enchaînées, par joueur
  const [lastCorrect, setLastCorrect] = useState(true);
  const [details, setDetails] = useState<DetailPartie[]>([]); // historique question par question (stats)
  const [confetti, setConfettis] = useState<ConfettiPiece[]>([]);
  const [signales, setSignales] = useState<StoredReport[]>(() => loadReports()); // questions signalées (pouce rouge)

  const questions = questionsPerPlayer[currentPlayer]; // tirage du joueur courant
  const question = questions[Math.min(index, questions.length - 1)];

  // Guard pool vide (thème sans question du niveau choisi, données invalides) :
  // on termine la partie proprement au lieu de planter sur question undefined.
  const finiVideRef = useRef(false);
  useEffect(() => {
    if (questions.length === 0 && !finiVideRef.current) {
      finiVideRef.current = true;
      finir();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);
  const { time, reset } = useTimer(phase === 'question', SECONDS_PER_QUESTION, () => answer(null));

  // Ambiance sonore de la partie (nappe douce), selon le réglage « Musique de fond ».
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

  // Enchaînement AUTOMATIQUE : 2 s après la réponse (ou le temps écoulé),
  // on passe à la suite sans clic. En duel, on passe d'abord par l'écran
  // « passe l'appareil » (clic obligatoire pour garder le secret).
  useEffect(() => {
    if (phase !== 'reponse') return undefined;
    const t = setTimeout(() => suivant(), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, currentPlayer]);
  function answer(i: number | null) {
    if (phase !== 'question') return;
    const correct = i !== null && i === question.bonne;
    const secondsElapsed = SECONDS_PER_QUESTION - time;
    const withBonus = mode === 'solo' || mode === 'duel';
    const { bonus } = withBonus
      ? roundInfo(index, questions.length)
      : {
          bonus: false,
        };
    // BONUS DE SÉRIE : 0 à la 1re bonne réponse, puis +1 pt à la 2e enchaînée, +2 à la 3e, etc.
    // (bonus = n° de la série − 1, plafonné à +10)
    const nouveauStreak = correct ? streaks[currentPlayer] + 1 : 0;
    const bonusStreak = correct ? Math.min(10, nouveauStreak - 1) : 0;
    let gain = pointsFor(correct, secondsElapsed, bonus) + bonusStreak;
    // Quizz du jour boosté par la série de jours (>= 3 jours = points x1,5)
    if (mode === 'quotidien' && currentDailyStreak().account >= 3) gain = Math.round(gain * 1.5);
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
        themeId: question.themeId || theme.id,
        themeName: question.themeName || theme.nom,
        // question.niveau est toujours renseigné (schéma requis) : le || ne sert
        // que pour le type, la valeur runtime est toujours question.niveau.
        niveau: (question.niveau || niveau) as LevelId | string,
        correct,
        gain,
        streak: nouveauStreak,
        bonusStreak,
        secondes: secondsElapsed, // temps de réaction (stats avancées)
        q: question.q, // texte de la question (stats de qualité : taux de réussite)
      },
    ]);
    setScores((s) => {
      const n = [...s];
      n[currentPlayer] += gain;
      return n;
    });
    if (correct) {
      setBonnes((b) => {
        const n = [...b];
        n[currentPlayer] += 1;
        return n;
      });
      // Son de plus en plus satisfaisant selon la série en cours (3-5, 6-9, 10+)
      playSound(soundForStreak(nouveauStreak), prefs);
      vibrate(
        nouveauStreak >= 10
          ? [60, 50, 60, 50, 140]
          : nouveauStreak >= 6
            ? [50, 40, 90]
            : nouveauStreak >= 3
              ? [40, 40, 70]
              : 40,
        prefs
      );
      if (prefs && prefs.animations !== false) lancerConfettis();
    } else {
      playSound('faux', prefs);
      vibrate([180], prefs);
    }
    setPhase('reponse');
  }
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
  function suivant() {
    reset();
    setSelection(null);
    // En survie, la première mauvaise réponse (ou le temps écoulé) termine la partie.
    if (mode === 'survie' && !lastCorrect) return finir();
    if (mode === 'solo' || mode === 'survie' || mode === 'quotidien') {
      if (index + 1 >= questions.length) return finir();
      setIndex((i) => i + 1);
      setPhase('question');
    } else if (currentPlayer === 0) {
      setCurrentPlayer(1);
      setPhase('attente'); // on passe l'appareil au joueur 2
    } else {
      if (index + 1 >= questions.length) return finir();
      setIndex((i) => i + 1);
      setCurrentPlayer(0);
      setPhase('attente'); // on repasse l'appareil au joueur 1
    }
  }
  function pret() {
    reset();
    setPhase('question');
  }

  // Pouce rouge : signaler la question courante (ajoute +1 au compteur admin).
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
    // On mémorise la série jouée (union des tirages de tous les joueurs) pour
    // garantir que le prochain « Rejouer » tire des questions différentes.
    if (mode !== 'quotidien') {
      saveSeries(seriesKey(mode, niveau, theme.id), questionsPerPlayer.flat());
    }
    onFinish({
      mode,
      niveau,
      theme,
      players,
      scores: scores.slice(0, nbJoueurs),
      bonnes: bonnes.slice(0, nbJoueurs),
      total: mode === 'survie' ? index + 1 : questions.length,
      // en survie : questions répondues avant la faute
      details,
    });
  }
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
    reportQuestion,
  };
}
