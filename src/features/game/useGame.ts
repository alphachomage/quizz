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
import type { GameDetail, GameMode, GameResult, LevelId, Prefs, Theme } from '@lib/types.js';
import {
  computeRogueBonus,
  drawRelicChoices,
  emptyRogueBonus,
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
  /** Reliques choisies pendant la run (vide hors mode rogue). */
  relics: Relic[];
  /** Propositions de reliques du choix en cours (phase 'relique'). */
  proposals: Relic[];
  /** Bonus agrégés des reliques (hors mode rogue : bonus vides). */
  rogueBonus: RogueBonus;
  /** Charges consommables restantes (50/50, skip, re-piocher, pardon…). */
  charges: RogueBonus['charges'];
  /** Index de la réponse masquée par un 50/50 (null = aucune). */
  reponseMasquee: number | null;
  /** La bonne réponse est révélée (relique « Regard perçant »). */
  bonneRevelee: boolean;
  /** Question affichée (avec la réponse masquée retirée en mode rogue). */
  questionAffichage: DrawnQuestion;
  /** Timer figé sur la question courante (relique « Pause »). */
  timerFige: boolean;
  /** Durée du timer de la question courante (niveau + reliques timer). */
  dureeQuestion: number;
  /** Secondes restantes pour le choix de relique (phase 'relique', auto-choix à 0). */
  tempsChoix: number;
  /** Jackpot en attente (relique Jackpot) : points de la prochaine bonne réponse. */
  jackpot: number;
  choisirRelique: (id: string) => void;
  passerQuestion: () => void;
  repiocherQuestion: () => void;
  revelerBonne: () => void;
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

export function useGame({ config, prefs, onFinish, onQuit }: UseGameParams): GameState {
  const { mode, niveau, theme, players = [] } = config;
  const nbJoueurs = mode === 'duel' ? 2 : 1;

  // ALEATOIRE : à chaque partie, chaque joueur reçoit son propre tirage au hasard.
  const questionsPerPlayer = useMemo(() => drawGameQuestions(config), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = useState(0); // question courante (0..n-1)
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [phase, setPhase] = useState<GamePhase>(
    mode === 'duel' ? 'attente' : mode === 'rogue' ? 'relique' : 'question'
  ); // 'attente' | 'question' | 'reponse' | 'relique'
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

  // --- État Rogue Quizz (reliques) ---
  const [relics, setRelics] = useState<Relic[]>([]);
  const [proposals, setProposals] = useState<Relic[]>([]);
  const [aPrendre, setAPrendre] = useState(1); // nb de reliques à prendre au choix en cours
  const [charges, setCharges] = useState<RogueBonus['charges']>(emptyRogueBonus().charges);
  const [reponseMasquee, setReponseMasquee] = useState<number | null>(null);
  const [bonneRevelee, setBonneRevelee] = useState(false);
  const [timerFige, setTimerFige] = useState(false);
  const [jackpot, setJackpot] = useState(0);
  const [oneShotFaits, setOneShotFaits] = useState<number[]>([]);
  const [themeCible, setThemeCible] = useState<string | null>(null);
  const rogueBonus = useMemo(() => computeRogueBonus(relics), [relics]);

  // En rogue, les questions sont dans un état mutable (relique Mulligan = re-piocher).
  const [questionsRogue, setQuestionsRogue] = useState<DrawnQuestion[] | null>(() =>
    mode === 'rogue' ? questionsPerPlayer[currentPlayer] : null
  );
  const questions = mode === 'rogue' && questionsRogue ? questionsRogue : questionsPerPlayer[currentPlayer]; // tirage du joueur courant
  const question = questions[Math.min(index, questions.length - 1)];

  // Question affichée : en rogue avec un 50/50 actif, la réponse masquée est retirée.
  const questionAffichage = useMemo<DrawnQuestion>(() => {
    if (mode !== 'rogue' || reponseMasquee === null) return question;
    const rep = question.reponses.filter((_, i) => i !== reponseMasquee);
    const bonne = question.bonne > reponseMasquee ? question.bonne - 1 : question.bonne;
    return { ...question, reponses: rep, bonne };
  }, [mode, reponseMasquee, question]);

  // Au lancement d'une run rogue : première proposition de 3 reliques (choix de départ).
  useEffect(() => {
    if (mode === 'rogue' && proposals.length === 0 && relics.length === 0) {
      setProposals(drawRelicChoices([], nbPropositions(emptyRogueBonus()), Math.random, 0));
      setAPrendre(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // À chaque nouvelle question en rogue : appliquer 50/50 et timer figé si charges restantes.
  useEffect(() => {
    if (mode !== 'rogue') {
      setReponseMasquee(null);
      setTimerFige(false);
      setBonneRevelee(false);
      return;
    }
    if (charges.fifty > 0 && question.reponses.length > 2) {
      const mauvaises = question.reponses
        .map((_, i) => i)
        .filter((i) => i !== question.bonne);
      setReponseMasquee(mauvaises[Math.floor(Math.random() * mauvaises.length)]);
      setCharges((c) => ({ ...c, fifty: c.fifty - 1 }));
    } else {
      setReponseMasquee(null);
    }
    if (charges.fige > 0) {
      setTimerFige(true);
      setCharges((c) => ({ ...c, fige: c.fige - 1 }));
    } else {
      setTimerFige(false);
    }
    setBonneRevelee(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode]);

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
  // Durée du timer de la question courante : 10 s de base + 3 s si la question est « dur »
  // (dans TOUS les modes) ; en rogue, modifiée en plus par les reliques (+/- secondes,
  // timer fixé « zen », 1re question de palier à X s).
  const dureeQuestion = useMemo(() => {
    const base = dureePourNiveau(question.niveau, SECONDS_PER_QUESTION);
    if (mode !== 'rogue') return base;
    if (rogueBonus.timerFixe !== null) return rogueBonus.timerFixe;
    let d = base + rogueBonus.timerBonus;
    if (rogueBonus.premierePalier > 0 && index % ROGUE_STEP === 0)
      d = Math.max(d, rogueBonus.premierePalier);
    return Math.max(1, d);
  }, [mode, rogueBonus, index, question.niveau]);
  const { time, reset } = useTimer(
    phase === 'question' && !timerFige,
    dureeQuestion,
    () => answer(null)
  );
  // Timer du choix de relique (rogue) : 20 s, puis une relique est choisie automatiquement.
  const { time: tempsChoix } = useTimer(phase === 'relique', RELIC_CHOICE_SECONDS, () => {
    if (proposals.length > 0)
      choisirRelique(proposals[Math.floor(Math.random() * proposals.length)].id);
  });

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
    // En rogue avec 50/50, l'index cliqué porte sur la question affichée (réponse masquée retirée).
    const qAff = questionAffichage;
    const correct = i !== null && i === qAff.bonne;
    const secondsElapsed = Math.max(0, dureeQuestion - time);
    const withBonus = mode === 'solo' || mode === 'duel' || mode === 'rogue';
    const { bonus: mancheBonus } = withBonus
      ? roundInfo(index, questions.length)
      : {
          bonus: false,
        };
    // BONUS DE SÉRIE : 0 à la 1re bonne réponse, puis +1 pt à la 2e enchaînée, +2 à la 3e, etc.
    // (bonus = n° de la série − 1, plafonné à +10)
    const nouveauStreak = correct ? streaks[currentPlayer] + 1 : 0;
    const bonusStreak = correct ? Math.min(10, nouveauStreak - 1) : 0;
    let gain: number;
    if (mode === 'rogue') {
      const themeIdQ = question.themeId || theme.id;
      const precedent = details.length > 0 ? details[details.length - 1] : null;
      const jackpotActif = jackpot;
      if (jackpotActif > 0) setJackpot(0);
      gain =
        bonneRevelee && correct
          ? 10 // relique « Regard perçant » : bonne réponse révélée, 10 pts fixes
          : gainRogue(
              rogueBonus,
              {
                correct,
                secondesEcoulees: secondsElapsed,
                dureeQuestion,
                mancheBonus,
                streak: nouveauStreak,
                bonnesAvant: bonnes[currentPlayer],
                index,
                niveau: question.niveau || 'mix',
                themeId: themeIdQ,
                themePrecedent: precedent ? precedent.themeId : null,
                themeDejaVu: details.some((d) => d.themeId === themeIdQ),
                themeCibleId: themeCible,
              },
              jackpotActif
            );
      // Reliques one-shot sur streak (ex. « Combo doré » à 15 d'affilée)
      for (const os of rogueBonus.streakOneShot) {
        if (correct && nouveauStreak >= os.seuil && !oneShotFaits.includes(os.seuil)) {
          gain += os.n;
          setOneShotFaits((f) => [...f, os.seuil]);
        }
      }
      gain += bonusStreak;
    } else {
      gain = pointsFor(correct, secondsElapsed, mancheBonus, dureeQuestion) + bonusStreak;
      // Quizz du jour boosté par la série de jours (>= 3 jours = points x1,5)
      if (mode === 'quotidien' && currentDailyStreak().account >= 3)
        gain = Math.round(gain * 1.5);
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
  // Ouvrir le choix de relique (phase 'relique', timer en pause) : propositions sans remise.
  function ouvrirChoixRelique() {
    const b = computeRogueBonus(relics);
    // Pondération progressive : plus on avance dans la run, plus les reliques rares
    // (puis épiques/légendaires) ont de poids dans les propositions.
    const prog = Math.min(1, index / ROGUE_MAX);
    setProposals(drawRelicChoices(relics.map((r) => r.id), nbPropositions(b), Math.random, prog));
    setAPrendre(nbAPrendre(b));
    setPhase('relique');
  }

  function suivant() {
    reset();
    setSelection(null);
    if (mode === 'rogue') {
      if (!lastCorrect) {
        // Relique « Esprit gardien » : l'erreur rejoue la même question (1 fois).
        if (charges.rejouer > 0) {
          setCharges((c) => ({ ...c, rejouer: c.rejouer - 1 }));
          setPhase('question');
          return;
        }
        // Relique « Ankh » / « Seconde chance » : la faute est pardonnée, la run continue.
        if (charges.pardon > 0) {
          setCharges((c) => ({ ...c, pardon: c.pardon - 1 }));
          if (index + 1 >= questions.length) return finir();
          setIndex((i) => i + 1);
          setPhase('question');
          return;
        }
        // Relique « Phénix » : la (dernière) erreur compte comme une bonne réponse.
        if (rogueBonus.pardonAuto) {
          setBonnes((b) => {
            const n = [...b];
            n[currentPlayer] += 1;
            return n;
          });
          if (index + 1 >= questions.length) return finir();
          setIndex((i) => i + 1);
          setPhase('question');
          return;
        }
        // Sinon : mort immédiate, fin de la run.
        return finir();
      }
      if (index + 1 >= questions.length) return finir();
      // Toutes les ROGUE_STEP questions réussies : choix d'une relique (sauf après la dernière).
      if ((index + 1) % ROGUE_STEP === 0) {
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
    let scoresFin = scores.slice(0, nbJoueurs);
    if (mode === 'rogue') {
      // Score final de la run : multiplicateurs de fin + plancher (Assurance).
      const win = lastCorrect && index + 1 >= questions.length; // run menée à 100 sans erreur
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
      // en rogue : questions répondues avant la faute
      details,
      relics: mode === 'rogue' ? relics.map((r) => r.id) : undefined,
    });
  }
  // Abandon en cours de partie (croix dans la TopBar) : on enregistre les
  // résultats partiels (les questions déjà répondues) puis on quitte vers l'accueil.
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
      total: index, // questions effectivement répondues avant l'abandon
      details,
      relics: mode === 'rogue' ? relics.map((r) => r.id) : undefined,
    });
  }

  // --- Actions Rogue Quizz (reliques) ---

  /** Choisir une relique parmi les propositions (phase 'relique'). */
  function choisirRelique(id: string) {
    const r = proposals.find((p) => p.id === id);
    if (!r || phase !== 'relique') return;
    playSound('clic', prefs);
    let nouvelles = [...relics, r];
    const effet = r.effet;
    if (effet.t === 'immediat') {
      // points immédiats (Trésor enfoui, Trésor du roi)
      setScores((s) => {
        const n = [...s];
        n[currentPlayer] += effet.n;
        return n;
      });
    }
    if (effet.t === 'reliqueGratuite') {
      // Fer à cheval : +1 relique aléatoire offerte tout de suite
      const prog = Math.min(1, index / ROGUE_MAX);
      const auto = drawRelicChoices(nouvelles.map((x) => x.id), 1, Math.random, prog)[0];
      if (auto) nouvelles = [...nouvelles, auto];
    }
    if (effet.t === 'themeCible') {
      // Cible : désigne un thème aléatoire de la run (ses questions rapportent ×2)
      const themes = config.allThemes || [];
      if (themes.length > 0) setThemeCible(themes[Math.floor(Math.random() * themes.length)].id);
    }
    setRelics(nouvelles);
    // Recharger les charges consommables apportées par cette relique.
    setCharges((c) => ({
      fifty: c.fifty + (effet.t === 'fifty' ? effet.n : 0),
      skip: c.skip + (effet.t === 'skip' ? effet.n : 0),
      repioche: c.repioche + (effet.t === 'repioche' ? effet.n : 0),
      pardon: c.pardon + (effet.t === 'pardon' ? effet.n : 0),
      rejouer: c.rejouer + (effet.t === 'rejouer' ? effet.n : 0),
      fige: c.fige + (effet.t === 'fige' ? effet.n : 0),
      voir: c.voir + (effet.t === 'voir' ? effet.n : 0),
    }));
    if (effet.t === 'jackpot') setJackpot(effet.n);
    const restant = aPrendre - 1;
    setAPrendre(restant);
    if (restant > 0) {
      // doubleChoix / choixMax : on re-propose encore des reliques
      const b = computeRogueBonus(nouvelles);
      const prog = Math.min(1, index / ROGUE_MAX);
      setProposals(drawRelicChoices(nouvelles.map((x) => x.id), nbPropositions(b), Math.random, prog));
    } else {
      setProposals([]);
      setPhase('question');
    }
  }

  /** Passer la question courante sans pénalité (relique Skip) : compte comme bonne, 10 pts. */
  function passerQuestion() {
    if (mode !== 'rogue' || phase !== 'question' || charges.skip <= 0) return;
    setCharges((c) => ({ ...c, skip: c.skip - 1 }));
    playSound('clic', prefs);
    const nouveauStreak = streaks[currentPlayer] + 1;
    const bonusStreak = Math.min(10, nouveauStreak - 1);
    const gain = 10 + bonusStreak;
    setSelection(null);
    setLastGain(gain);
    setLastBonus(bonusStreak);
    setStreaks((s) => {
      const n = [...s];
      n[currentPlayer] = nouveauStreak;
      return n;
    });
    setLastCorrect(true);
    setBonnes((b) => {
      const n = [...b];
      n[currentPlayer] += 1;
      return n;
    });
    setScores((s) => {
      const n = [...s];
      n[currentPlayer] += gain;
      return n;
    });
    setDetails((d) => [
      ...d,
      {
        themeId: question.themeId || theme.id,
        themeName: question.themeName || theme.nom,
        niveau: (question.niveau || niveau) as LevelId | string,
        correct: true,
        gain,
        streak: nouveauStreak,
        bonusStreak,
        secondes: dureeQuestion - time,
        q: question.q,
      },
    ]);
    setPhase('reponse');
  }

  /** Re-piocher la question courante (relique Mulligan) : tire une autre question du même niveau. */
  function repiocherQuestion() {
    if (mode !== 'rogue' || phase !== 'question' || charges.repioche <= 0) return;
    setCharges((c) => ({ ...c, repioche: c.repioche - 1 }));
    playSound('clic', prefs);
    const pool = (config.allThemes || []).flatMap((t) =>
      t.questions
        .filter((q) => q.niveau === question.niveau)
        .map((q) => ({ ...q, themeId: t.id, themeName: t.nom, themeColor: t.couleur, themeIcon: t.icone }))
    );
    const dispo = pool.filter((q) => !questions.some((deja) => deja.q === q.q));
    if (dispo.length === 0) return;
    const nouvelle = dispo[Math.floor(Math.random() * dispo.length)];
    // Mélanger les réponses de la nouvelle question
    const ordre = nouvelle.reponses.map((_, i) => i).sort(() => Math.random() - 0.5);
    const q2 = {
      ...nouvelle,
      reponses: ordre.map((i) => nouvelle.reponses[i]),
      bonne: ordre.indexOf(nouvelle.bonne),
    };
    setQuestionsRogue([...questions.slice(0, index), q2, ...questions.slice(index + 1)]);
    setReponseMasquee(null);
    reset();
    setPhase('question');
  }

  /** Révéler la bonne réponse (relique « Regard perçant ») : la question vaut 10 pts. */
  function revelerBonne() {
    if (mode !== 'rogue' || phase !== 'question' || charges.voir <= 0 || bonneRevelee) return;
    setCharges((c) => ({ ...c, voir: c.voir - 1 }));
    setBonneRevelee(true);
    playSound('clic', prefs);
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
    relics,
    proposals,
    rogueBonus,
    charges,
    reponseMasquee,
    bonneRevelee,
    questionAffichage,
    timerFige,
    dureeQuestion,
    tempsChoix,
    jackpot,
    choisirRelique,
    passerQuestion,
    repiocherQuestion,
    revelerBonne,
  };
}
