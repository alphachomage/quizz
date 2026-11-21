// features/resultat/Resultat.jsx — écran des résultats, NE FAIT QUE RENDRE.
// La persistance (record, historique, XP, classement, streak) a été faite UNE FOIS
// par App.terminer via persisterResultat() et arrive dans resultat.persistance :
// plus aucun useEffect de persistance dans ce composant d'affichage.
import { useMemo } from 'react';

import Icon from '@shared/ui/Icon.jsx';

import { levelName } from '@lib/scoring.js';
import { themeLevel } from '@lib/xp.js';

import { computeGameStats, pctNiveau } from './gameStats.js';
import { useShare } from './useShare.js';
import ShareModal from './components/ShareModal.jsx';

export default function Results({ result, prefs, themes, estInvite, onRejouer, onAccueil }) {
  const { mode, niveau, theme, players, scores, bonnes, total, details } = result;
  const persistance = result.persistance || {};
  const {
    record = 0,
    recordAvant = 0,
    nouveauRecord = false,
    themeXp = [],
    globalXp = { avant: 0, apres: 0, gain: 0 },
    rang = null,
    dailyStreak = 0,
  } = persistance;

  // Stats de cette partie : temps moyen par question + meilleure série (streak)
  const gameStats = useMemo(() => computeGameStats(details), [details]);

  const share = useShare({ result });

  const gagnant = mode === 'duel' ? (scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1) : null;

  const title =
    mode === 'duel' ? (gagnant === null ? 'Égalité parfaite !' : `${players[gagnant]} remporte le duel !`)
    : mode === 'survie' ? 'Game over !'
    : mode === 'quotidien' ? `Quizz du jour du ${niveau} terminé !`
    : 'Partie terminée !';

  const labelRecord =
    mode === 'solo' ? `Record niveau ${levelName(niveau)} · ${theme.nom}`
    : mode === 'duel' ? `Record duel · ${theme.nom}`
    : mode === 'survie' ? 'Record survie · tous niveaux'
    : `Record du quizz du ${niveau}`;

  const labelClassement =
    mode === 'solo' ? `Solo · ${levelName(niveau)} · ${theme.nom}`
    : mode === 'duel' ? `Duel · ${theme.nom}`
    : mode === 'survie' ? 'Survie · tous niveaux'
    : `Quizz du ${niveau}`;

  return (
    <div className="ecran-centre">
      <div className="resultat">
        <div className="gros-icone">
          {mode === 'duel' ? (
            gagnant === null ? <Icon nom="swords" taille={56} /> : <Icon nom="trophy" taille={56} />
          ) : mode === 'survie' ? (
            <Icon nom="skull" taille={56} />
          ) : mode === 'quotidien' ? (
            <Icon nom="calendar" taille={56} />
          ) : (
            <Icon nom="sparkles" taille={56} />
          )}
        </div>

        {mode === 'duel' ? (
          <>
            <h2>{title}</h2>
            <div className="scores-duel">
              {players.map((j, i) => (
                <div
                  key={j}
                  className={i === gagnant ? 'score-joueur gagnant' : 'score-joueur'}
                  style={{ borderColor: theme.couleur }}
                >
                  <div className="nom">{j}</div>
                  <div className="points">{scores[i]}</div>
                  <div className="detail">
                    {bonnes[i]}/{total} bonnes réponses
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2>{title}</h2>
            <div className="gros-score">{scores[0]} <span>pts</span></div>
            <p className="sous-score">
              {mode === 'survie'
                ? `${bonnes[0]} bonne(s) réponse(s) d'affilée · niveau ${levelName(niveau)}`
                : `${bonnes[0]} bonne(s) réponse(s) sur ${total}${mode === 'solo' ? ` · niveau ${levelName(niveau)}` : ''}`}
            </p>
            {mode === 'quotidien' && dailyStreak > 0 && (
              <div className="streak-jour gros">
                <Icon nom="bolt" taille={20} /> Série de {dailyStreak} jour{dailyStreak > 1 ? 's' : ''} consécutif{dailyStreak > 1 ? 's' : ''} !
              </div>
            )}
          </>
        )}

        {nouveauRecord && (
          <div className="record">
            <Icon nom="bolt" taille={16} /> Nouveau record !{recordAvant > 0 ? ` (avant : ${recordAvant} pts)` : ''}
          </div>
        )}
        <div className="record-actuel">
          <Icon nom="trophy" taille={15} /> {labelRecord} : {record} pts
        </div>

        <div className="stats-partie">
          {gameStats.avgTime !== null && (
            <span><Icon nom="timer" taille={14} /> {gameStats.avgTime} s / question en moyenne</span>
          )}
          {gameStats.meilleureSerie > 1 && (
            <span><Icon nom="flame" taille={14} /> meilleure série : {gameStats.meilleureSerie} bonnes d’affilée</span>
          )}
        </div>

        {!estInvite && rang !== null && rang <= 10 && (
          <div className="record top10">
            <Icon nom="podium" taille={16} /> Top 10 ! Tu es #{rang} au classement {labelClassement}
          </div>
        )}

        {!estInvite && (
        <div className="xp-bloc">
          <h3 className="titre-section"><Icon nom="star" taille={18} /> XP gagnée</h3>
          <div className="xp-globale">
            <div className="xp-globale-titre">
              <span>XP totale du compte</span>
              <span className="xp-globale-val">
                +{globalXp.gain} XP · niv. {themeLevel(globalXp.apres)}
              </span>
            </div>
            <div className="xp-barre">
              <i style={{ width: `${pctNiveau(globalXp.apres)}%` }} />
            </div>
            <div className="xp-globale-sous">
              {globalXp.apres} XP au total (avant : {globalXp.avant})
            </div>
          </div>
          {themeXp.length > 0 && (
            <ul className="xp-themes">
              {themeXp.map((l) => {
                const t = (themes || []).find((x) => x.id === l.themeId);
                return (
                  <li key={l.themeId} className="xp-theme">
                    <span className="xp-theme-nom" style={{ color: t ? t.couleur : '#a78bfa' }}>
                      <Icon nom={t ? t.icone : 'sparkles'} taille={15} /> {t ? t.nom : l.themeId}
                    </span>
                    <span className="xp-theme-gain">+{l.gain} XP</span>
                    <span className="xp-theme-niv">
                      Niv. {l.nivAvant}{l.nivApres > l.nivAvant ? ` vers ${l.nivApres}` : ''}
                    </span>
                    <span className="xp-barre petite">
                      <i style={{ width: `${l.pct}%`, background: t ? t.couleur : '#a78bfa' }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        )}

        {estInvite && (
          <p className="info-mix">
            <Icon nom="user" taille={15} /> Mode invité : aucune XP, aucun badge, aucun titre et aucun classement n'est enregistré.
            Crée un compte pour tout conserver entre tes parties.
          </p>
        )}

        <div className="actions">
          {mode !== 'quotidien' && (
            <button className="btn-principal" onClick={onRejouer}>
              <Icon nom="replay" taille={18} /> Rejouer (nouvelles questions)
            </button>
          )}
          {mode === 'quotidien' && (
            <>
              <button className="btn-secondaire" onClick={() => share.setPartageOuvert(true)}>
                <Icon nom="share" taille={18} /> Partager mon résultat
              </button>
              <p className="info-mix"><Icon nom="calendar" taille={15} /> Une seule tentative par jour — reviens demain pour un nouveau quizz !</p>
            </>
          )}
          <button className="btn-secondaire" onClick={onAccueil}>
            <Icon nom="home" taille={18} /> Accueil
          </button>
        </div>

        {share.partageOuvert && mode === 'quotidien' && <ShareModal share={share} />}
      </div>
    </div>
  );
}
