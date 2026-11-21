import { useEffect, useMemo, useState } from 'react';
import Icon, { Bars } from '@shared/ui/Icon.jsx';
import { LEVELS } from '@lib/scoring.js';
import { loadXp, themeLevel } from '@lib/xp.js';
import { SUBMISSION_LEVEL_THRESHOLD } from '@lib/submissions.js';
import { buildIndex, trouverSimilairesIndex, THRESHOLD_SIMILAR } from '@lib/similarity.js';
import SimilarityAlert from './components/SimilarityAlert.jsx';
import AnswersField from './components/AnswersField.jsx';

// Formulaire « Proposer une question ».
// À la validation, on compare la question à TOUTES les questions connues
// (base intégrée + fichier personal + propositions) et on avertit si des
// questions similaires existent déjà.
export default function QuestionForm({
  themes,
  allQuestions: allQuestions,
  onAdd: onAdd,
  onCancel: onCancel,
}) {
  const xp = loadXp();
  const levelOf = (id) => themeLevel(xp[id] || 0);
  const premierDebloque = themes.find((t) => levelOf(t.id) >= SUBMISSION_LEVEL_THRESHOLD);
  const [themeId, setThemeId] = useState(premierDebloque?.id || themes[0]?.id || '');
  const [niveau, setLevel] = useState('moyen');
  const [text, setText] = useState('');
  const [reponses, setReponses] = useState(['', '', '', '']);
  const [bonne, setBonne] = useState(null); // index dans le tableau `reponses`
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [avertissement, setAvertissement] = useState(null); // [{ question, score }]

  // Index de similarité pré-calculé UNE FOIS pour les 13 000+ questions connues :
  // recalculer la normalisation de tout le corpus à chaque frappe serait trop lent.
  const indexSim = useMemo(() => buildIndex(allQuestions), [allQuestions]);

  // Indicateur en direct pendant la saisie (le meilleur match current), avec debounce
  // de 300 ms : on ne recalcule pas la similarité à chaque touche.
  const [liveText, setLiveText] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setLiveText(text), 300);
    return () => clearTimeout(t);
  }, [text]);
  const topLive = useMemo(() => {
    if (liveText.trim().length < 8) return null;
    const res = trouverSimilairesIndex(liveText, indexSim, THRESHOLD_SIMILAR, 1);
    return res.length > 0 ? res[0] : null;
  }, [liveText, indexSim]);
  function setReponse(i, v) {
    setReponses((r) => r.map((x, j) => (j === i ? v : x)));
  }
  function validate() {
    if (!themeId) return 'Choisis un thème.';
    if (levelOf(themeId) < SUBMISSION_LEVEL_THRESHOLD) {
      return `Il faut être niveau ${SUBMISSION_LEVEL_THRESHOLD} dans ce thème pour proposer une question (tu es niv. ${levelOf(themeId)}). Joue pour gagner de l'XP !`;
    }
    if (text.trim().length < 5) return 'La question est trop courte (5 caractères min).';
    const rep = reponses.map((r) => r.trim()).filter((r) => r !== '');
    if (rep.length < 2) return 'Il faut au moins 2 réponses proposées.';
    if (bonne === null || reponses[bonne].trim() === '') return 'Coche la bonne réponse.';
    return null;
  }
  function soumettre() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    // Vérification des similarités À LA REQUÊTE (comme demandé), via l'index pré-calculé
    const sim = trouverSimilairesIndex(text, indexSim, THRESHOLD_SIMILAR, 5);
    if (sim.length > 0) {
      setAvertissement(sim);
      return;
    }
    add();
  }
  function add() {
    const rep = reponses.map((r) => r.trim());
    const filtrees = rep.filter((r) => r !== '');
    const bonneFiltre = filtrees.indexOf(rep[bonne]); // index dans la liste nettoyée
    onAdd({
      themeId,
      q: text.trim(),
      reponses: filtrees,
      bonne: bonneFiltre,
      niveau,
      info: info.trim() || undefined,
    });
  }
  return (
    <div className="formulaire">
      <header className="hero">
        <div
          className="logo"
          style={{
            fontSize: '1.7rem',
          }}
        >
          <span
            className="logo-marque"
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
            }}
          >
            <Icon nom="pencil" taille={24} />
          </span>
          Proposer une question
        </div>
        <p className="tagline">
          Elle sera vérifiée contre les questions existantes (doublons signalés), puis placée en
          attente de ta validation dans « Questions proposées ». Une fois validée, elle devient
          jouable et disparaît de la liste.
        </p>
      </header>

      <div className="champ">
        <label>Thème</label>
        <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
          {themes.map((t) => {
            const n = levelOf(t.id);
            const bloque = n < SUBMISSION_LEVEL_THRESHOLD;
            return (
              <option key={t.id} value={t.id} disabled={bloque}>
                {t.nom} — niv. {n}
                {bloque ? ` (niv. ${SUBMISSION_LEVEL_THRESHOLD} requis pour proposer)` : ''}
              </option>
            );
          })}
        </select>
        <p className="hint-sim">
          Proposer une question dans un thème demande le niveau {SUBMISSION_LEVEL_THRESHOLD} dans ce
          thème (XP gagnée en jouant, voir la barre sur chaque thème).
        </p>
      </div>

      <div className="champ">
        <label>Niveau de difficulté</label>
        <div className="niveaux">
          {LEVELS.map((n, i) => (
            <button
              key={n.id}
              type="button"
              className={niveau === n.id ? 'niveau actif' : 'niveau'}
              style={{
                '--couleur': n.couleur,
              }}
              onClick={() => setLevel(n.id)}
            >
              <Bars actives={i + 1} couleur={n.couleur} />
              <span>{n.nom}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="champ">
        <label>La question</label>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex : Quelle est la capitale du Canada ?"
        />
        {topLive && (
          <p className="hint-sim">
            <Icon nom="alert" taille={14} /> Similarité détectée : {Math.round(topLive.score * 100)}{' '}
            % avec « {topLive.question.q} » ({topLive.question.themeName})
          </p>
        )}
      </div>

      <AnswersField reponses={reponses} bonne={bonne} setReponse={setReponse} setBonne={setBonne} />

      <div className="champ">
        <label>Anecdote affichée après la réponse (optionnel)</label>
        <input
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          placeholder="Ex : Beaucoup répondent Toronto !"
        />
      </div>

      {error && (
        <p className="erreur">
          <Icon nom="alert" taille={15} /> {error}
        </p>
      )}

      {avertissement && (
        <SimilarityAlert
          avertissement={avertissement}
          onAdd={add}
          onCancel={() => setAvertissement(null)}
        />
      )}

      {!avertissement && (
        <div className="actions">
          <button className="btn-principal" onClick={soumettre}>
            <Icon nom="check" taille={18} /> Vérifier et ajouter
          </button>
          <button className="btn-secondaire" onClick={onCancel}>
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
