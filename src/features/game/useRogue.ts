// features/game/useRogue.ts — état et actions du mode Rogue Quizz (reliques, vies, paliers,
// effets par question). Branché sur le noyau de partie (useGame) via `RogueCore` :
// useGame garde scores/série/phase, ce hook garde tout ce qui est propre au rogue.
// Les calculs sans état vivent dans `@lib/rogueRun.ts` (testés à part).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { ROGUE_MAX, ROGUE_STEP, ROGUE_VIES_DEPART, SECONDS_PER_QUESTION, dureePourNiveau } from '@lib/scoring.js';
import { playSound } from '@lib/sounds.js';
import { RELICS, aRelic, computeRogueBonus, drawRelicChoices, gainRogue, nbAPrendre, nbPropositions } from '@lib/relics.js';
import type { Relic } from '@lib/relics.js';
import {
  appliquerEffetPalier,
  appliquerEffetVies,
  appliquerMasquees,
  candidates,
  carrySuivant,
  dureeRogue,
  meilleurTheme,
  melangerReponses,
  niveauInferieur,
  niveauSuperieur,
  palierInitial,
  palierVide,
  pickRandom,
  questionDansPalier,
  reponseBarree,
  reponsesAMasquer,
  surbrillanceLoupe,
  viesPerdues,
  votePublicPcts,
} from '@lib/rogueRun.js';
import type { PalierRogue } from '@lib/rogueRun.js';
import type { Prefs } from '@lib/types.js';
import type { DrawnQuestion, GameLaunchConfig } from './draw.js';
import type { DetailPartie, GamePhase } from './gameTypes.js';
import { useLatest } from './useLatest.js';

/** Snapshot pour « Retour en arrière » : restaure l'état d'avant la dernière réponse. */
interface Snapshot {
  scores: number[];
  bonnes: number[];
  streaks: number[];
  vies: number;
  details: DetailPartie[];
  index: number;
}

/** Effets visuels / structurels de la question courante (réinitialisés à chaque question). */
interface QuestionFx {
  masquees: number[]; // réponses retirées (50/50, Domino)
  domino: boolean; // question réduite à 2 réponses
  surbrillance: number[]; // Loupe
  barree: number | null; // Lunettes rouges
  votePcts: number[] | null; // Vote du public
  scintille: boolean; // Intuition
  bonneRevelee: boolean; // Rayon X
}

const FX_VIDE: QuestionFx = {
  masquees: [],
  domino: false,
  surbrillance: [],
  barree: null,
  votePcts: null,
  scintille: false,
  bonneRevelee: false,
};

/** Ce que le rogue emprunte au noyau de la partie (état lu via refs, mutations via setters). */
export interface UseRogueParams {
  config: GameLaunchConfig;
  prefs: Prefs;
  index: number;
  currentPlayer: number;
  phase: GamePhase;
  /** Série en cours du joueur courant (entrée de la durée du timer). */
  streak: number;
  questionsPerPlayer: DrawnQuestion[][];
  phaseRef: MutableRefObject<GamePhase>;
  streaksRef: MutableRefObject<number[]>;
  scoresRef: MutableRefObject<number[]>;
  bonnesRef: MutableRefObject<number[]>;
  detailsRef: MutableRefObject<DetailPartie[]>;
  answerRef: MutableRefObject<(i: number | null) => void>;
  resetTimerRef: MutableRefObject<() => void>;
  setPhase: Dispatch<SetStateAction<GamePhase>>;
  setScores: Dispatch<SetStateAction<number[]>>;
  setBonnes: Dispatch<SetStateAction<number[]>>;
  setStreaks: Dispatch<SetStateAction<number[]>>;
  setDetails: Dispatch<SetStateAction<DetailPartie[]>>;
  setIndex: Dispatch<SetStateAction<number>>;
  setLastCorrect: Dispatch<SetStateAction<boolean>>;
  setLastGain: Dispatch<SetStateAction<number>>;
  setSelection: Dispatch<SetStateAction<number | null>>;
}

/** Entrée de la résolution d'une réponse en mode rogue. */
export interface RogueAnswerInput {
  i: number | null;
  correct: boolean;
  qAff: DrawnQuestion;
  secondsElapsed: number;
  mancheBonus: boolean;
}

