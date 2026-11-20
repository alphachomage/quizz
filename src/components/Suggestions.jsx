import { useState } from 'react';

import Icone from './Icone.jsx';

import { ajouterSuggestion } from '../lib/logique.js';

// Fenêtre "Suggestions" côté joueur : une remontée (idée, bug, amélioration)
// part dans localStorage (voltquiz_suggestions) et n'est visible QUE dans la
// vue admin (?admin=1). Le joueur ne voit jamais la liste, juste un merci.

export default function Suggestions({ pseudo, onFermer }) {
  const [texte, setTexte] = useState('');
  const [envoyee, setEnvoyee] = useState(false);

  function envoyer() {
    const t = texte.trim();
    if (!t) return;
    ajouterSuggestion(t, pseudo);
    setTexte('');
    setEnvoyee(true);
  }

  return (
    <div className="modal-overlay" onClick={onFermer}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-titre">
          <h2><Icone nom="pencil" taille={22} /> Une suggestion ?</h2>
          <button className="btn-suppr" onClick={onFermer} title="Fermer">
            <Icone nom="x" taille={18} />
          </button>
        </div>

        {envoyee ? (
          <div className="vide" style={{ textAlign: 'center', padding: '18px 6px' }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>
              <Icone nom="check" taille={18} /> Suggestion envoyée — merci !
            </p>
            <p>Ta remontée a bien été reçue. Elle n'est visible que par l'administrateur.</p>
            <button className="btn-principal" onClick={onFermer}>Fermer</button>
          </div>
        ) : (
          <>
            <p className="vide">
              Une idée d'amélioration, un bug rencontré, une envie ? Écris-nous, ça nous intéresse.
              Ta suggestion part directement à l'administrateur.
            </p>
            <textarea
              className="champ-suggestion"
              value={texte}
              maxLength={2000}
              rows={5}
              placeholder="Écris ta suggestion ici (idée de thème, de mode, bug, amélioration...)"
              onChange={(e) => setTexte(e.target.value)}
            />
            <button className="btn-principal" disabled={!texte.trim()} onClick={envoyer}>
              <Icone nom="pencil" taille={17} /> Envoyer ma suggestion
            </button>
          </>
        )}
      </div>
    </div>
  );
}
