// CtaFixe.jsx — barre d'action fixe en bas de l'accueil : le bouton pour lancer est
// TOUJOURS visible, sans scroller.
import { nomNiveau } from '@lib/index.js';

export default function CtaFixe({ a }) {
  const { mode, theme, dejaJoueAujourdhui, recordJour, niveau, lancer } = a;
  return (
    <div className="cta-fixe">
      <div className="cta-fixe-interieur">
        <button
          className="btn-principal"
          disabled={(mode === 'solo' || mode === 'duel') && !theme || (mode === 'quotidien' && dejaJoueAujourdhui)}
          onClick={lancer}
        >
          {mode === 'solo' && (theme ? `C'est parti — niveau ${nomNiveau(niveau)} !` : "Choisis d'abord un thème")}
          {mode === 'duel' && (theme ? 'Lancer le duel !' : "Choisis d'abord un thème")}
          {mode === 'survie' && "Mode Survie — c'est parti !"}
          {mode === 'quotidien' && (dejaJoueAujourdhui ? `Déjà joué aujourd'hui (${recordJour} pts) — reviens demain !` : 'Jouer le quizz du jour !')}
        </button>
      </div>
    </div>
  );
}
