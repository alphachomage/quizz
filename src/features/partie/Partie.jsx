// features/partie/Partie.jsx — écran de jeu, NE FAIT QUE RENDRE (~120 L).
// Toute la logique est dans usePartie.js (testable hors React).
import { useMemo } from 'react';

import { infoManche, pointsPour, TEMPS_PAR_QUESTION } from '@lib/scoring.js';

import { usePartie } from './usePartie.js';
import { COULEURS_DALTONIEN, COULEURS_REPONSES, VF_DALTONIEN } from './constantes.js';
import BarreHaut from './composants/BarreHaut.jsx';
import Confettis from './composants/Confettis.jsx';
import Feedback from './composants/Feedback.jsx';
import MinuteurLigne from './composants/MinuteurLigne.jsx';
import PasseAppareil from './composants/PasseAppareil.jsx';
import Reponses from './composants/Reponses.jsx';
import SignalerBouton from './composants/SignalerBouton.jsx';

export default function Partie({ config, prefs, onTerminer }) {
  const p = usePartie({ config, prefs, onTerminer });
  const { mode, niveau, theme, joueurs, question, phase, index, questions, temps } = p;

  // --- Valeurs d'affichage dérivées ---
  const pct = (temps / TEMPS_PAR_QUESTION) * 100;
  // Question vrai/faux : « Vrai » toujours en bleu, « Faux » toujours en rouge,
  // quelle que soit la position après le mélange aléatoire.
  const estVraiFaux = question.reponses.length === 2 &&
    question.reponses.every((r) => ['vrai', 'faux'].includes(String(r).trim().toLowerCase()));
  const daltonien = !!(prefs && prefs.daltonien);
  const couleurReponse = (r, i) => {
    if (estVraiFaux) {
      const v = String(r).trim().toLowerCase() === 'vrai';
      if (daltonien) return v ? VF_DALTONIEN.vrai : VF_DALTONIEN.faux;
      return v ? '#5b8def' : '#ff5d73';
    }
    const palette = daltonien ? COULEURS_DALTONIEN : COULEURS_REPONSES;
    return palette[i % palette.length];
  };
  const avecManches = mode === 'solo' || mode === 'duel';
  const { manche, bonus } = avecManches ? infoManche(index, questions.length) : { manche: 1, bonus: false };
  // Points encore en jeu si l'on répond maintenant (20 pts max, -1 pt/s, min 10,
  // x2 en manche bonus) : la barre change de couleur selon ces points.
  const pointsBase = pointsPour(true, TEMPS_PAR_QUESTION - temps);
  const pointsRestants = pointsPour(true, TEMPS_PAR_QUESTION - temps, bonus);
  const couleurBarre = pointsBase >= 17 ? '#2fd27a' : pointsBase >= 13 ? '#FFD60A' : '#ff5d73';
  // En mode « tous thèmes », chaque question affiche son propre thème.
  const themeCourant = question.themeNom
    ? { nom: question.themeNom, couleur: question.themeCouleur, icone: question.themeIcone }
    : theme;
  const pAvecManches = useMemo(
    () => ({ ...p, manche, bonus, avecManches, themeCourant }),
    [p, manche, bonus, avecManches, themeCourant]
  );

  // --- Écran « passe l'appareil » (mode duel uniquement) ---
  if (phase === 'attente') {
    return <PasseAppareil joueur={joueurs[p.joueurActuel]} couleurTheme={theme.couleur} onPret={p.pret} />;
  }

  return (
    <div className="partie">
      <Confettis confettis={p.confettis} />
      <BarreHaut p={pAvecManches} />

      {mode === 'duel' && (
        <div className="tour">
          Au tour de <strong>{joueurs[p.joueurActuel]}</strong>
        </div>
      )}

      <MinuteurLigne
        pct={pct}
        couleurBarre={couleurBarre}
        pointsRestants={pointsRestants}
        danger={temps <= 3 && phase === 'question'}
      />

      <h1 className="question">{question.q}</h1>

      <Reponses question={question} phase={phase} selection={p.selection} couleurReponse={couleurReponse} onRepondre={p.repondre} />

      <SignalerBouton estSignalee={p.estSignalee} onSignaler={p.signalerQuestion} />

      <Feedback p={pAvecManches} />
    </div>
  );
}
