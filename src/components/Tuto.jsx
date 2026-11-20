import Icone from './Icone.jsx';

// Tuto de bienvenue : ouvert UNE SEULE FOIS par compte (première connexion).
// Court et concis : principe du jeu, points, série (streak), modes de jeu.
export default function Tuto({ onFermer }) {
  return (
    <div className="modal-overlay" onClick={onFermer}>
      <div className="modal tuto" onClick={(e) => e.stopPropagation()}>
        <div className="modal-titre">
          <h2><Icone nom="bolt" taille={22} /> Bienvenue sur VoltQuiz</h2>
          <button className="btn-suppr" onClick={onFermer} title="Fermer">
            <Icone nom="x" taille={18} />
          </button>
        </div>

        <ul className="tuto-liste">
          <li>
            <span className="tuto-icone"><Icone nom="timer" taille={20} /></span>
            <div>
              <strong>Le principe :</strong> réponds le plus vite possible. Tu as{' '}
              <strong>10 secondes</strong> par question, et la suivante démarre toute seule.
            </div>
          </li>
          <li>
            <span className="tuto-icone"><Icone nom="star" taille={20} /></span>
            <div>
              <strong>Les points :</strong> bonne réponse = jusqu'à <strong>20 points</strong>{' '}
              (−1 point par seconde écoulée, minimum 10). Faux ou temps écoulé = <strong>0 point</strong>.
              La dernière manche rapporte des points <strong>×2</strong>.
            </div>
          </li>
          <li>
            <span className="tuto-icone"><Icone nom="flame" taille={20} /></span>
            <div>
              <strong>La série (streak) :</strong> chaque bonne réponse enchaînée rapporte un bonus
              croissant : <strong>+1, +2, +3… jusqu'à +10 points</strong>.
            </div>
          </li>
          <li>
            <span className="tuto-icone"><Icone nom="swords" taille={20} /></span>
            <div>
              <strong>Les modes de jeu :</strong>
              <ul>
                <li><strong>Solo</strong> — 10 questions dans un thème, niveau facile / moyen / dur.</li>
                <li><strong>Duel 1v1</strong> — 2 joueurs sur le même appareil, à tour de rôle.</li>
                <li><strong>Survie</strong> — une seule vie, la première erreur termine la partie.</li>
                <li><strong>Quizz du jour</strong> — 10 questions identiques pour tout le monde, une seule tentative par jour.</li>
              </ul>
            </div>
          </li>
        </ul>

        <button className="btn-principal tuto-bouton" onClick={onFermer}>
          C'est parti
        </button>
      </div>
    </div>
  );
}
