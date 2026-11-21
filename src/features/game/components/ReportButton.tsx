// SignalerBouton.tsx — pouce rouge : signaler la question courante (compteur admin,
// jamais affiché côté joueur).
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';

/** Props : déjà signalée ? + callback de signalement. */
interface ReportButtonProps {
  isReported: boolean;
  onSignaler: () => void;
}

export default function ReportButton({ isReported, onSignaler }: ReportButtonProps): ReactElement {
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
