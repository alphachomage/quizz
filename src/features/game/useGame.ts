// features/game/useGame.ts — noyau d'une partie (états, actions, effets communs à tous les modes).
// La logique propre au mode Rogue Quizz vit dans `useRogue.ts` (+ `@lib/rogueRun.ts` pour les calculs purs).
import { useEffect, useRef, useState } from 'react';
import { RELIC_CHOICE_SECONDS, ROGUE_STEP, pointsFor, roundInfo } from '@lib/scoring.js';
import { addReport, loadReports } from '@lib/reports.js';
import type { StoredReport } from '@lib/reports.js';
import { seriesKey, saveSeries } from '@lib/series.js';
import { currentDailyStreak } from '@lib/streak.js';
import { playSound, soundForStreak, vibrate, startMusic, stopMusic } from '@lib/sounds.js';
import { scoreFinalRogue } from '@lib/relics.js';
import type { GameResult, LevelId, Prefs } from '@lib/types.js';
import { CONFETTI_COLORS } from './constants.js';
import { drawGameQuestions } from './draw.js';
import type { GameLaunchConfig } from './draw.js';
import type { ConfettiPiece, DetailPartie, GamePhase, GameState } from './gameTypes.js';
import { useLatest } from './useLatest.js';
import { useRogue } from './useRogue.js';
import { useTimer } from './useTimer.js';

export type { ConfettiPiece, GamePhase, GameState, GameViewState, ThemeBadge } from './gameTypes.js';

/** Paramètres du hook useGame (identiques aux props de l'écran Game). */
export interface UseGameParams {
  config: GameLaunchConfig;
  prefs: Prefs;
  onFinish: (result: GameResult) => void;
  onQuit: (result: GameResult) => void;
}

