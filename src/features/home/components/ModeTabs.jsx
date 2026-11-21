// ModesTabs.jsx — les 4 onglets de mode + la ligne de description du mode choisi.
import Icon from '@shared/ui/Icon.jsx';
import { recordKey } from '@lib/records.js';

const MODES = [
  { id: 'solo', icone: 'timer', nom: 'Solo' },
  { id: 'duel', icone: 'swords', nom: 'Duel en ligne', badge: 'à venir' },
  { id: 'survie', icone: 'skull', nom: 'Survie' },
  { id: 'quotidien', icone: 'calendar', nom: 'Quizz du jour', streak: true },
];

export default function ModeTabs({ a }) {
  const { mode, setMode, records, dailyStreak, dailyRecord } = a;
  return (
    <>
      <section className="modes-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={mode === m.id ? 'mode-tab actif' : 'mode-tab'}
            disabled={m.id === 'duel'} // duel local verrouillé : le mode en ligne arrive plus tard
            title={
              m.id === 'duel'
                ? 'Mode en ligne à venir — le duel local est désactivé pour l’instant'
                : undefined
            }
            onClick={() => setMode(m.id)}
          >
            <Icon nom={m.icone} taille={19} />
            <span>{m.nom}</span>
            {m.badge && <span className="tab-badge">{m.badge}</span>}
            {m.streak && dailyStreak > 0 && (
              <span
                className="tab-streak"
                title={`Série de ${dailyStreak} jour${dailyStreak > 1 ? 's' : ''} consécutifs sur le quizz du jour`}
              >
                <Icon nom="bolt" taille={12} /> ×{dailyStreak}
              </span>
            )}
          </button>
        ))}
      </section>
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
    </>
  );
}
