import { useMemo, useState } from 'react';
import Icone, { Barres } from './Icone.jsx';
import {
  chargerRecords,
  cleRecord,
  NIVEAUX,
  nomNiveau,
  chargerXP,
  niveauTheme,
  xpPourNiveau,
  chargerParties,
} from '../lib/logique.js';
import { avatarActuel, definirAvatar } from '../lib/comptes.js';

import Parametres from './Parametres.jsx';
import Profil from './Profil.jsx';
import Suggestions from './Suggestions.jsx';

import { dateAujourdhui, streakJourActuelle } from '../lib/logique.js';
import { titreAffiche, prochainTitre } from '../lib/titres.js';
import { prochainBadge } from '../lib/badges.js';
// NIVEAUX sert au sélecteur de difficulté (solo + survie).

// Thème fictif utilisé pour les modes "tous thèmes mélangés" (survie, quizz du jour).
const THEME_TOUS = { id: 'tous', nom: 'Tous les thèmes', icone: 'globe', couleur: '#8b5cf6' };

// Écran d'accueil : choix du mode, du niveau (solo), des joueurs (duel), du thème,
// lancement, accès au formulaire de proposition de question, et gestion des propositions.
export default function Accueil({ themes, pseudo, prefs, estAdmin, estInvite, onDeconnexion, onDemarrer, onProposer, onClassement, onStats, onBadges, onChangerPrefs, onTuto }) {
  const [mode, setMode] = useState('solo');
  const [niveau, setNiveau] = useState('moyen');
  const [themeId, setThemeId] = useState(null);
  const [showParametres, setShowParametres] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [modalNiveau, setModalNiveau] = useState(false); // modale difficulté (solo, au clic sur un thème)
  const [nom1, setNom1] = useState(pseudo || '');
  const [nom2, setNom2] = useState('');
  const [avatar, setAvatar] = useState(() => avatarActuel());
  const [profilOuvert, setProfilOuvert] = useState(false);
  const records = chargerRecords();
  const xp = chargerXP();
  // Pseudos déjà rencontrés (suggestions dans le duel, façon "amis" en local)
  const joueursConnus = [...new Set(chargerParties().flatMap((p) => (p.joueurs || []).map((j) => j.nom)))];
  const theme = themes.find((t) => t.id === themeId);
  const joueurs = [nom1.trim() || 'Joueur 1', nom2.trim() || 'Joueur 2'];
  // Ordre des thèmes fixe (alphabétique par libellé) : jamais mélangé, même après un F5.
  const themesAffiches = useMemo(
    () => [...themes].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    [themes]
  );

  function lancer() {
    if (mode === 'solo' || mode === 'duel') {
      if (!theme) return;
      onDemarrer({
        mode,
        niveau: mode === 'solo' ? niveau : null,
        theme,
        joueurs: mode === 'solo' ? [pseudo || 'Toi'] : joueurs,
        tousThemes: themes,
      });
    } else if (mode === 'survie') {
      // survie : plus de niveau choisi, toutes les questions (tous niveaux) mélangées
      onDemarrer({ mode: 'survie', niveau: 'mix', theme: THEME_TOUS, joueurs: [pseudo || 'Toi'], tousThemes: themes });
    } else {
      // quizz du jour : le niveau sert de "date du jour" pour le record et le tirage identique
      onDemarrer({ mode: 'quotidien', niveau: dateAujourdhui(), theme: THEME_TOUS, joueurs: [pseudo || 'Toi'], tousThemes: themes });
    }
  }

  // XP globale du joueur = somme de l'XP de tous les thèmes
  // Record du quizz du jour (clé = date du jour) pour afficher "déjà joué" sur la carte.
  const recordJour = records[cleRecord('quotidien', dateAujourdhui(), 'tous')] || 0;
  // Prochain badge/titre à portée (effet « reviens-y » sur l'accueil)
  const badgeSuivant = useMemo(() => prochainBadge(), []);
  // Série de jours du quizz du jour (logo éclair), façon Snapchat
  const streakJour = streakJourActuelle().compte;
  // Titre choisi dans l'onglet Badges & titres, affiché sous la barre d'XP
  const titreProfil = titreAffiche();
  // Une seule tentative par jour pour le quizz du jour : déjà joué si une partie du jour existe.
  // Exception de test (une seule fois) : ouvrir l'app avec ?jour=libre pour débloquer le quizz du jour.
  const debloqueTest = new URLSearchParams(window.location.search).get('jour') === 'libre';
  const dejaJoueAujourdhui = !debloqueTest && chargerParties().some((p) => p.mode === 'quotidien' && p.niveau === dateAujourdhui());

  const xpTotal = Object.values(xp).reduce((a, b) => a + b, 0);
  const nivGlobal = niveauTheme(xpTotal);
  const xpNiv = xpPourNiveau(nivGlobal);
  const xpNext = xpPourNiveau(nivGlobal + 1);
  const pctXpGlobal = Math.min(100, Math.round(((xpTotal - xpNiv) / (xpNext - xpNiv)) * 100));

  return (
    <div className="accueil">
      <div className="barre-user">
        <div className="user-bloc">
          {!estInvite && (
            <button
              className="avatar-btn"
              onClick={() => setProfilOuvert(true)}
              title="Voir ma carte profil (changer ma photo : Paramètres)"
            >
              {avatar ? (
                <img src={avatar} alt="" className="avatar-img" />
              ) : (
                <span className="avatar-defaut"><Icone nom="user" taille={18} /></span>
              )}
            </button>
          )}
          <div className="user-infos">
            <span className="user-nom">
              {pseudo} {estInvite ? <span className="chip-invite">Invité</span> : <span className="user-niv">Niv. {nivGlobal}</span>}
            </span>
            {!estInvite && (
              <>
                <span className="user-xpbar" title={`${xpTotal} XP au total — niveau ${nivGlobal + 1} à ${xpNext} XP`}>
                  <i style={{ width: `${pctXpGlobal}%` }} />
                </span>
                {titreProfil && <span className="user-titre" title="Ton titre (choisi dans l'onglet Badges & titres)">{titreProfil}</span>}
              </>
            )}
          </div>
        </div>
        {!estInvite && (
          <button className="btn-icone" title="Mes badges" onClick={onBadges}>
            <Icone nom="star" taille={17} />
          </button>
        )}
        <button className="btn-icone" title="Revoir le tutoriel" onClick={onTuto}>
          <Icone nom="question" taille={17} />
        </button>
        {!estInvite && (
          <button className="btn-icone" title="Mes statistiques" onClick={onStats}>
            <Icone nom="chart" taille={17} />
          </button>
        )}
        <button className="btn-icone" title="Paramètres (sons, animations, vibrations)" onClick={() => setShowParametres(true)}>
          <Icone nom="sliders" taille={17} />
        </button>
        <button className="btn-suppr" title="Se déconnecter" onClick={onDeconnexion}>
          <Icone nom="logout" taille={16} />
        </button>
      </div>
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

      <section className="modes-tabs">
        {[
          { id: 'solo', icone: 'timer', nom: 'Solo' },
          { id: 'duel', icone: 'swords', nom: 'Duel en ligne', badge: 'à venir' },
          { id: 'survie', icone: 'skull', nom: 'Survie' },
          { id: 'quotidien', icone: 'calendar', nom: 'Quizz du jour', streak: true },
        ].map((m) => (
          <button
            key={m.id}
            className={mode === m.id ? 'mode-tab actif' : 'mode-tab'}
            disabled={m.id === 'duel'} // duel local verrouillé : le mode en ligne arrive plus tard
            title={m.id === 'duel' ? 'Mode en ligne à venir — le duel local est désactivé pour l’instant' : undefined}
            onClick={() => setMode(m.id)}
          >
            <Icone nom={m.icone} taille={19} />
            <span>{m.nom}</span>
            {m.badge && <span className="tab-badge">{m.badge}</span>}
            {m.streak && streakJour > 0 && (
              <span className="tab-streak" title={`Série de ${streakJour} jour${streakJour > 1 ? 's' : ''} consécutifs sur le quizz du jour`}>
                <Icone nom="bolt" taille={12} /> ×{streakJour}
              </span>
            )}
          </button>
        ))}
      </section>
      <p className="mode-desc-ligne">
        {mode === 'solo' && '10 questions contre la montre dans le thème choisi.'}
        {mode === 'duel' && (
          <>
            Affronte d'autres joueurs <strong>en ligne</strong>, pas en local : <span className="a-venir">à venir</span>
          </>
        )}
        {mode === 'survie' && (
          <>
            Tous thèmes et niveaux mélangés, 1 vie
            {records[cleRecord('survie', 'mix', 'tous')] ? ` · record ${records[cleRecord('survie', 'mix', 'tous')]} pts` : ''}
          </>
        )}
        {mode === 'quotidien' && (
          <>
            10 questions identiques pour tous aujourd'hui (points ×1,5 si ta série fait 3 jours ou plus)
            {recordJour ? ` · ton score : ${recordJour} pts` : ''}
            {streakJour > 0 ? (
              <span className="streak-jour gros" title="Série de jours consécutifs sur le quizz du jour — joue chaque jour pour la faire monter !">
                <Icone nom="bolt" taille={17} /> Série de {streakJour} jour{streakJour > 1 ? 's' : ''} !
              </span>
            ) : (
              <span className="streak-jour" title="Joue le quizz du jour chaque jour pour lancer ta série d'éclairs !">
                <Icone nom="bolt" taille={13} /> aucune série en cours
              </span>
            )}
          </>
        )}
      </p>

      {!estInvite && badgeSuivant && (
        <div className="prochain-badge" title={`${badgeSuivant.desc} — débloque ce badge en continuant à jouer !`}>
          <span className="pb-icone"><Icone nom={badgeSuivant.icone} taille={14} /></span>
          <span className="pb-texte">
            <strong>Prochain badge :</strong> {badgeSuivant.nom} · {badgeSuivant.actuel}/{badgeSuivant.cible}
          </span>
          <span className="pb-barre"><i style={{ width: `${Math.round(badgeSuivant.pct * 100)}%` }} /></span>
        </div>
      )}

      {mode === 'duel' && (
        <section className="noms">
          <datalist id="joueurs-connus">
            {joueursConnus.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <input
            value={nom1}
            onChange={(e) => setNom1(e.target.value)}
            placeholder="Nom du joueur 1"
            maxLength={20}
            list="joueurs-connus"
          />
          <span className="vs">VS</span>
          <input
            value={nom2}
            onChange={(e) => setNom2(e.target.value)}
            placeholder="Nom du joueur 2"
            maxLength={20}
            list="joueurs-connus"
          />
        </section>
      )}

      {['solo', 'duel'].includes(mode) && (
      <>
      <h2 className="titre-section">Choisis ton thème</h2>
      <section className="themes">
        {themesAffiches.map((t) => {
          const record = records[cleRecord(mode, mode === 'solo' ? niveau : null, t.id)] || 0;
          const niv = niveauTheme(xp[t.id] || 0);
          const xpNiv = xpPourNiveau(niv);
          const xpNext = xpPourNiveau(niv + 1);
          const pctXp = Math.min(100, Math.round(((xp[t.id] || 0) - xpNiv) / (xpNext - xpNiv) * 100));
          return (
            <button
              key={t.id}
              className={themeId === t.id ? 'theme actif' : 'theme'}
              style={{ '--couleur': t.couleur }}
              onClick={() => {
                setThemeId(t.id);
                // En solo, le choix du niveau se fait dans une modale, sans scroll
                if (mode === 'solo') setModalNiveau(true);
              }}
            >
              <span className="theme-haut">
                <span className="theme-icone">
                  <Icone nom={t.icone} taille={22} />
                </span>
                <span className="theme-nom">{t.nom}</span>
              </span>
              <span className="theme-meta">
                {!estInvite && <span className="theme-niv">Niv. {niv}</span>}
                {record > 0 && <span className="theme-record">Record {record} pts</span>}
                {estAdmin && <span className="theme-nb">{t.questions.length} q.</span>}
              </span>
              {!estInvite && (
                <span className="theme-xpbar" title={`XP ${xp[t.id] || 0} — niveau ${niv + 1} à ${xpNext} XP`}>
                  <i style={{ width: `${pctXp}%`, background: t.couleur }} />
                </span>
              )}
            </button>
          );
        })}
      </section>
      </>
      )}

      {!estInvite && (
        <button className="btn-secondaire" onClick={onClassement}>
          <Icone nom="podium" taille={18} /> Voir le classement
        </button>
      )}

      <button className="btn-secondaire" onClick={onProposer}>
        <Icone nom="plus" taille={18} /> Proposer une question
      </button>

      <button className="btn-secondaire" onClick={() => setShowSuggestions(true)}>
        <Icone nom="pencil" taille={18} /> Une suggestion ? (idée, bug, amélioration)
      </button>

      {showParametres && (
        <Parametres
          prefs={prefs}
          avatar={avatar}
          onChangerAvatar={(dataUrl) => { definirAvatar(pseudo, dataUrl); setAvatar(dataUrl); }}
          onChanger={onChangerPrefs}
          onFermer={() => setShowParametres(false)}
        />
      )}
      {showSuggestions && (
        <Suggestions pseudo={pseudo} onFermer={() => setShowSuggestions(false)} />
      )}

      {/* Modale difficulté (solo) : s'ouvre au clic sur un thème, zéro scroll */}
      {mode === 'solo' && themeId && modalNiveau && theme && (
        <div className="modal-overlay" onClick={() => setModalNiveau(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titre">
              <h2>
                <span className="theme-icone" style={{ '--couleur': theme.couleur, width: 34, height: 34, borderRadius: 10 }}>
                  <Icone nom={theme.icone} taille={18} />
                </span>
                {theme.nom}
              </h2>
              <button className="btn-suppr" onClick={() => setModalNiveau(false)} title="Fermer">
                <Icone nom="x" taille={18} />
              </button>
            </div>
            <p className="vide">Choisis la difficulté :</p>
            <div className="niveaux-modal">
              {NIVEAUX.map((n, i) => (
                <button
                  key={n.id}
                  className={niveau === n.id ? 'niveau-modal actif' : 'niveau-modal'}
                  style={{ '--couleur': n.couleur }}
                  onClick={() => setNiveau(n.id)}
                >
                  <Barres actives={i + 1} couleur={n.couleur} taille={18} />
                  <span>{n.nom}</span>
                </button>
              ))}
            </div>
            <button
              className="btn-principal"
              onClick={() => { setModalNiveau(false); lancer(); }}
            >
              C'est parti — niveau {nomNiveau(niveau)} !
            </button>
          </div>
        </div>
      )}
      {profilOuvert && (
        <Profil
          pseudo={pseudo}
          avatar={avatar}
          themes={themes}
          onFermer={() => setProfilOuvert(false)}
          onBadges={() => { setProfilOuvert(false); onBadges(); }}
        />
      )}

      {/* Barre d'action fixe en bas : le bouton pour lancer est TOUJOURS visible, sans scroller */}
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
    </div>
  );
}
