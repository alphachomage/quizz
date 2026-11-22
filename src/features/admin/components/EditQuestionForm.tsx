// EditQuestionForm.tsx — formulaire admin d'édition d'une question du corpus.
// Pré-rempli avec la question d'origine ; à la validation, pose un override
// { action: 'modifier', question } (voir src/lib/overrides.ts) : le fichier source
// n'est jamais modifié, la question remplacée prend effet au rechargement.
import { useState } from 'react';
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { LEVELS } from '@lib/scoring.js';
import type { LevelId, Question } from '@lib/types.js';

interface EditQuestionFormProps {
  question: Question;
  themeName?: string;
  onSave: (q: Question) => void;
  onCancel: () => void;
}

export default function EditQuestionForm({
  question,
  themeName,
  onSave,
  onCancel,
}: EditQuestionFormProps): ReactElement {
  const [text, setText] = useState(question.q);
  const [reponses, setReponses] = useState<string[]>([
    ...question.reponses,
    ...Array.from({ length: Math.max(0, 4 - question.reponses.length) }, () => ''),
  ]);
  const [bonne, setBonne] = useState<number>(question.bonne);
  const [niveau, setNiveau] = useState<LevelId>(question.niveau);
  const [info, setInfo] = useState(question.info || '');
  const [erreur, setErreur] = useState('');

  function setReponse(i: number, v: string): void {
    setReponses((r) => r.map((x, j) => (j === i ? v : x)));
  }
  function valider(): void {
    if (text.trim().length < 5) {
      setErreur('La question est trop courte (5 caractères min).');
      return;
    }
    const rep = reponses.map((r) => r.trim());
    const filtrees = rep.filter((r) => r !== '');
    if (filtrees.length < 2) {
      setErreur('Il faut au moins 2 réponses proposées.');
      return;
    }
    if (rep[bonne].trim() === '') {
      setErreur('La bonne réponse cochée est vide.');
      return;
    }
    const bonneFiltre = filtrees.indexOf(rep[bonne]);
    const q: Question = {
      q: text.trim(),
      reponses: filtrees,
      bonne: bonneFiltre,
      niveau,
    };
    if (info.trim()) q.info = info.trim();
    onSave(q);
  }

  return (
    <div className="formulaire" style={{ marginTop: 16 }}>
      <h3 className="titre-section">
        <Icon nom="pencil" taille={18} /> Modifier la question
        {themeName ? ` (${themeName})` : ''}
      </h3>
      <p className="vide">
        Le fichier source n'est pas modifié : un override est posé, la question remplacée prend
        effet au rechargement de l'app.
      </p>

      <div className="champ">
        <label>La question</label>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      <div className="champ">
        <label>Réponses (coche la bonne)</label>
        {reponses.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <input
              type="radio"
              name="bonne"
              checked={bonne === i}
              onChange={() => setBonne(i)}
              aria-label={`Bonne réponse ${i + 1}`}
            />
            <input
              value={r}
              onChange={(e) => setReponse(i, e.target.value)}
              placeholder={`Réponse ${i + 1}`}
              style={{ flex: 1 }}
            />
          </div>
        ))}
      </div>

      <div className="champ">
        <label>Niveau</label>
        <select value={niveau} onChange={(e) => setNiveau(e.target.value as LevelId)}>
          {LEVELS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="champ">
        <label>Anecdote (optionnel)</label>
        <input value={info} onChange={(e) => setInfo(e.target.value)} placeholder="Anecdote…" />
      </div>

      {erreur && (
        <p className="erreur">
          <Icon nom="alert" taille={15} /> {erreur}
        </p>
      )}

      <div className="actions">
        <button className="btn-principal" onClick={valider}>
          <Icon nom="check" taille={18} /> Enregistrer la modification
        </button>
        <button className="btn-secondaire" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  );
}
