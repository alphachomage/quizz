// SignalerBouton.jsx — pouce rouge : signaler la question courante (compteur admin,
// jamais affiché côté joueur).
import Icon from '@shared/ui/Icon.jsx';
export default function ReportButton({ isReported: isReported, onSignaler }) {
  return (
    <div className="signaler">
      <button
        className={isReported ? 'btn-signaler actif' : 'btn-signaler'}
        onClick={onSignaler}
        disabled={isReported}
        title="Signaler cette question (réponse potentiellement erronée, mal écrite ou difficile à comprendre)"
      >
        <Icon nom="thumbsdown" taille={15} />
        {isReported ? 'Question signalée — merci !' : 'Signaler cette question'}
      </button>
    </div>
  );
}
