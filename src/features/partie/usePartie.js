// features/partie/usePartie.js — TOUTE la logique d'une partie (états, actions,
// effets), extraite de l'ancien god composant Partie.jsx. Testable hors React.
import { useEffect, useMemo, useState } from 'react';

import { infoManche, pointsPour, TEMPS_PAR_QUESTION } from '@lib/scoring.js';
import { ajouterSignalement, chargerSignales } from '@lib/signalements.js';
import { cleSerie, sauverSerie } from '@lib/series.js';
import { streakJourActuelle } from '@lib/streak.js';
import { jouerSon, sonPourStreak, vibrer, demarrerMusique, arreterMusique } from '@lib/sons.js';

import { COULEURS_CONFETTIS } from './constantes.js';
import { tirerQuestionsPartie } from './tirage.js';
import { useMinuteur } from './useMinuteur.js';

export function usePartie({ config, prefs, onTerminer }) {
  const { mode, niveau, theme, joueurs } = config;
  const nbJoueurs = mode === 'duel' ? 2 : 1;

  // ALEATOIRE : à chaque partie, chaque joueur reçoit son propre tirage au hasard.
  const questionsParJoueur = useMemo(() => tirerQuestionsPartie(config), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = useState(0); // question courante (0..n-1)
  const [joueurActuel, setJoueurActuel] = useState(0);
  const [phase, setPhase] = useState(mode === 'duel' ? 'attente' : 'question'); // 'attente' | 'question' | 'reponse'
  const [selection, setSelection] = useState(null);
  const [scores, setScores] = useState([0, 0]);
  const [bonnes, setBonnes] = useState([0, 0]);
  const [dernierGain, setDernierGain] = useState(0);
  const [dernierBonus, setDernierBonus] = useState(0); // bonus de série (streak)
  const [streaks, setStreaks] = useState([0, 0]); // bonnes réponses enchaînées, par joueur
  const [derniereCorrect, setDerniereCorrect] = useState(true);
  const [details, setDetails] = useState([]); // historique question par question (stats)
  const [confettis, setConfettis] = useState([]);
  const [signales, setSignales] = useState(() => chargerSignales()); // questions signalées (pouce rouge)

  const questions = questionsParJoueur[joueurActuel]; // tirage du joueur courant
  const question = questions[Math.min(index, questions.length - 1)];

  const { temps, setTemps } = useMinuteur(phase === 'question', TEMPS_PAR_QUESTION, () => repondre(null));

  // Ambiance sonore de la partie (nappe douce), selon le réglage « Musique de fond ».
  useEffect(() => {
    if (prefs && prefs.musique !== false) demarrerMusique(prefs);
    else arreterMusique();
    return () => arreterMusique();
  }, [prefs && prefs.musique]);

  // Bip chaque seconde quand il reste 3 s ou moins.
  const seconde = Math.ceil(temps);
  useEffect(() => {
    if (phase === 'question' && seconde > 0 && seconde <= 3) jouerSon('tick', prefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconde, phase]);

  // Enchaînement AUTOMATIQUE : 2 s après la réponse (ou le temps écoulé),
  // on passe à la suite sans clic. En duel, on passe d'abord par l'écran
  // « passe l'appareil » (clic obligatoire pour garder le secret).
  useEffect(() => {
    if (phase !== 'reponse') return undefined;
    const t = setTimeout(() => suivant(), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, joueurActuel]);

  function repondre(i) {
    if (phase !== 'question') return;
    const correct = i !== null && i === question.bonne;
    const secondesEcoulees = TEMPS_PAR_QUESTION - temps;
    const avecBonus = mode === 'solo' || mode === 'duel';
    const { bonus } = avecBonus ? infoManche(index, questions.length) : { bonus: false };
    // BONUS DE SÉRIE : 0 à la 1re bonne réponse, puis +1 pt à la 2e enchaînée, +2 à la 3e, etc.
    // (bonus = n° de la série − 1, plafonné à +10)
    const nouveauStreak = correct ? streaks[joueurActuel] + 1 : 0;
    const bonusStreak = correct ? Math.min(10, nouveauStreak - 1) : 0;
    let gain = pointsPour(correct, secondesEcoulees, bonus) + bonusStreak;
    // Quizz du jour boosté par la série de jours (>= 3 jours = points x1,5)
    if (mode === 'quotidien' && streakJourActuelle().compte >= 3) gain = Math.round(gain * 1.5);
    setSelection(i);
    setDernierGain(gain);
    setDernierBonus(bonusStreak);
    setStreaks((s) => {
      const n = [...s];
      n[joueurActuel] = nouveauStreak;
      return n;
    });
    setDerniereCorrect(correct);
    setDetails((d) => [...d, {
      themeId: question.themeId || theme.id,
      themeNom: question.themeNom || theme.nom,
      niveau: question.niveau || niveau,
      correct,
      gain,
      streak: nouveauStreak,
      bonusStreak,
      secondes: secondesEcoulees, // temps de réaction (stats avancées)
    }]);
    setScores((s) => {
      const n = [...s];
      n[joueurActuel] += gain;
      return n;
    });
    if (correct) {
      setBonnes((b) => {
        const n = [...b];
        n[joueurActuel] += 1;
        return n;
      });
      // Son de plus en plus satisfaisant selon la série en cours (3-5, 6-9, 10+)
      jouerSon(sonPourStreak(nouveauStreak), prefs);
      vibrer(nouveauStreak >= 10 ? [60, 50, 60, 50, 140] : nouveauStreak >= 6 ? [50, 40, 90] : nouveauStreak >= 3 ? [40, 40, 70] : 40, prefs);
      if (prefs && prefs.animations !== false) lancerConfettis();
    } else {
      jouerSon('faux', prefs);
      vibrer([180], prefs);
    }
    setPhase('reponse');
  }

  function lancerConfettis() {
    const pieces = Array.from({ length: 26 }, (_, k) => ({
      id: `${Date.now()}-${k}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      couleur: COULEURS_CONFETTIS[k % COULEURS_CONFETTIS.length],
      taille: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
    }));
    setConfettis(pieces);
    setTimeout(() => setConfettis([]), 1500);
  }

  function suivant() {
    setTemps(TEMPS_PAR_QUESTION);
    setSelection(null);
    // En survie, la première mauvaise réponse (ou le temps écoulé) termine la partie.
    if (mode === 'survie' && !derniereCorrect) return finir();
    if (mode === 'solo' || mode === 'survie' || mode === 'quotidien') {
      if (index + 1 >= questions.length) return finir();
      setIndex((i) => i + 1);
      setPhase('question');
    } else if (joueurActuel === 0) {
      setJoueurActuel(1);
      setPhase('attente'); // on passe l'appareil au joueur 2
    } else {
      if (index + 1 >= questions.length) return finir();
      setIndex((i) => i + 1);
      setJoueurActuel(0);
      setPhase('attente'); // on repasse l'appareil au joueur 1
    }
  }

  function pret() {
    setTemps(TEMPS_PAR_QUESTION);
    setPhase('question');
  }

  // Pouce rouge : signaler la question courante (ajoute +1 au compteur admin).
  const estSignalee = signales.some((s) => s.q === question.q);
  function signalerQuestion() {
    if (estSignalee) return;
    jouerSon('clic', prefs);
    ajouterSignalement({
      q: question.q,
      themeId: question.themeId || theme.id,
      themeNom: question.themeNom || theme.nom,
    });
    vibrer(30, prefs);
    setSignales(chargerSignales());
  }

  function finir() {
    jouerSon('fin', prefs);
    // On mémorise la série jouée (union des tirages de tous les joueurs) pour
    // garantir que le prochain « Rejouer » tire des questions différentes.
    if (mode !== 'quotidien') {
      sauverSerie(cleSerie(mode, niveau, theme.id), questionsParJoueur.flat());
    }
    onTerminer({
      mode,
      niveau,
      theme,
      joueurs,
      scores: scores.slice(0, nbJoueurs),
      bonnes: bonnes.slice(0, nbJoueurs),
      total: mode === 'survie' ? index + 1 : questions.length, // en survie : questions répondues avant la faute
      details,
    });
  }

  return {
    config, mode, niveau, theme, joueurs, nbJoueurs,
    questions, question, index, joueurActuel, phase,
    temps, seconde, selection, scores, bonnes,
    dernierGain, dernierBonus, streaks, confettis, estSignalee,
    repondre, suivant, pret, finir, signalerQuestion,
  };
}
