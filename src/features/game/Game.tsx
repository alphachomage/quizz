// features/game/Game.tsx — écran de jeu, NE FAIT QUE RENDRE.
// Toute la logique est dans useGame.ts (testable hors React).
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { roundInfo, pointsFor } from '@lib/scoring.js';
import type { GameResult, Prefs } from '@lib/types.js';
import { useGame } from './useGame.js';
import type { GameViewState, ThemeBadge } from './useGame.js';
import type { GameLaunchConfig } from './draw.js';
import { COLORBLIND_COLORS, ANSWER_COLORS, COLORBLIND_TF } from './constants.js';
import TopBar from './components/TopBar.jsx';
import Confetti from './components/Confetti.jsx';
import Feedback from './components/Feedback.jsx';
import TimerLine from './components/TimerLine.jsx';
import PassDevice from './components/PassDevice.jsx';
import Answers from './components/Answers.jsx';
import ReportButton from './components/ReportButton.jsx';
import RelicChoice from './components/RelicChoice.jsx';
import RogueActions from './components/RogueActions.jsx';

/** Props de l'écran de jeu : config de lancement (depuis l'accueil), prefs et callbacks de fin. */
export interface GameProps {
  config: GameLaunchConfig;
  prefs: Prefs;
  onFinish: (result: GameResult) => void;
  onQuit: (result: GameResult) => void;
}

/** Au-delà de ce nombre de caractères, la question passe en texte réduit. */
const LONG_QUESTION = 110;

export default function Game({ config, prefs, onFinish, onQuit }: GameProps): ReactElement {
  const p = useGame({
    config,
    prefs,
    onFinish,
    onQuit,
  });
  const { mode, theme, players, question, phase, index, questions, time } = p;

  // --- Valeurs d'affichage dérivées ---
  const pct = p.dureeQuestion > 0 ? (time / p.dureeQuestion) * 100 : 0;
  // Question vrai/faux : « Vrai » toujours en bleu, « Faux » toujours en rouge,
  // quelle que soit la position après le mélange aléatoire.
  const isTrueFalse =
    question.reponses.length === 2 &&
    question.reponses.every((r) => ['vrai', 'faux'].includes(String(r).trim().toLowerCase()));
  const daltonien = !!(prefs && prefs.daltonien);
  const answerColor = (r: string, i: number): string => {
    if (isTrueFalse) {
      const v = String(r).trim().toLowerCase() === 'vrai';
      if (daltonien) return v ? COLORBLIND_TF.vrai : COLORBLIND_TF.faux;
      return v ? '#5b8def' : '#ff5d73';
    }
    // Relique Monochrome : toutes les réponses ont la même couleur.
    if (mode === 'rogue' && p.rogueBonus.monochromePct > 0) return '#a78bfa';
    const palette = daltonien ? COLORBLIND_COLORS : ANSWER_COLORS;
    return palette[i % palette.length];
  };
  const withRounds = mode === 'solo' || mode === 'duel';
  const { round, bonus } = withRounds
    ? roundInfo(index, questions.length)
    : {
        round: 1,
        bonus: false,
      };
  // Points encore en jeu si l'on répond maintenant (20 pts max, -1 pt/s, min 10,
  // x2 en manche bonus) : la barre change de couleur selon ces points.
  const basePoints = pointsFor(true, p.dureeQuestion - time);
  const remainingPoints = pointsFor(true, p.dureeQuestion - time, bonus);
  const barColor = basePoints >= 17 ? '#2fd27a' : basePoints >= 13 ? '#FFD60A' : '#ff5d73';
  // En mode « tous thèmes », chaque question affiche son propre thème.
  const currentTheme = useMemo<ThemeBadge>(
    () =>
      question.themeName
        ? {
            nom: question.themeName,
            couleur: question.themeColor,
            icone: question.themeIcon,
          }
        : theme,
    [question, theme]
  );
  const pAvecManches = useMemo<GameViewState>(
    () => ({
      ...p,
      round,
      bonus,
      withRounds,
      currentTheme,
    }),
    [p, round, bonus, withRounds, currentTheme]
  );

  // --- Écran « passe l'appareil » (mode duel uniquement) ---
  if (phase === 'attente') {
    return (
      <PassDevice joueur={players[p.currentPlayer]} themeColor={theme.couleur} onPret={p.pret} />
    );
  }
  // --- Écran de choix de relique (mode rogue) : le timer est en pause ---
  if (phase === 'relique') {
    return (
      <RelicChoice
        proposals={p.proposals}
        relics={p.relics}
        recyclageEtape={p.recyclageEtape}
        numeroChoix={p.relics.length + 1}
        tempsRestant={p.tempsChoix}
        peutRefuser={p.rogueBonus.ascete > 0}
        themeAPicker={p.themeAPicker}
        themes={config.allThemes || []}
        onChoisir={p.choisirRelique}
        onRefuser={p.refuserChoix}
        onSacrifier={p.sacrifierRelique}
        onChoisirTheme={p.choisirThemeSpecialiste}
      />
    );
  }
  return (
    <div className="partie">
      <Confetti confetti={p.confetti} />
      <TopBar p={pAvecManches} />

      {mode === 'duel' && (
        <div className="tour">
          Au tour de <strong>{players[p.currentPlayer]}</strong>
        </div>
      )}

      <TimerLine
        pct={pct}
        barColor={barColor}
        remainingPoints={remainingPoints}
        danger={time <= 3 && phase === 'question'}
        expire={phase === 'reponse' && p.selection === null}
      />

      {/* Question très longue (≈ 1 % du corpus) : texte réduit, la partie tient sur un écran */}
      {/* key liée à l'index (préfixes distincts entre frères) : re-monté à chaque question, l'animation d'apparition rejoue */}
      <h1
        key={`q-${index}`}
        className={question.q.length > LONG_QUESTION ? 'question longue' : 'question'}
      >
        {question.q}
      </h1>

      {/* Relique Indice : l'anecdote s'affiche AVANT de répondre */}
      {mode === 'rogue' && phase === 'question' && p.rogueBonus.indiceMalusS > 0 && question.info && (
        <p className="info indice-avant">{question.info}</p>
      )}

      <Answers
        key={`r-${index}`}
        question={p.questionAffichage}
        phase={phase}
        selection={p.selection}
        answerColor={answerColor}
        onAnswer={p.answer}
        revelation={p.bonneRevelee ? p.questionAffichage.bonne : null}
        surbrillance={p.surbrillance}
        barree={p.barree}
        votePcts={p.votePcts}
        scintille={p.scintille}
        ecoulees={p.ecoulees}
        eliminationMax={p.rogueBonus.eliminationMaxPts}
        brouillardS={p.rogueBonus.brouillard?.s || 0}
      />

      <RogueActions p={p} />

      <ReportButton isReported={p.isReported} onSignaler={p.reportQuestion} />

      <Feedback p={pAvecManches} />
    </div>
  );
}
