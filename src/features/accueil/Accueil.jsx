// Accueil.jsx — écran d'accueil, coquille render-only :
// toute la logique (état, dérivés, action « lancer ») est dans useAccueil.js,
// la mise en page est découpée dans ./composants/*.jsx.
import Icone from '@shared/ui/Icone.jsx';
import { definirAvatar } from '@lib/comptes.js';

import Parametres from '@shared/modales/Parametres.jsx';
import Profil from '@shared/modales/Profil.jsx';
import Suggestions from '@shared/modales/Suggestions.jsx';

import { useAccueil } from './useAccueil.js';
import BarreUser from './composants/BarreUser.jsx';
import ModesTabs from './composants/ModesTabs.jsx';
import BanniereBadge from './composants/BanniereBadge.jsx';
import NomsDuel from './composants/NomsDuel.jsx';
import GrilleThemes from './composants/GrilleThemes.jsx';
import ModaleNiveau from './composants/ModaleNiveau.jsx';
import CtaFixe from './composants/CtaFixe.jsx';

export default function Accueil({
  themes,
  pseudo,
  prefs,
  estAdmin,
  estInvite,
  onDeconnexion,
  onDemarrer,
  onProposer,
  onClassement,
  onStats,
  onBadges,
  onChangerPrefs,
  onTuto,
}) {
  const a = useAccueil({ themes, pseudo, onDemarrer });

  return (
    <div className="accueil">
      <BarreUser
        a={a}
        pseudo={pseudo}
        estInvite={estInvite}
        onDeconnexion={onDeconnexion}
        onBadges={onBadges}
        onTuto={onTuto}
        onStats={onStats}
      />

      <header className="hero">
        <div className="logo">
          <span className="logo-marque">
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M13.6 1.5 4.2 13.6h5.6L8.6 22.5l9.4-12.1h-5.6l1.2-8.9z" />
            </svg>
          </span>
          VoltQuiz
        </div>
      </header>

      <ModesTabs a={a} />
      <BanniereBadge a={a} estInvite={estInvite} />

      {a.mode === 'duel' && <NomsDuel a={a} />}

      {['solo', 'duel'].includes(a.mode) && (
        <GrilleThemes a={a} estAdmin={estAdmin} estInvite={estInvite} />
      )}

      {!estInvite && (
        <button className="btn-secondaire" onClick={onClassement}>
          <Icone nom="podium" taille={18} /> Voir le classement
        </button>
      )}

      <button className="btn-secondaire" onClick={onProposer}>
        <Icone nom="plus" taille={18} /> Proposer une question
      </button>

      <button className="btn-secondaire" onClick={() => a.setShowSuggestions(true)}>
        <Icone nom="pencil" taille={18} /> Une suggestion ? (idée, bug, amélioration)
      </button>

      {a.showParametres && (
        <Parametres
          prefs={prefs}
          avatar={a.avatar}
          onChangerAvatar={(dataUrl) => {
            definirAvatar(pseudo, dataUrl);
            a.setAvatar(dataUrl);
          }}
          onChanger={onChangerPrefs}
          onFermer={() => a.setShowParametres(false)}
        />
      )}
      {a.showSuggestions && (
        <Suggestions pseudo={pseudo} onFermer={() => a.setShowSuggestions(false)} />
      )}

      {/* Modale difficulté (solo) : s'ouvre au clic sur un thème, zéro scroll */}
      {a.mode === 'solo' && a.themeId && a.modalNiveau && a.theme && <ModaleNiveau a={a} />}

      {a.profilOuvert && (
        <Profil
          pseudo={pseudo}
          avatar={a.avatar}
          themes={themes}
          onFermer={() => a.setProfilOuvert(false)}
          onBadges={() => {
            a.setProfilOuvert(false);
            onBadges();
          }}
        />
      )}

      {/* Barre d'action fixe en bas : le bouton pour lancer est TOUJOURS visible, sans scroller */}
      <CtaFixe a={a} />
    </div>
  );
}
