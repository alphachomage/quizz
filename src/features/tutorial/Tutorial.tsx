import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';

// Tuto de bienvenue : ouvert UNE SEULE FOIS par compte (première connexion).
// Court et concis : principe du jeu, points, série (streak), modes de jeu.

interface TutorialProps {
  onClose: () => void;
  isGuest: boolean;
}

export default function Tutorial({ onClose, isGuest }: TutorialProps): ReactElement {
  return (
    <Modal title="Bienvenue sur VQuizz" onClose={onClose} classe="tuto">
      <div className="modal-titre">
        <h2>
          <Icon nom="bolt" taille={22} /> Bienvenue sur VQuizz
        </h2>
        <button className="btn-suppr" onClick={onClose} title="Fermer">
          <Icon nom="x" taille={18} />
        </button>
      </div>

      <ul className="tuto-liste">
        <li>
          <span className="tuto-icone">
            <Icon nom="timer" taille={20} />
          </span>
          <div>
            <strong>Le principe :</strong> réponds le plus vite possible. Tu as{' '}
            <strong>10 secondes</strong> par question (<strong>13 s</strong> si la question est de
            niveau <strong>dur</strong>), et la suivante démarre toute seule.
          </div>
        </li>
        <li>
          <span className="tuto-icone">
            <Icon nom="star" taille={20} />
          </span>
          <div>
            <strong>Les points :</strong> bonne réponse = jusqu'à <strong>20 points</strong> (−1
            point par seconde écoulée, minimum 10). Faux ou temps écoulé = <strong>0 point</strong>.
            La dernière manche rapporte des points <strong>×2</strong>.
          </div>
        </li>
        <li>
          <span className="tuto-icone">
            <Icon nom="flame" taille={20} />
          </span>
          <div>
            <strong>La série (streak) :</strong> chaque bonne réponse enchaînée rapporte un bonus
            croissant : <strong>+1, +2, +3… jusqu'à +10 points</strong>.
          </div>
        </li>
        <li>
          <span className="tuto-icone">
            <Icon nom="trophy" taille={20} />
          </span>
          <div>
            <strong>Badges & titres :</strong> en jouant, tu débloques des <strong>badges</strong>{' '}
            (parties jouées, records, séries de jours…) et des <strong>titres</strong> à afficher
            sur ton profil. En Rogue Quizz, des badges à <strong>10 / 25 / 50 / 75</strong>{' '}
            questions d'affilée, et le titre <strong>« Rogue accompli »</strong> à{' '}
            <strong>100 questions</strong> (run parfaite).
          </div>
        </li>
        <li>
          <span className="tuto-icone">
            <Icon nom="swords" taille={20} />
          </span>
          <div>
            <strong>Les modes de jeu :</strong>
            <ul>
              <li>
                <strong>Solo</strong> — 10 questions dans un thème, niveau facile / moyen / dur.
              </li>
              <li>
                <strong>Duel en ligne</strong> — affronter d'autres joueurs à distance.{' '}
                <em>À venir.</em>
              </li>
              <li>
                <strong>Rogue Quizz</strong> — tous les thèmes, jusqu'à 100 questions. Tu as{' '}
                <strong>3 vies</strong> (⚡) au départ : chaque erreur en coûte une, à 0 la run
                s'arrête (des reliques peuvent t'en redonner). La difficulté monte tous les 10 questions et
                tu choisis <strong>1 relique parmi 3</strong> au départ puis à chaque palier
                (60 reliques au total, effets cumulables).
              </li>
              <li>
                <strong>Quizz du jour</strong> — 10 questions identiques pour tout le monde, une
                seule tentative par jour. Ta <strong>série de jours</strong> (éclair ×N) : à partir
                de <strong>3 jours</strong>, les points du quizz du jour sont <strong>×1,5</strong>.
              </li>
            </ul>
          </div>
        </li>
        {isGuest && (
          <li>
            <span className="tuto-icone">
              <Icon nom="user" taille={20} />
            </span>
            <div>
              <strong>Tu joues en invité</strong> (pseudo automatique) : aucune XP de compte ni de
              thème, pas de badges, pas de titres et pas de classement ne sont enregistrés.
              <strong> Crée un compte</strong> pour tout conserver entre tes parties.
            </div>
          </li>
        )}
      </ul>

      <button className="btn-principal tuto-bouton" onClick={onClose}>
        C'est parti
      </button>
    </Modal>
  );
}
