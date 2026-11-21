// CtaFixe.jsx — barre d'action fixe en bas de l'accueil : le bouton pour lancer est
// TOUJOURS visible, sans scroller.
import { levelName } from '@lib/scoring.js';
export default function FixedCta({ a }) {
  const { mode, theme, alreadyPlayedToday: alreadyPlayedToday, dailyRecord, niveau, lancer } = a;
  return (
    <div className="cta-fixe">
      <div className="cta-fixe-interieur">
        <button
          className="btn-principal"
          disabled={
            ((mode === 'solo' || mode === 'duel') && !theme) ||
            (mode === 'quotidien' && alreadyPlayedToday)
          }
          onClick={lancer}
        >
          {mode === 'solo' &&
            (theme ? `C'est parti — niveau ${levelName(niveau)} !` : "Choisis d'abord un thème")}
          {mode === 'duel' && (theme ? 'Lancer le duel !' : "Choisis d'abord un thème")}
          {mode === 'survie' && "Mode Survie — c'est parti !"}
          {mode === 'quotidien' &&
            (alreadyPlayedToday
              ? `Déjà joué aujourd'hui (${dailyRecord} pts) — reviens demain !`
              : 'Jouer le quizz du jour !')}
        </button>
      </div>
    </div>
  );
}
