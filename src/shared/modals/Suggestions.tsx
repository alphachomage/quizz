import { useState } from 'react';
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';
import { addSuggestion } from '@lib/suggestions.js';

// Fenêtre "Suggestions" côté joueur : une remontée (idée, bug, amélioration)
// part dans localStorage (voltquiz_suggestions) et n'est visible QUE dans la
// vue admin (?admin=1). Le joueur ne voit jamais la liste, juste un merci.

interface SuggestionsProps {
  pseudo: string;
  onClose: () => void;
}

export default function Suggestions({ pseudo, onClose }: SuggestionsProps): ReactElement {
  const [text, setText] = useState('');
  const [envoyee, setEnvoyee] = useState(false);
  function send(): void {
    const t = text.trim();
    if (!t) return;
    addSuggestion(t, pseudo);
    setText('');
    setEnvoyee(true);
  }
  return (
    <Modal title="Une suggestion ?" onClose={onClose}>
      <div className="modal-titre">
        <h2>
          <Icon nom="pencil" taille={22} /> Une suggestion ?
        </h2>
        <button className="btn-suppr" onClick={onClose} title="Fermer">
          <Icon nom="x" taille={18} />
        </button>
      </div>

      {envoyee ? (
        <div
          className="vide"
          style={{
            textAlign: 'center',
            padding: '18px 6px',
          }}
        >
          <p
            style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            <Icon nom="check" taille={18} /> Suggestion envoyée — merci !
          </p>
          <p>Ta remontée a bien été reçue. Elle n'est visible que par l'administrateur.</p>
          <button className="btn-principal" onClick={onClose}>
            Fermer
          </button>
        </div>
      ) : (
        <>
          <p className="vide">
            Une idée d'amélioration, un bug rencontré, une envie ? Écris-nous, ça nous intéresse. Ta
            suggestion part directement à l'administrateur.
          </p>
          <textarea
            className="champ-suggestion"
            value={text}
            maxLength={2000}
            rows={5}
            placeholder="Écris ta suggestion ici (idée de thème, de mode, bug, amélioration...)"
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-principal" disabled={!text.trim()} onClick={send}>
            <Icon nom="pencil" taille={17} /> Envoyer ma suggestion
          </button>
        </>
      )}
    </Modal>
  );
}