export function useRogue(p: UseRogueParams) {
  const { config, prefs, index, currentPlayer, phase, questionsPerPlayer } = p;
  const mode = config.mode;
  const isRogue = mode === 'rogue';
  const allThemes = config.allThemes || [];

  // --- Questions courantes (modifiables en rogue : Pioche, Révision, Zone de confort…) ---
  const [questionsRogue, setQuestionsRogue] = useState<DrawnQuestion[] | null>(() =>
    isRogue ? questionsPerPlayer[currentPlayer] : null
  );
  const questions = isRogue && questionsRogue ? questionsRogue : questionsPerPlayer[currentPlayer];
  const question = questions[Math.min(index, questions.length - 1)];

  // --- Reliques et choix ---
  const [relics, setRelics] = useState<Relic[]>([]);
  // Première proposition de reliques dès le lancement de la run (choix de départ).
  const [proposals, setProposals] = useState<Relic[]>(() =>
    isRogue ? drawRelicChoices([], nbPropositions(computeRogueBonus([])), Math.random, 0, null, 1) : []
  );
  const [aPrendre, setAPrendre] = useState(1);
  const [recyclageEtape, setRecyclageEtape] = useState<'sacrifice' | 'nouveau' | null>(null);
  const [themeAPicker, setThemeAPicker] = useState(false);
  const [themeSpecialiste, setThemeSpecialiste] = useState<string | null>(null);
  const rogueBonus = useMemo(() => computeRogueBonus(relics), [relics]);

  // --- Vies et palier ---
  const [vies, setVies] = useState(ROGUE_VIES_DEPART);
  const [viesMax, setViesMax] = useState(ROGUE_VIES_DEPART);
  const [palier, setPalier] = useState<PalierRogue>(palierVide);

  // --- Effets de la question et timer ---
  const [questionAffichage, setQuestionAffichage] = useState<DrawnQuestion>(() => questionsPerPlayer[0][0]);
  const [fx, setFx] = useState<QuestionFx>(FX_VIDE);
  const [pariPlacee, setPariPlacee] = useState(false);
  const [geleRestant, setGeleRestant] = useState(0);
  const [timerFige, setTimerFige] = useState(false);
  const [dureeOverride, setDureeOverride] = useState<number | null>(null); // Second souffle
  const [carryBonus, setCarryBonus] = useState(0); // temps reporté (Horloge partagée / Momentum / Encyclopédie)
  const [fievreRestant, setFievreRestant] = useState(0);
  const [miroirFait, setMiroirFait] = useState(false);

  // Refs miroirs : valeurs relues dans des callbacks de timer ou des effets ciblés.
  const bonusRef = useLatest(rogueBonus);
  const relicsRef = useLatest(relics);
  const palierRef = useLatest(palier);
  const qAffRef = useLatest(questionAffichage);
  const fxRef = useLatest(fx);
  const pariPlaceeRef = useLatest(pariPlacee);
  const viesMaxRef = useLatest(viesMax);
  const fievreRestantRef = useLatest(fievreRestant);
  const carryBonusRef = useLatest(carryBonus);
  // Valeurs qui ne servent qu'aux calculs (jamais affichées) : refs pures, sans re-render.
  const viesRef = useRef(ROGUE_VIES_DEPART);
  const snapshotRef = useRef<Snapshot | null>(null);
  const retourArriereMalusRef = useRef(0);
  const modifieRef = useRef(new Set<number>()); // index déjà swappés (une fois par question)
  const revisionPoolRef = useRef<DrawnQuestion[]>([]);
  const isRevisionRef = useRef(false);
  const zoneConfortRef = useRef(false);
  const retryEnCoursRef = useRef(false);
  const rebondActifRef = useRef(false);
  const assuranceUtiliseRef = useRef(false);
  const echoActifRef = useRef(false);
  const dernierChoixRef = useRef<string | null>(null);
  const palierEcoleRef = useRef<number | null>(null); // Retour à l'école

  const ajouterScore = (delta: number) =>
    p.setScores((s) => {
      const n = [...s];
      n[currentPlayer] += delta;
      return n;
    });
  const dejaJouee = (q: string): boolean => p.detailsRef.current.some((d) => d.q === q);
  const remplacerQuestion = (q: DrawnQuestion) =>
    setQuestionsRogue((qs) => (qs ? [...qs.slice(0, index), q, ...qs.slice(index + 1)] : qs));
  const probaReliques = () => Math.min(1, index / ROGUE_MAX);
  const tirerReliques = (possedees: Relic[], n: number, raretes: ('rare' | 'legendaire')[] | null) =>
    drawRelicChoices(possedees.map((r) => r.id), n, Math.random, probaReliques(), raretes, Math.min(ROGUE_MAX, index + 1));

  // --- Mise en place de chaque question (rogue) : swaps, puis effets visuels ---
  const preparerQuestion = () => {
    const b = bonusRef.current;
    const qDansPalier = questionDansPalier(index);
    let q = questions[Math.min(index, questions.length - 1)];
    // Swaps de question (une fois par index) : Révision, Zone de confort, Chasseur, Retour à l'école.
    if (!modifieRef.current.has(index)) {
      modifieRef.current.add(index);
      let zoneConfort = false;
      let revision = false;
      // Révision : les erreurs reviennent en fin de palier
      if (b.revisionMult > 0 && revisionPoolRef.current.length > 0 && qDansPalier >= ROGUE_STEP - 1) {
        q = revisionPoolRef.current[0];
        revisionPoolRef.current = revisionPoolRef.current.slice(1);
        revision = true;
        remplacerQuestion(q);
      }
      // Zone de confort : 1 question sur 3 vient du meilleur thème
      if (b.zoneConfortMalusPct > 0 && qDansPalier % 3 === 1) {
        const bestId = meilleurTheme(p.detailsRef.current, allThemes);
        const bestThemeObj = allThemes.find((t) => t.id === bestId);
        if (bestId && bestThemeObj && q.themeId !== bestId) {
          const cand = candidates([bestThemeObj], q.niveau, dejaJouee);
          if (cand.length > 0) {
            q = pickRandom(cand);
            zoneConfort = true;
            remplacerQuestion(q);
          }
        }
      }
      // Chasseur : les questions dur arrivent plus souvent (swap ~1/3 des non-dur)
      if (b.chasseur && q.niveau !== 'dur' && Math.random() < 0.34) {
        const cand = candidates(allThemes, 'dur', dejaJouee);
        if (cand.length > 0) {
          q = pickRandom(cand);
          remplacerQuestion(q);
        }
      }
      // Retour à l'école : ce palier est un cran moins difficile
      if (palierEcoleRef.current === Math.floor(index / ROGUE_STEP)) {
        const cand = candidates(allThemes, niveauInferieur(q.niveau), dejaJouee);
        if (cand.length > 0) {
          q = pickRandom(cand);
          remplacerQuestion(q);
        }
      }
      isRevisionRef.current = revision;
      zoneConfortRef.current = zoneConfort;
    }
    // Marathon : réserve à 0 -> toutes les questions restantes du palier sont ratées.
    if (b.marathon && palierRef.current.reserve <= 0) {
      setQuestionAffichage(q);
      p.answerRef.current(null);
      return;
    }
    // Effets visuels / structurels de la question.
    const cinquante = palierRef.current.cinquante > 0 && q.reponses.length > 3;
    const domino = b.dominoVies > 0 && p.streaksRef.current[currentPlayer] >= 3 && q.reponses.length > 2;
    const masquees = reponsesAMasquer(q, { cinquante, domino });
    if (cinquante) setPalier((pl) => ({ ...pl, cinquante: pl.cinquante - 1 }));
    setFx({
      masquees,
      domino,
      surbrillance: b.loupeMalusS > 0 ? surbrillanceLoupe(q) : [],
      barree: b.barreeFlat < 0 ? reponseBarree(q) : null,
      votePcts: b.votePublic ? votePublicPcts(q) : null,
      scintille: b.intuition && qDansPalier % 3 === 1, // 1 question sur 3, la bonne scintille
      bonneRevelee: b.rayonXMalusS > 0 && qDansPalier === 1, // Rayon X : 1re question du palier
    });
    setPariPlacee(false);
    setMiroirFait(false);
    retryEnCoursRef.current = false;
    setDureeOverride(null);
    // Snapshot pour « Retour en arrière »
    snapshotRef.current = {
      scores: p.scoresRef.current,
      bonnes: p.bonnesRef.current,
      streaks: p.streaksRef.current,
      vies: viesRef.current,
      details: p.detailsRef.current,
      index,
    };
  };
  const preparerRef = useLatest(preparerQuestion);
  useEffect(() => {
    if (isRogue) preparerRef.current();
  }, [index, isRogue, preparerRef]);

  // Application structurelle des réponses masquées (50/50, Domino) sur la question affichée.
  useEffect(() => {
    if (!isRogue || fx.masquees.length === 0) setQuestionAffichage(question);
    else setQuestionAffichage(appliquerMasquees(question, fx.masquees));
  }, [isRogue, question, fx.masquees]);

  // Durée du timer de la question courante.
  const dureeQuestion = useMemo(() => {
    if (!isRogue) return dureePourNiveau(question.niveau, SECONDS_PER_QUESTION);
    if (dureeOverride !== null) return dureeOverride;
    return dureeRogue({
      b: rogueBonus,
      niveau: question.niveau,
      index,
      carryBonus,
      retourArriereMalus: retourArriereMalusRef.current || 0,
      reserve: palier.reserve,
      streak: p.streak,
      fievreRestant,
    });
  }, [isRogue, rogueBonus, index, question.niveau, carryBonus, dureeOverride, palier.reserve, fievreRestant, p.streak]);

  // Gel manuel (Arrêt sur image) : décompte des secondes de gel.
  const geleActif = geleRestant > 0;
  useEffect(() => {
    if (!geleActif) return undefined;
    const t = setInterval(() => setGeleRestant((g) => Math.max(0, g - 0.2)), 200);
    return () => clearInterval(t);
  }, [geleActif]);

  /** Temps écoulé : Second souffle (1re fois par palier) rallonge le chrono, sinon réponse ratée. */
  const onExpire = () => {
    if (
      isRogue &&
      palierRef.current.secondSouffle &&
      aRelic(relicsRef.current, 'second-souffle') &&
      p.phaseRef.current === 'question'
    ) {
      setPalier((pl) => ({ ...pl, secondSouffle: false }));
      setDureeOverride(5);
      return;
    }
    p.answerRef.current(null);
  };

  /** Miroir : mélange une fois les réponses (appelé par useGame à mi-chrono). */
  const miroirAttendu = isRogue && rogueBonus.miroirPct > 0 && phase === 'question' && !miroirFait;
  const appliquerMiroir = () => {
    setQuestionAffichage(melangerReponses(qAffRef.current));
    setMiroirFait(true);
  };

  /** Résolution d'une réponse rogue : série, gain, effets de reliques, vies. */
  const resoudreReponse = (a: RogueAnswerInput) => {
    const { i, correct, qAff, secondsElapsed, mancheBonus } = a;
    const b = bonusRef.current;
    const streakAvant = p.streaksRef.current[currentPlayer];
    // Série (Élan : +2 par cran, Plafond brisé : pas de plafond, Filet de sécurité).
    let nouveauStreak = correct ? streakAvant + b.streakStep : 0;
    if (!correct && palierRef.current.filet > 0) {
      nouveauStreak = streakAvant; // la série continue
      setPalier((pl) => ({ ...pl, filet: pl.filet - 1 }));
    }
    const bonusStreak = correct ? Math.min(b.streakCap, Math.max(0, nouveauStreak - 1)) : 0;
    const details = p.detailsRef.current;
    const precedent = details.length > 0 ? details[details.length - 1] : null;
    let gain = 0;
    if (correct) {
      gain =
        retryEnCoursRef.current && b.deuxiemeChancePts > 0
          ? b.deuxiemeChancePts // Deuxième chance : 5 pts fixes
          : gainRogue(b, {
              correct,
              secondesEcoulees: secondsElapsed,
              dureeQuestion,
              mancheBonus,
              streak: nouveauStreak,
              bonnesAvant: p.bonnesRef.current[currentPlayer],
              index,
              questionDansPalier: questionDansPalier(index),
              niveau: qAff.niveau || 'mix',
              themeId: qAff.themeId || config.theme.id,
              themePrecedent: precedent ? precedent.themeId : null,
              vies: viesRef.current,
              viesMax: viesMaxRef.current,
              pariPlace: pariPlaceeRef.current,
              nbReliques: relicsRef.current.length,
              themeSpecialiste,
              zoneConfort: zoneConfortRef.current,
              isRevision: isRevisionRef.current,
              fievreActive: fievreRestantRef.current > 0,
              rebondActif: rebondActifRef.current,
              jackpotActif: palierRef.current.jackpot === index,
              div2: fxRef.current.masquees.length > 0 && b.cinquante !== null,
            });
    }
    gain += bonusStreak;
    // Fièvre : à 10 d'affilée, lance les « questions fièvre »
    if (correct && b.fievre && nouveauStreak >= 10 && fievreRestantRef.current === 0) setFievreRestant(b.fievre.n);
    if (correct && b.fievre && fievreRestantRef.current > 0) setFievreRestant((f) => Math.max(0, f - 1));
    // Vampire : toutes les N bonnes d'affilée rendent 1 vie
    if (correct && b.vampireSeuil > 0 && nouveauStreak % b.vampireSeuil === 0)
      setVies((v) => Math.min(viesMaxRef.current, v + 1));
    rebondActifRef.current = !correct && b.rebond; // Rebond : après une erreur, la suivante vaut ×2
    if (!correct && b.revisionMult > 0) revisionPoolRef.current = [...revisionPoolRef.current, qAff]; // Révision
    setCarryBonus(carrySuivant(b, correct, carryBonusRef.current, dureeQuestion, secondsElapsed));
    // Marathon : la réserve du palier diminue du temps écoulé
    if (b.marathon) {
      const reste = Math.max(0, palierRef.current.reserve - secondsElapsed);
      setPalier((pl) => ({ ...pl, reserve: reste }));
    }
    if (!correct) {
      let perte = viesPerdues(b, { domino: fxRef.current.domino, pariPlace: pariPlaceeRef.current, tempsEcoule: i === null });
      if (palierRef.current.bouclier > 0) {
        perte = 0; // Bouclier : 1re erreur du palier sans perte de vie
        setPalier((pl) => ({ ...pl, bouclier: pl.bouclier - 1 }));
      }
      let nv = viesRef.current - perte;
      if (nv <= 0 && b.assuranceVie && !assuranceUtiliseRef.current) {
        // Assurance : on revient avec 1 vie, −50 % des points (une seule fois)
        assuranceUtiliseRef.current = true;
        nv = 1;
        p.setScores((s) => {
          const n = [...s];
          n[currentPlayer] = Math.round(n[currentPlayer] * 0.5);
          return n;
        });
      }
      setVies(nv);
      viesRef.current = nv;
      setPalier((pl) => ({ ...pl, erreurs: pl.erreurs + 1, parfait: false }));
    } else {
      setPalier((pl) => ({ ...pl, points: pl.points + gain }));
    }
    return { nouveauStreak, bonusStreak, gain };
  };

  // --- Transitions de la run (appelées par `suivant`) ---

  /** Fin de palier (tous les ROGUE_STEP questions) : effets de reliques puis nouveau palier. */
  const finPalier = () => {
    const b = bonusRef.current;
    const pl = palierRef.current;
    const idxFin = index; // dernière question du palier qui se termine
    if (b.interetsPct > 0)
      p.setScores((s) => {
        const n = [...s];
        n[currentPlayer] += Math.round((n[currentPlayer] * b.interetsPct) / 100);
        return n;
      });
    // Tout ou rien : palier parfait ×mult, sinon −p % sur les points du palier
    if (b.toutOuRien)
      ajouterScore(
        pl.parfait
          ? Math.round(pl.points * (b.toutOuRien.mult - 1))
          : -Math.round((pl.points * b.toutOuRien.malusPct) / 100)
      );
    if (b.infirmerie && pl.erreurs === 0) setVies((v) => Math.min(viesMaxRef.current, v + 1)); // Infirmerie
    if (b.marathon && pl.reserve > 0) ajouterScore(Math.round(pl.reserve * b.marathon.mult)); // temps restant -> points
    // Main du destin : une relique au hasard est ajoutée à chaque palier
    if (b.mainDuDestin) {
      const prog = Math.min(1, idxFin / ROGUE_MAX);
      const auto = drawRelicChoices(
        relicsRef.current.map((r) => r.id), 1, Math.random, prog, null, Math.min(ROGUE_MAX, idxFin + 1)
      )[0];
      if (auto) setRelics((r) => [...r, auto]);
    }
    setPalier(palierInitial(b, relicsRef.current, idxFin + 1));
  };

  /** Ouvre le choix de relique (phase 'relique') : propositions sans remise, pondérées. */
  const ouvrirChoixRelique = () => {
    setProposals(tirerReliques(relicsRef.current, nbPropositions(bonusRef.current), null));
    setAPrendre(nbAPrendre(bonusRef.current));
    p.setPhase('relique');
  };

  /** Deuxième chance : retente la même question (1 fois par palier). Renvoie true si activée. */
  const tenterDeuxiemeChance = (): boolean => {
    if (!(bonusRef.current.deuxiemeChancePts > 0 && palierRef.current.deuxiemeChance)) return false;
    setPalier((pl) => ({ ...pl, deuxiemeChance: false }));
    retryEnCoursRef.current = true;
    return true;
  };

  const encoreEnVie = () => viesRef.current > 0;

  // --- Actions du joueur ---

  /** Choisir une relique parmi les propositions (phase 'relique'). */
  const choisirRelique = (id: string) => {
    const r = proposals.find((x) => x.id === id);
    if (!r || phase !== 'relique') return;
    playSound('clic', prefs);
    // Recyclage : on ne garde pas la relique, on passe à l'étape sacrifice.
    if (r.effet.t === 'recyclage') {
      setRecyclageEtape('sacrifice');
      return;
    }
    let nouvelles = [...relics, r];
    if (echoActifRef.current) {
      nouvelles.push(r); // Écho : la relique choisie compte en double
      echoActifRef.current = false;
    }
    // Joker : copie l'effet de la dernière relique choisie
    if (aRelic(nouvelles, 'joker') && dernierChoixRef.current) {
      const copie = RELICS.find((x) => x.id === dernierChoixRef.current);
      if (copie) nouvelles = [...nouvelles, copie];
    }
    dernierChoixRef.current = r.id;
    const e = r.effet;
    // Effets immédiats sur les vies (l'état et la ref sont mis à jour séparément : la ref
    // ne suit pas Vampire/Infirmerie, comportement historique conservé).
    if (e.t === 'vie' || e.t === 'verreCristal' || e.t === 'pacteVies') {
      setViesMax((vm) => appliquerEffetVies(e, 0, vm).viesMax);
      setVies((v) => appliquerEffetVies(e, v, viesMaxRef.current).vies);
      viesRef.current = appliquerEffetVies(e, viesRef.current, viesMaxRef.current).vies;
    }
    setPalier((pl) => appliquerEffetPalier(pl, e, index));
    if (e.t === 'echo') echoActifRef.current = true;
    if (e.t === 'retourEcole') palierEcoleRef.current = Math.floor(index / ROGUE_STEP) + 1; // palier suivant plus facile
    setRelics(nouvelles);
    const restant = aPrendre - 1;
    setAPrendre(restant);
    if (restant > 0) {
      setProposals(tirerReliques(nouvelles, nbPropositions(computeRogueBonus(nouvelles)), null));
    } else if (e.t === 'specialiste') {
      setThemeAPicker(true); // Spécialiste : choisir le thème qui vaut ×2
      setProposals([]);
    } else {
      setProposals([]);
      setRecyclageEtape(null);
      p.setPhase('question');
    }
  };

  /** Fin du chrono de choix : une relique est choisie au hasard. */
  const choisirReliqueAuHasard = () => {
    if (proposals.length > 0) choisirRelique(pickRandom(proposals).id);
  };

  /** Refuser le choix de relique (Ascète : +150 pts), puis continuer la run. */
  const refuserChoix = () => {
    if (!isRogue || phase !== 'relique') return;
    const b = bonusRef.current;
    if (b.ascete <= 0) return;
    playSound('clic', prefs);
    ajouterScore(b.ascete);
    setProposals([]);
    setRecyclageEtape(null);
    p.setPhase('question');
  };

  /** Recyclage, étape 1 : retirer une relique possédée, puis re-proposer 3 reliques rares+. */
  const sacrifierRelique = (id: string) => {
    if (recyclageEtape !== 'sacrifice') return;
    const nouvelles = relics.filter((r) => r.id !== id);
    setRelics(nouvelles);
    setProposals(tirerReliques(nouvelles, 3, ['rare', 'legendaire']));
    setRecyclageEtape('nouveau');
  };

  /** Spécialiste : choisir le thème qui rapporte ×2. */
  const choisirThemeSpecialiste = (themeId: string) => {
    setThemeSpecialiste(themeId);
    setThemeAPicker(false);
    p.setPhase('question');
  };

  /** Arrêt sur image : gèle le chrono 5 s (1 fois par palier). */
  const gelerChrono = () => {
    if (!isRogue || phase !== 'question' || !palier.gele || geleRestant > 0) return;
    setPalier((pl) => ({ ...pl, gele: false }));
    setGeleRestant(5);
    setTimerFige(true);
    setTimeout(() => setTimerFige(false), 5000);
    playSound('clic', prefs);
  };

  /** Pari : miser sur la question courante (×2 si juste, −1 vie de plus si faux). */
  const miser = () => {
    if (!isRogue || phase !== 'question' || !rogueBonus.pari) return;
    setPariPlacee((v) => !v);
    playSound('clic', prefs);
  };

  /** Pioche : passer le thème de la question (remplacée par une plus difficile). */
  const passerTheme = () => {
    if (!isRogue || phase !== 'question' || palier.pioche <= 0) return;
    setPalier((pl) => ({ ...pl, pioche: pl.pioche - 1 }));
    playSound('clic', prefs);
    const pool = candidates(allThemes, niveauSuperieur(question.niveau), dejaJouee);
    if (pool.length === 0) return;
    setQuestionsRogue([...questions.slice(0, index), melangerReponses(pickRandom(pool)), ...questions.slice(index + 1)]);
    setFx((f) => ({ ...f, masquees: [] }));
    p.resetTimerRef.current();
    p.setPhase('question');
  };

  /** Retour en arrière : annule la dernière réponse (1 fois par palier, −1 s toute la partie). */
  const annulerReponse = () => {
    if (!isRogue || phase !== 'reponse' || !palier.retourArriere || !snapshotRef.current) return;
    const snap = snapshotRef.current;
    setPalier((pl) => ({ ...pl, retourArriere: false }));
    retourArriereMalusRef.current += rogueBonus.retourArriereMalusS;
    p.setScores(snap.scores);
    p.setBonnes(snap.bonnes);
    p.setStreaks(snap.streaks);
    setVies(snap.vies);
    viesRef.current = snap.vies;
    p.setDetails(snap.details);
    p.setIndex(snap.index);
    p.setLastCorrect(true);
    p.setLastGain(0);
    p.setSelection(null);
    p.resetTimerRef.current();
    p.setPhase('question');
    playSound('clic', prefs);
  };

  return {
    // état de la partie dérivé du rogue
    questions,
    question,
    questionAffichage,
    dureeQuestion,
    onExpire,
    miroirAttendu,
    appliquerMiroir,
    // état exposé à l'affichage
    relics,
    proposals,
    rogueBonus,
    vies,
    viesMax,
    palier,
    pariPlacee,
    geleRestant,
    timerFige,
    bonneRevelee: fx.bonneRevelee,
    surbrillance: fx.surbrillance,
    barree: fx.barree,
    votePcts: fx.votePcts,
    scintille: fx.scintille,
    recyclageEtape,
    themeAPicker,
    themeSpecialiste,
    // transitions et actions
    resoudreReponse,
    finPalier,
    ouvrirChoixRelique,
    tenterDeuxiemeChance,
    encoreEnVie,
    choisirRelique,
    choisirReliqueAuHasard,
    refuserChoix,
    sacrifierRelique,
    choisirThemeSpecialiste,
    gelerChrono,
    miser,
    passerTheme,
    annulerReponse,
  };
}
