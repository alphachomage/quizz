// ModeDescription.tsx — ligne de description du mode choisi, affichée sous le logo.
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { recordKey } from '@lib/records.js';
import type { HomeState } from '../useHome.js';

interface ModeDescriptionProps {
  a: HomeState;
}

export default function ModeDescription({ a }: ModeDescriptionProps): ReactElement {
  const { mode, records, dailyStreak, dailyRecord } = a;
  return (
    <p className="mode-desc-ligne">
      {mode === 'solo' && '10 questions contre la montre dans le thème choisi.'}
      {mode === 'duel' && (
        <>
          Affronte d'autres joueurs <strong>en ligne</strong>, pas en local :{' '}
          <span className="a-venir">à venir</span>
        </>
      )}
      {mode === 'survie' && (
        <>
          Tous thèmes et niveaux mélangés, 1 vie
          {records[recordKey('survie', 'mix', 'tous')]
            ? ` · record ${records[recordKey('survie', 'mix', 'tous')]} pts`
            : ''}
        </>
      )}
      {mode === 'quotidien' && (
        <>
          10 questions identiques pour tous aujourd'hui (points ×1,5 si ta série fait 3 jours ou
          plus)
          {dailyRecord ? ` · ton score : ${dailyRecord} pts` : ''}
          {dailyStreak > 0 ? (
            <span
              className="streak-jour gros"
              title="Série de jours consécutifs sur le quizz du jour — joue chaque jour pour la faire monter !"
            >
              <Icon nom="bolt" taille={17} /> Série de {dailyStreak} jour
              {dailyStreak > 1 ? 's' : ''} !
            </span>
          ) : (
            <span
              className="streak-jour"
              title="Joue le quizz du jour chaque jour pour lancer ta série d'éclairs !"
            >
              <Icon nom="bolt" taille={13} /> aucune série en cours
            </span>
          )}
        </>
      )}
    </p>
  );
}
