// Accueil.jsx — écran d'accueil, coquille render-only :
// toute la logique (état, dérivés, action « lancer ») est dans useHome.js.
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
  isAdmin: isAdmin,
  isGuest: isGuest,
  onLogout: onLogout,
  onStart: onStart,
  onPropose: onPropose,
  onLeaderboard: onLeaderboard,
  onStats,
  onBadges,
  onChangePrefs: onChangePrefs,
  onTutorial: onTutorial,
}) {
  const a = useHome({
    themes,
    pseudo,
    onStart: onStart,
  });
  return (
    <div className="accueil">
      <UserBar
        a={a}
        pseudo={pseudo}
        isGuest={isGuest}
        onLogout={onLogout}
        onBadges={onBadges}
        onTutorial={onTutorial}
        onStats={onStats}
      />

      <header className="hero">
        <div className="logo">
          <span className="logo-marque">
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M13.6 1.5 4.2 13.6h5.6L8.6 22.5l9.4-12.1h-5.6l1.2-8.9z"
              />
            </svg>
          </span>
          VoltQuiz
        </div>
      </header>

      <ModeTabs a={a} />
      <BadgeBanner a={a} isGuest={isGuest} />

      {a.mode === 'duel' && <DuelNames a={a} />}

      {['solo', 'duel'].includes(a.mode) && <ThemeGrid a={a} isAdmin={isAdmin} isGuest={isGuest} />}

      {!isGuest && (
        <button className="btn-secondaire" onClick={onLeaderboard}>
          <Icon nom="podium" taille={18} /> Voir le classement
        </button>
      )}

      <button className="btn-secondaire" onClick={onPropose}>
        <Icon nom="plus" taille={18} /> Proposer une question
      </button>

      <button className="btn-secondaire" onClick={() => a.setShowSuggestionsN(true)}>
        <Icon nom="pencil" taille={18} /> Une suggestion ? (idée, bug, amélioration)
      </button>

      {a.showSettings && (
        <Settings
          prefs={prefs}
          avatar={a.avatar}
          onChangerAvatar={(dataUrl) => {
            setAvatar(pseudo, dataUrl);
            a.setAvatar(dataUrl);
          }}
          onChanger={onChangePrefs}
          onClose={() => a.setShowSettings(false)}
        />
      )}
      {a.showSuggestions && (
        <Suggestions pseudo={pseudo} onClose={() => a.setShowSuggestionsN(false)} />
      )}

      {/* Modale difficulté (solo) : s'ouvre au clic sur un thème, zéro scroll */}
      {a.mode === 'solo' && a.themeId && a.levelModal && a.theme && <LevelModal a={a} />}

      {a.profilOuvert && (
        <Profile
          pseudo={pseudo}
          avatar={a.avatar}
          themes={themes}
          onClose={() => a.setProfilOuvert(false)}
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
