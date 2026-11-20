import { useEffect, useMemo, useState } from 'react';

import Icone from './Icone.jsx';

import {
  melanger,
  TEMPS_PAR_QUESTION,
  QUESTIONS_SOLO,
  QUESTIONS_DUEL,
  QUESTIONS_SURVIE_MAX,
  pointsPour,
  infoManche,
  nomNiveau,
  couleurNiveau,
  questionsQuotidien,
  dateAujourdhui,
  chargerSignales,
  ajouterSignalement,
  cleSerie,
  sauverSerie,
  poolSansSeriePrecedente,
  tirerSerie,
} from '../lib/logique.js';

import { jouerSon, vibrer, sonPourStreak, demarrerMusique, arreterMusique } from '../lib/sons.js';

// Les 4 couleurs des réponses, comme dans QuizUp.
const COULEURS_REPONSES = ['#5b8def', '#ff5d73', '#ffb020', '#2fd27a'];

// Mode daltonien : palette Okabe-Ito (distinguable par toutes les formes de daltonisme)
// + lettres A/B/C/D sur chaque réponse pour ne pas dépendre que de la couleur.
const COULEURS_DALTONIEN = ['#0072B2', '#E69F00', '#009E73', '#D55E00'];
const VF_DALTONIEN = { vrai: '#0072B2', faux: '#D55E00' };
const LETTRES = ['A', 'B', 'C', 'D'];

const COULEURS_CONFETTIS = ['#8b5cf6', '#f472b6', '#5b8def', '#2fd27a', '#ffb020', '#ffffff'];

// Mélange l'ordre des réponses d'une question ET recalcule l'index de la bonne
// réponse : la position de la bonne réponse change à chaque partie.
function avecReponsesAleatoires(q) {
  const ordre = melanger(q.reponses.map((_, i) => i));
  return { ...q, reponses: ordre.map((i) => q.reponses[i]), bonne: ordre.indexOf(q.bonne) };
}

// Ajoute à chaque question son thème d'origine (utile en mode "tous thèmes").
function taguerTheme(q, t) {
  return { ...q, themeId: t.id, themeNom: t.nom, themeCouleur: t.couleur, themeIcone: t.icone };
}

