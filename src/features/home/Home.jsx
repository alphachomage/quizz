// Accueil.jsx — écran d'accueil, coquille render-only :
// toute la logique (état, dérivés, action « lancer ») est dans useAccueil.js,
// la mise en page est découpée dans ./composants/*.jsx.
import Icon from '@shared/ui/Icon.jsx';
import { setAvatar } from '@lib/accounts.js';

import Settings from '@shared/modals/Settings.jsx';
import Profile from '@shared/modals/Profile.jsx';
import Suggestions from '@shared/modals/Suggestions.jsx';

import { useHome } from './useHome.js';
import UserBar from './components/UserBar.jsx';
import ModeTabs from './components/ModeTabs.jsx';
import BadgeBanner from './components/BadgeBanner.jsx';
import DuelNames from './components/DuelNames.jsx';
import ThemeGrid from './components/ThemeGrid.jsx';
import LevelModal from './components/LevelModal.jsx';
import FixedCta from './components/FixedCta.jsx';

export default function Home({
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
  const a = useHome({ themes, pseudo, onDemarrer });

  return (
    <div className="accueil">
      <UserBar
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

      <ModeTabs a={a} />
      <BadgeBanner a={a} estInvite={estInvite} />

      {a.mode === 'duel' && <DuelNames a={a} />}

      {['solo', 'duel'].includes(a.mode) && (
        <ThemeGrid a={a} estAdmin={estAdmin} estInvite={estInvite} />
      )}

      {!estInvite && (
        <button className="btn-secondaire" onClick={onClassement}>
          <Icon nom="podium" taille={18} /> Voir le classement
        </button>
      )}

      <button className="btn-secondaire" onClick={onProposer}>
        <Icon nom="plus" taille={18} /> Proposer une question
      </button>

      <button className="btn-secondaire" onClick={() => a.setShowSuggestions(true)}>
        <Icon nom="pencil" taille={18} /> Une suggestion ? (idée, bug, amélioration)
      </button>

      {a.showParametres && (
        <Settings
          prefs={prefs}
          avatar={a.avatar}
          onChangerAvatar={(dataUrl) => {
            setAvatar(pseudo, dataUrl);
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
      {a.mode === 'solo' && a.themeId && a.modalNiveau && a.theme && <LevelModal a={a} />}

      {a.profilOuvert && (
        <Profile
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
      <FixedCta a={a} />
    </div>
  );
}
