// ModeConfirmModal.tsx — popin des modes sans choix de thème (Rogue Quizz, Quizz du jour) :
// rappel des règles du mode, record / série, puis « C'est parti ! ».
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';
import { recordKey } from '@lib/records.js';
import type { HomeState } from '../useHome.js';

interface ModeConfirmModalProps {
  a: HomeState;
  mode: 'rogue' | 'quotidien';
}

export default function ModeConfirmModal({ a, mode }: ModeConfirmModalProps): ReactElement {
  const { records, dailyStreak, dailyRecord, alreadyPlayedToday } = a;
  const close = (): void => a.setPicker(null);
  const rogueRecord = records[recordKey('rogue', 'mix', 'tous')] || 0;
  const blocked = mode === 'quotidien' && alreadyPlayedToday;
  return (
    <Modal
      title={mode === 'rogue' ? 'Rogue Quizz' : 'Quizz du jour'}
      onClose={close}
      classe="modal-mode"
    >
      <button className="btn-suppr modal-badge-fermer" onClick={close} title="Fermer">
        <Icon nom="x" taille={18} />
      </button>
      <span className="modal-mode-icone">
        <Icon nom={mode === 'rogue' ? 'gem' : 'calendar'} taille={44} />
      </span>
      <h2 className="modal-badge-nom">{mode === 'rogue' ? 'Rogue Quizz' : 'Quizz du jour'}</h2>
      {mode === 'rogue' ? (
        <p className="modal-badge-desc">
          Tous les thèmes mélangés, jusqu’à 100 questions, une seule vie : la première erreur
          termine la run. La difficulté monte tous les 10 questions (facile → moyen → dur) et tu
          choisis <strong>1 relique parmi 3</strong> au départ puis à chaque palier de 10 questions.
          {rogueRecord > 0 && (
            <>
              <br />
              <strong>Ton record : {rogueRecord} pts</strong>
            </>
          )}
        </p>
      ) : (
        <>
          <p className="modal-badge-desc">
            10 questions identiques pour tous aujourd'hui. Points ×1,5 si ta série fait 3 jours ou
            plus.
            {dailyRecord > 0 && (
              <>
                <br />
                <strong>Ton score du jour : {dailyRecord} pts</strong>
              </>
            )}
          </p>
          <span
            className={dailyStreak > 0 ? 'streak-jour gros' : 'streak-jour'}
            title="Joue le quizz du jour chaque jour pour faire monter ta série !"
          >
            <Icon nom="bolt" taille={dailyStreak > 0 ? 17 : 13} />{' '}
            {dailyStreak > 0
              ? `Série de ${dailyStreak} jour${dailyStreak > 1 ? 's' : ''} !`
              : 'aucune série en cours'}
          </span>
        </>
      )}
      <button
        className="btn-principal"
        disabled={blocked}
        onClick={() => {
          close();
          a.lancer();
        }}
      >
        {blocked ? 'Déjà joué aujourd’hui — reviens demain !' : "C'est parti !"}
      </button>
    </Modal>
  );
}
