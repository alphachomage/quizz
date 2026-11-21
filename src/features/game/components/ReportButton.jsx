// SignalerBouton.jsx — pouce rouge : signaler la question courante (compteur admin,
// jamais affiché côté joueur).
import Icon from '@shared/ui/Icon.jsx';

export default function ReportButton({ estSignalee, onSignaler }) {
  return (
    <div className="signaler">
      <button
        className={estSignalee ? 'btn-signaler actif' : 'btn-signaler'}
        onClick={onSignaler}
        disabled={estSignalee}
        title="Signaler cette question (réponse potentiellement erronée, mal écrite ou difficile à comprendre)"
      >
        <Icon nom="thumbsdown" taille={15} />
        {estSignalee ? 'Question signalée — merci !' : 'Signaler cette question'}
      </button>
    </div>
  );
}