export function useGame({ config, prefs, onFinish, onQuit }: UseGameParams): GameState {
  const { mode, niveau, theme, players = [] } = config;
  const nbJoueurs = mode === 'duel' ? 2 : 1;

  // ALEATOIRE : à chaque partie, chaque joueur reçoit son propre tirage au hasard (une seule fois).
  const [questionsPerPlayer] = useState(() => drawGameQuestions(config));

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

  // Refs miroirs (évite les closures périmées dans les callbacks du timer et des effets).
  const phaseRef = useLatest(phase);
  const scoresRef = useLatest(scores);
  const bonnesRef = useLatest(bonnes);
  const streaksRef = useLatest(streaks);
  const detailsRef = useLatest(details);
  const prefsRef = useLatest(prefs);
  const answerRef = useRef<(i: number | null) => void>(() => {});
  const resetTimerRef = useRef<() => void>(() => {});

  // Logique Rogue Quizz (reliques, vies, paliers) + questions courantes.
  const rogue = useRogue({
    config,
    prefs,
    index,
    currentPlayer,
    phase,
    streak: streaks[currentPlayer],
    questionsPerPlayer,
    phaseRef,
    streaksRef,
    scoresRef,
    bonnesRef,
    detailsRef,
    answerRef,
    resetTimerRef,
    setPhase,
    setScores,
    setBonnes,
    setStreaks,
    setDetails,
    setIndex,
    setLastCorrect,
    setLastGain,
    setSelection,
  });
  const { questions, question, dureeQuestion } = rogue;

  const { time, reset } = useTimer(
    phase === 'question' && !rogue.timerFige && rogue.geleRestant <= 0,
    dureeQuestion,
    rogue.onExpire
  );
  resetTimerRef.current = reset;
  // Timer du choix de relique (rogue) : 20 s, puis une relique est choisie automatiquement.
  const { time: tempsChoix } = useTimer(phase === 'relique', RELIC_CHOICE_SECONDS, rogue.choisirReliqueAuHasard);

  // Miroir : les réponses se mélangent une fois à mi-chrono.
  const appliquerMiroirRef = useLatest(rogue.appliquerMiroir);
  useEffect(() => {
    if (rogue.miroirAttendu && dureeQuestion - time >= dureeQuestion / 2) appliquerMiroirRef.current();
  }, [time, dureeQuestion, rogue.miroirAttendu, appliquerMiroirRef]);

  // Ambiance sonore de la partie.
  const musicOn = !!(prefs && prefs.music !== false);
  useEffect(() => {
    if (musicOn) startMusic(prefsRef.current);
    else stopMusic();
    return () => stopMusic();
  }, [musicOn, prefs, prefsRef]);

  // Bip chaque seconde quand il reste 3 s ou moins.
  const second = Math.ceil(time);
  useEffect(() => {
    if (phase === 'question' && second > 0 && second <= 3) playSound('tick', prefsRef.current);
  }, [second, phase, prefsRef]);

  // Enchaînement AUTOMATIQUE : 2 s après la réponse, on passe à la suite.
  const suivantRef = useLatest(suivant);
  useEffect(() => {
    if (phase !== 'reponse') return undefined;
    const t = setTimeout(() => suivantRef.current(), 2000);
    return () => clearTimeout(t);
  }, [phase, index, currentPlayer, suivantRef]);

  // Guard pool vide : rien à jouer, on termine immédiatement.
  const finirRef = useLatest(finir);
  const finiVideRef = useRef(false);
  useEffect(() => {
    if (questions.length === 0 && !finiVideRef.current) {
      finiVideRef.current = true;
      finirRef.current();
    }
  }, [questions.length, finirRef]);

  function answer(i: number | null) {
    if (phaseRef.current !== 'question') return;
    const qAff = rogue.questionAffichage;
    const correct = i !== null && i === qAff.bonne;
    const secondsElapsed = Math.max(0, dureeQuestion - time);
    const isRogue = mode === 'rogue';
    const withBonus = mode === 'solo' || mode === 'duel' || isRogue;
    const { bonus: mancheBonus } = withBonus ? roundInfo(index, questions.length) : { bonus: false };
    let nouveauStreak: number;
    let bonusStreak: number;
    let gain: number;
    if (isRogue) {
      ({ nouveauStreak, bonusStreak, gain } = rogue.resoudreReponse({ i, correct, qAff, secondsElapsed, mancheBonus }));
    } else {
      nouveauStreak = correct ? streaksRef.current[currentPlayer] + 1 : 0;
      bonusStreak = correct ? Math.min(10, Math.max(0, nouveauStreak - 1)) : 0;
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

  /** Passe à la question suivante (ou au joueur suivant / palier suivant / fin de partie). */
  function suivant() {
    reset();
    setSelection(null);
    if (mode === 'rogue') {
      if (!lastCorrect) {
        // Deuxième chance : on retente la même question (1 fois par palier)
        if (rogue.tenterDeuxiemeChance()) {
          setPhase('question');
          return;
        }
        // La run continue s'il reste des vies (Bouclier, Cœur en plus, Pacte…)
        if (!rogue.encoreEnVie()) return finir(); // plus de vie : fin de la run
      }
      if (index + 1 >= questions.length) return finir();
      if ((index + 1) % ROGUE_STEP === 0) {
        rogue.finPalier();
        setIndex((i) => i + 1);
        rogue.ouvrirChoixRelique();
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

  /** Résultat de la partie (fin normale ou abandon) : scores ajustés pour le rogue. */
  function buildResult(win: boolean, total: number): GameResult {
    let scoresFin = scores.slice(0, nbJoueurs);
    if (mode === 'rogue') scoresFin = [scoreFinalRogue(rogue.rogueBonus, scores[currentPlayer], win, index)];
    return {
      mode,
      niveau,
      theme,
      players,
      scores: scoresFin,
      bonnes: bonnes.slice(0, nbJoueurs),
      total,
      details,
      relics: mode === 'rogue' ? rogue.relics.map((r) => r.id) : undefined,
    };
  }
  function memoriserSerie() {
    if (mode !== 'quotidien') saveSeries(seriesKey(mode, niveau, theme.id), questionsPerPlayer.flat());
  }
  function finir() {
    playSound('fin', prefs);
    memoriserSerie();
    const win = lastCorrect && index + 1 >= questions.length;
    onFinish(buildResult(win, mode === 'rogue' ? index + 1 : questions.length));
  }
  function abandonner() {
    playSound('clic', prefs);
    memoriserSerie();
    onQuit(buildResult(false, index));
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
    abandonner,
    reportQuestion,
    relics: rogue.relics,
    proposals: rogue.proposals,
    rogueBonus: rogue.rogueBonus,
    questionAffichage: rogue.questionAffichage,
    dureeQuestion,
    ecoulees: Math.max(0, dureeQuestion - time),
    tempsChoix,
    vies: rogue.vies,
    viesMax: rogue.viesMax,
    palier: rogue.palier,
    pariPlacee: rogue.pariPlacee,
    geleRestant: rogue.geleRestant,
    bonneRevelee: rogue.bonneRevelee,
    timerFige: rogue.timerFige,
    surbrillance: rogue.surbrillance,
    barree: rogue.barree,
    votePcts: rogue.votePcts,
    scintille: rogue.scintille,
    recyclageEtape: rogue.recyclageEtape,
    themeAPicker: rogue.themeAPicker,
    themeSpecialiste: rogue.themeSpecialiste,
    choisirRelique: rogue.choisirRelique,
    refuserChoix: rogue.refuserChoix,
    sacrifierRelique: rogue.sacrifierRelique,
    choisirThemeSpecialiste: rogue.choisirThemeSpecialiste,
    gelerChrono: rogue.gelerChrono,
    miser: rogue.miser,
    passerTheme: rogue.passerTheme,
    annulerReponse: rogue.annulerReponse,
  };
}
