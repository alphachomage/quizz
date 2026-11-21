import Icon from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';

// Tuto de bienvenue : ouvert UNE SEULE FOIS par compte (première connexion).
// Court et concis : principe du jeu, points, série (streak), modes de jeu.

export default function Tutorial({ onFermer, estInvite }) {
  return (
    <Modal title="Bienvenue sur VoltQuiz" onFermer={onFermer} classe="tuto">
      <div className="modal-titre">
        <h2><Icon nom="bolt" taille={22} /> Bienvenue sur VoltQuiz</h2>
        <button className="btn-suppr" onClick={onFermer} title="Fermer">
          <Icon nom="x" taille={18} />
        </button>
      </div>

      <ul className="tuto-liste">
        <li>
          <span className="tuto-icone"><Icon nom="timer" taille={20} /></span>
          <div>
            <strong>Le principe :</strong> réponds le plus vite possible. Tu as{' '}
            <strong>10 secondes</strong> par question, et la suivante démarre toute seule.
          </div>
        </li>
        <li>
          <span className="tuto-icone"><Icon nom="star" taille={20} /></span>
          <div>
            <strong>Les points :</strong> bonne réponse = jusqu'à <strong>20 points</strong>{' '}
            (−1 point par seconde écoulée, minimum 10). Faux ou temps écoulé = <strong>0 point</strong>.
            La dernière manche rapporte des points <strong>×2</strong>.
          </div>
        </li>
        <li>
          <span className="tuto-icone"><Icon nom="flame" taille={20} /></span>
          <div>
            <strong>La série (streak) :</strong> chaque bonne réponse enchaînée rapporte un bonus
            croissant : <strong>+1, +2, +3… jusqu'à +10 points</strong>.
          </div>
        </li>
        <li>
          <span className="tuto-icone"><Icon nom="swords" taille={20} /></span>
          <div>
            <strong>Les modes de jeu :</strong>
            <ul>
              <li><strong>Solo</strong> — 10 questions dans un thème, niveau facile / moyen / dur.</li>
              <li><strong>Duel en ligne</strong> — affronter d'autres joueurs à distance. <em>À venir.</em></li>
              <li><strong>Survie</strong> — une seule vie, la première erreur termine la partie.</li>
              <li><strong>Quizz du jour</strong> — 10 questions identiques pour tout le monde, une seule tentative par jour. Ta <strong>série de jours</strong> (éclair ×N) : à partir de <strong>3 jours</strong>, les points du quizz du jour sont <strong>×1,5</strong>.</li>
            </ul>
          </div>
        </li>
        {estInvite && (
          <li>
            <span className="tuto-icone"><Icon nom="user" taille={20} /></span>
            <div>
              <strong>Tu joues en invité</strong> (pseudo automatique) : aucune XP de compte ni de thème,
              pas de badges, pas de titres et pas de classement ne sont enregistrés.
              <strong> Crée un compte</strong> pour tout conserver entre tes parties.
            </div>
          </li>
        )}
      </ul>

      <button className="btn-principal tuto-bouton" onClick={onFermer}>
        C'est parti
      </button>
    </Modal>
  );
}