// Écran de jeu : enchaînement des questions, minuteur, points, sons/vibrations/confettis.
// ALEATOIRE : à chaque partie, chaque joueur reçoit son propre tirage au hasard
// (solo : 10 questions du niveau choisi ; duel : 6 questions par joueur ;
//  survie : tous thèmes mélangés, 1 vie ; quizz du jour : 10 questions identiques
//  pour tout le monde, tirées au hasard mais "seedées" par la date du jour).
export default function Partie({ config, prefs, onTerminer }) {
  const { mode, niveau, theme, joueurs } = config;
  const nbJoueurs = mode === 'duel' ? 2 : 1;

  const questionsParJoueur = useMemo(() => {
    let pool;
    let nb;
    if (mode === 'solo') {
      pool = theme.questions.filter((q) => q.niveau === niveau);
      nb = QUESTIONS_SOLO;
    } else if (mode === 'duel') {
      pool = theme.questions;
      nb = QUESTIONS_DUEL;
    } else if (mode === 'survie') {
      // tous les thèmes ET tous les niveaux (facile/moyen/dur) mélangés
      pool = (config.tousThemes || []).flatMap((t) => t.questions.map((q) => taguerTheme(q, t)));
      nb = Math.min(QUESTIONS_SURVIE_MAX, pool.length);
    } else {
      // quizz du jour : tirage déterministe (même questions pour tout le monde aujourd'hui)
      pool = questionsQuotidien(config.tousThemes || [], niveau || dateAujourdhui());
      nb = pool.length;
    }
    // Anti-répétition : on retire du tirage les questions de la DERNIÈRE série jouée
    // (clé mode:niveau:thème), pour que "Rejouer" ne retombe jamais sur la même série.
    if (mode !== 'quotidien') {
      pool = poolSansSeriePrecedente(pool, cleSerie(mode, niveau, theme.id), nb);
    }
    // 1) on mélange les réponses de chaque question, 2) on tire l'ordre des questions au hasard
    // avec diversité : max 2 questions du même sujet (ex. pas 3x One Piece) et, en mode
    // multi-thèmes (survie), un plafond par thème (pas 5x Géographie dans la même série)
    // (sauf quizz du jour : tirage seedé + diversifié dans questionsQuotidien)
    const poolAleatoire = mode === 'quotidien' ? pool : pool.map(avecReponsesAleatoires);
    const nbThemes = (config.tousThemes || []).length || 1;
    const maxParTheme = mode === 'survie' ? Math.max(2, Math.ceil(nb / nbThemes) + 1) : 0;
    return Array.from({ length: nbJoueurs }, () =>
      mode === 'quotidien' ? melanger(poolAleatoire).slice(0, nb) : tirerSerie(poolAleatoire, nb, 2, maxParTheme)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [index, setIndex] = useState(0); // question courante (0..n-1)
  const [joueurActuel, setJoueurActuel] = useState(0);
  const [phase, setPhase] = useState(mode === 'duel' ? 'attente' : 'question'); // 'attente' | 'question' | 'reponse'
  const [temps, setTemps] = useState(TEMPS_PAR_QUESTION);
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

  // Le minuteur tourne uniquement pendant la phase 'question'.
  useEffect(() => {
    if (phase !== 'question') return undefined;
    const intervalle = setInterval(() => setTemps((t) => Math.max(0, t - 0.1)), 100);
    return () => clearInterval(intervalle);
  }, [phase, index, joueurActuel]);

  // Ambiance sonore de la partie (nappe douce), selon le réglage "Musique de fond".
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

  // Temps écoulé = réponse ratée.
  useEffect(() => {
    if (phase === 'question' && temps <= 0) repondre(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temps, phase]);

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
    const gain = pointsPour(correct, secondesEcoulees, bonus) + bonusStreak;
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
    // garantir que le prochain "Rejouer" tire des questions différentes.
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

  // --- Écran « passe l'appareil » (mode duel uniquement) ---
  if (phase === 'attente') {
    return (
      <div className="ecran-centre">
        <div className="passe-appareil">
          <div className="gros-icone"><Icone nom="device" taille={56} /></div>
          <h2>Passe l'appareil à</h2>
          <div className="nom-joueur" style={{ background: `linear-gradient(135deg, ${theme.couleur}, ${theme.couleur}b8)` }}>
            {joueurs[joueurActuel]}
          </div>
          <p className="indice">Les autres ne doivent pas regarder l'écran.</p>
          <button className="btn-principal" onClick={pret}>
            Je suis prêt, c'est parti !
          </button>
        </div>
      </div>
    );
  }

  const pct = (temps / TEMPS_PAR_QUESTION) * 100;
  // Question vrai/faux : "Vrai" toujours en bleu, "Faux" toujours en rouge,
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
  // x2 en manche bonus) : la barre change de couleur selon ces points et un
  // compteur affiche les points restants en direct.
  const pointsBase = pointsPour(true, TEMPS_PAR_QUESTION - temps);
  const pointsRestants = pointsPour(true, TEMPS_PAR_QUESTION - temps, bonus);
  const couleurBarre = pointsBase >= 17 ? '#2fd27a' : pointsBase >= 13 ? '#FFD60A' : '#ff5d73';
  // En mode "tous thèmes", chaque question affiche son propre thème.
  const themeCourant = question.themeNom
    ? { nom: question.themeNom, couleur: question.themeCouleur, icone: question.themeIcone }
    : theme;

  return (
    <div className="partie">
      {confettis.length > 0 && (
        <div className="confettis" aria-hidden="true">
          {confettis.map((c) => (
            <span
              key={c.id}
              className="confetti"
              style={{
                left: `${c.left}%`,
                width: `${c.taille}px`,
                height: `${c.taille * 0.6}px`,
                background: c.couleur,
                animationDelay: `${c.delay}s`,
                '--rot': `${c.rotation}deg`,
              }}
            />
          ))}
        </div>
      )}

      <div className="barre-haut">
        <span
          className="chip theme-chip"
          style={{ background: themeCourant.couleur, '--couleur': themeCourant.couleur }}
        >
          <Icone nom={themeCourant.icone || theme.icone} taille={15} /> {themeCourant.nom}
        </span>
        {mode === 'solo' && (
          <span className="chip niveau-chip">
            <i style={{ background: couleurNiveau(niveau) }} /> {nomNiveau(niveau)}
          </span>
        )}
        {mode === 'survie' && (
          <span className="chip niveau-chip">
            <i style={{ background: '#a78bfa' }} /> Tous niveaux
          </span>
        )}
        {mode === 'survie' && (
          <span className="chip manche survie-chip"><Icone nom="skull" taille={13} /> Survie — 1 vie</span>
        )}
        {mode === 'quotidien' && (
          <span className="chip manche bonus"><Icone nom="calendar" taille={13} /> Quizz du {niveau}</span>
        )}
        {avecManches && (
          <span className={bonus ? 'chip manche bonus' : 'chip manche'}>
            Manche {manche}/3{bonus ? ' · BONUS ×2' : ''}
          </span>
        )}
        <span className="chip">
          Question {Math.min(index + 1, questions.length)}{mode === 'survie' ? '' : `/${questions.length}`}
        </span>
        {mode === 'duel'
          ? joueurs.slice(0, nbJoueurs).map((j, i) => (
              <span key={j} className={i === joueurActuel ? 'chip score actif' : 'chip score'}>
                {j} : {scores[i]}
              </span>
            ))
          : <span className="chip score"><Icone nom="star" taille={14} /> {scores[0]}</span>}
        {streaks[joueurActuel] >= 2 && (
          <span className="chip streak-chip">
            <Icone nom="flame" taille={13} /> Série ×{streaks[joueurActuel]} · +{Math.min(10, streaks[joueurActuel] - 1)}
          </span>
        )}
      </div>

      {mode === 'duel' && (
        <div className="tour">
          Au tour de <strong>{joueurs[joueurActuel]}</strong>
        </div>
      )}

      <div className={temps <= 3 && phase === 'question' ? 'minuteur-ligne danger' : 'minuteur-ligne'}>
        <div className="minuteur">
          <div
            className="minuteur-rempli"
            style={{
              width: `${pct}%`,
              background: couleurBarre,
            }}
          />
        </div>
        <span className="minuteur-pts">{pointsRestants} pts</span>
      </div>

      <h1 className="question">{question.q}</h1>

      <div className="reponses">
        {question.reponses.map((r, i) => {
          let classe = 'reponse';
          if (phase === 'reponse') {
            if (i === question.bonne) classe += ' bonne';
            else if (i === selection) classe += ' mauvaise';
            else classe += ' estompee';
          }
          return (
            <button
              key={i}
              className={classe}
              style={{ '--couleur': couleurReponse(r, i) }}
              disabled={phase !== 'question'}
              onClick={() => repondre(i)}
            >
              <span className="lettre">{String.fromCharCode(65 + i)}</span>
              <span className="texte">{r}</span>
              {phase === 'reponse' && i === question.bonne && <Icone nom="check" taille={20} className="coche" />}
              {phase === 'reponse' && i === selection && i !== question.bonne && <Icone nom="x" taille={20} className="coche" />}
            </button>
          );
        })}
      </div>

      <div className="signaler">
        <button
          className={estSignalee ? 'btn-signaler actif' : 'btn-signaler'}
          onClick={signalerQuestion}
          disabled={estSignalee}
          title="Signaler cette question (réponse potentiellement erronée, mal écrite ou difficile à comprendre)"
        >
          <Icone nom="thumbsdown" taille={15} />
          {estSignalee ? 'Question signalée — merci !' : 'Signaler cette question'}
        </button>
      </div>

      {phase === 'reponse' && (
        <div className="feedback">
          {selection !== null && selection === question.bonne ? (
            <div className="gain">+{dernierGain} pts <Icone nom="bolt" taille={22} className="gain-icone" /></div>
          ) : (
            <div className="rate">
              {mode === 'survie' ? 'Raté — la survie s\'arrête là !' : (
                <>Raté. La bonne réponse était : <strong>{question.reponses[question.bonne]}</strong></>
              )}
            </div>
          )}
          {question.info && <p className="info">{question.info}</p>}
          <p className="suite-auto">Question suivante dans un instant…</p>
        </div>
      )}

      {phase === 'reponse' && selection !== null && selection === question.bonne && (
        <div className="gain-centre" aria-hidden="true">
          <span>+{dernierGain}</span>
          <small>points</small>
          {dernierBonus > 0 && (
            <small className="bonus-streak">
              <Icone nom="flame" taille={16} /> dont +{dernierBonus} bonus série ×{streaks[joueurActuel]}
            </small>
          )}
        </div>
      )}
    </div>
  );
}
