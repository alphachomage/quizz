// features/partie/Partie.jsx — écran de jeu, NE FAIT QUE RENDRE (~120 L).
// Toute la logique est dans usePartie.js (testable hors React).
import { useMemo } from 'react';

import { roundInfo, pointsFor, SECONDS_PER_QUESTION } from '@lib/scoring.js';

import { useGame } from './useGame.js';
import { COLORBLIND_COLORS, ANSWER_COLORS, COLORBLIND_TF } from './constants.js';
import TopBar from './components/TopBar.jsx';
import Confetti from './components/Confetti.jsx';
import Feedback from './components/Feedback.jsx';
import TimerLine from './components/TimerLine.jsx';
import PassDevice from './components/PassDevice.jsx';
import Answers from './components/Answers.jsx';
import ReportButton from './components/ReportButton.jsx';

export default function Game({ config, prefs, onTerminer }) {
  const p = useGame({ config, prefs, onTerminer });
  const { mode, niveau, theme, players, question, phase, index, questions, time } = p;

  // --- Valeurs d'affichage dérivées ---
  const pct = (time / SECONDS_PER_QUESTION) * 100;
  // Question vrai/faux : « Vrai » toujours en bleu, « Faux » toujours en rouge,
  // quelle que soit la position après le mélange aléatoire.
  const estVraiFaux = question.reponses.length === 2 &&
    question.reponses.every((r) => ['vrai', 'faux'].includes(String(r).trim().toLowerCase()));
  const daltonien = !!(prefs && prefs.daltonien);
  const couleurReponse = (r, i) => {
    if (estVraiFaux) {
      const v = String(r).trim().toLowerCase() === 'vrai';
      if (daltonien) return v ? COLORBLIND_TF.vrai : COLORBLIND_TF.faux;
      return v ? '#5b8def' : '#ff5d73';
    }
    const palette = daltonien ? COLORBLIND_COLORS : ANSWER_COLORS;
    return palette[i % palette.length];
  };
  const avecManches = mode === 'solo' || mode === 'duel';
  const { manche, bonus } = avecManches ? roundInfo(index, questions.length) : { manche: 1, bonus: false };
  // Points encore en jeu si l'on répond maintenant (20 pts max, -1 pt/s, min 10,
  // x2 en manche bonus) : la barre change de couleur selon ces points.
  const basePoints = pointsFor(true, SECONDS_PER_QUESTION - time);
  const remainingPoints = pointsFor(true, SECONDS_PER_QUESTION - time, bonus);
  const couleurBarre = basePoints >= 17 ? '#2fd27a' : basePoints >= 13 ? '#FFD60A' : '#ff5d73';
  // En mode « tous thèmes », chaque question affiche son propre thème.
  const currentTheme = question.themeNom
    ? { nom: question.themeNom, couleur: question.themeCouleur, icone: question.themeIcone }
    : theme;
  const pAvecManches = useMemo(
    () => ({ ...p, manche, bonus, avecManches, currentTheme }),
    [p, manche, bonus, avecManches, currentTheme]
  );

  // --- Écran « passe l'appareil » (mode duel uniquement) ---
  if (phase === 'attente') {
    return <PassDevice joueur={players[p.joueurActuel]} couleurTheme={theme.couleur} onPret={p.pret} />;
  }

  return (
    <div className="partie">
      <Confetti confetti={p.confetti} />
      <TopBar p={pAvecManches} />

      {mode === 'duel' && (
        <div className="tour">
          Au tour de <strong>{players[p.joueurActuel]}</strong>
        </div>
      )}

      <TimerLine
        pct={pct}
        couleurBarre={couleurBarre}
        remainingPoints={remainingPoints}
        danger={time <= 3 && phase === 'question'}
      />

      <h1 className="question">{question.q}</h1>

      <Answers question={question} phase={phase} selection={p.selection} couleurReponse={couleurReponse} onRepondre={p.repondre} />

      <ReportButton estSignalee={p.estSignalee} onSignaler={p.reportQuestion} />

      <Feedback p={pAvecManches} />
    </div>
  );
}
