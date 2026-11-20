// SignalerBouton.jsx — pouce rouge : signaler la question courante (compteur admin,
// jamais affiché côté joueur).
import Icone from '../../../components/Icone.jsx';

export default function SignalerBouton({ estSignalee, onSignaler }) {
  return (
    <div className="signaler">
      <button
        className={estSignalee ? 'btn-signaler actif' : 'btn-signaler'}
        onClick={onSignaler}
        disabled={estSignalee}
        title="Signaler cette question (réponse potentiellement erronée, mal écrite ou difficile à comprendre)"
      >
        <Icone nom="thumbsdown" taille={15} />
        {estSignalee ? 'Question signalée — merci !' : 'Signaler cette question'}
      </button>
    </div>
  );
}
