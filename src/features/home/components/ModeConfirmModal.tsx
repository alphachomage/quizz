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
        <>
          <ul className="rogue-tuto-liste">
            <li>
              <Icon nom="bolt" taille={14} /> <strong>3 vies</strong> au départ : chaque erreur t’en coûte une, à 0 la
              run s’arrête.
            </li>
            <li>
              Jusqu’à <strong>100 questions</strong>, tous thèmes mélangés, difficulté montante
              tous les 10 questions.
            </li>
            <li>
              <strong>1 relique parmi 3</strong> au départ, puis à chaque palier (60 reliques, effets
              cumulables).
            </li>
          </ul>
          {rogueRecord > 0 && (
            <p className="modal-badge-desc">
              <strong>Ton record : {rogueRecord} pts</strong>
            </p>
          )}
          <p className="modal-badge-desc tuto-une-fois">
            Ce tutoriel ne s’affiche qu’une seule fois — ensuite tu lances directement.
          </p>
        </>
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
          if (mode === 'rogue') {
            // tutoriel rogue : marqué comme vu (une seule fois) + lancement direct
            a.confirmerRogueTuto();
          } else {
            close();
            a.lancer();
          }
        }}
      >
        {blocked ? 'Déjà joué aujourd’hui — reviens demain !' : "C'est parti !"}
      </button>
    </Modal>
  );
}
