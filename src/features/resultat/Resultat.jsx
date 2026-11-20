// features/resultat/Resultat.jsx — écran des résultats, NE FAIT QUE RENDRE.
// La persistance (record, historique, XP, classement, streak) a été faite UNE FOIS
// par App.terminer via persisterResultat() et arrive dans resultat.persistance :
// plus aucun useEffect de persistance dans ce composant d'affichage.
import { useMemo } from 'react';

import Icone from '@shared/ui/Icone.jsx';

import { nomNiveau } from '@lib/scoring.js';
import { niveauTheme } from '@lib/xp.js';

import { calculerStatsPartie, pctNiveau } from './statsPartie.js';
import { usePartage } from './usePartage.js';
import PartageModal from './composants/PartageModal.jsx';

export default function Resultat({ resultat, prefs, themes, estInvite, onRejouer, onAccueil }) {
  const { mode, niveau, theme, joueurs, scores, bonnes, total, details } = resultat;
  const persistance = resultat.persistance || {};
  const {
    record = 0,
    recordAvant = 0,
    nouveauRecord = false,
    xpTheme = [],
    xpGlobal = { avant: 0, apres: 0, gain: 0 },
    rang = null,
    streakJour = 0,
  } = persistance;

  // Stats de cette partie : temps moyen par question + meilleure série (streak)
  const statsPartie = useMemo(() => calculerStatsPartie(details), [details]);

  const partage = usePartage({ resultat });

  const gagnant = mode === 'duel' ? (scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1) : null;

  const titre =
    mode === 'duel' ? (gagnant === null ? 'Égalité parfaite !' : `${joueurs[gagnant]} remporte le duel !`)
    : mode === 'survie' ? 'Game over !'
    : mode === 'quotidien' ? `Quizz du jour du ${niveau} terminé !`
    : 'Partie terminée !';

  const labelRecord =
    mode === 'solo' ? `Record niveau ${nomNiveau(niveau)} · ${theme.nom}`
    : mode === 'duel' ? `Record duel · ${theme.nom}`
    : mode === 'survie' ? 'Record survie · tous niveaux'
    : `Record du quizz du ${niveau}`;

  const labelClassement =
    mode === 'solo' ? `Solo · ${nomNiveau(niveau)} · ${theme.nom}`
    : mode === 'duel' ? `Duel · ${theme.nom}`
    : mode === 'survie' ? 'Survie · tous niveaux'
    : `Quizz du ${niveau}`;

  return (
    <div className="ecran-centre">
      <div className="resultat">
        <div className="gros-icone">
          {mode === 'duel' ? (
            gagnant === null ? <Icone nom="swords" taille={56} /> : <Icone nom="trophy" taille={56} />
          ) : mode === 'survie' ? (
            <Icone nom="skull" taille={56} />
          ) : mode === 'quotidien' ? (
            <Icone nom="calendar" taille={56} />
          ) : (
            <Icone nom="sparkles" taille={56} />
          )}
        </div>

        {mode === 'duel' ? (
          <>
            <h2>{titre}</h2>
            <div className="scores-duel">
              {joueurs.map((j, i) => (
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
            <h2>{titre}</h2>
            <div className="gros-score">{scores[0]} <span>pts</span></div>
            <p className="sous-score">
              {mode === 'survie'
                ? `${bonnes[0]} bonne(s) réponse(s) d'affilée · niveau ${nomNiveau(niveau)}`
                : `${bonnes[0]} bonne(s) réponse(s) sur ${total}${mode === 'solo' ? ` · niveau ${nomNiveau(niveau)}` : ''}`}
            </p>
            {mode === 'quotidien' && streakJour > 0 && (
              <div className="streak-jour gros">
                <Icone nom="bolt" taille={20} /> Série de {streakJour} jour{streakJour > 1 ? 's' : ''} consécutif{streakJour > 1 ? 's' : ''} !
              </div>
            )}
          </>
        )}

        {nouveauRecord && (
          <div className="record">
            <Icone nom="bolt" taille={16} /> Nouveau record !{recordAvant > 0 ? ` (avant : ${recordAvant} pts)` : ''}
          </div>
        )}
        <div className="record-actuel">
          <Icone nom="trophy" taille={15} /> {labelRecord} : {record} pts
        </div>

        <div className="stats-partie">
          {statsPartie.tempsMoyen !== null && (
            <span><Icone nom="timer" taille={14} /> {statsPartie.tempsMoyen} s / question en moyenne</span>
          )}
          {statsPartie.meilleureSerie > 1 && (
            <span><Icone nom="flame" taille={14} /> meilleure série : {statsPartie.meilleureSerie} bonnes d’affilée</span>
          )}
        </div>

        {!estInvite && rang !== null && rang <= 10 && (
          <div className="record top10">
            <Icone nom="podium" taille={16} /> Top 10 ! Tu es #{rang} au classement {labelClassement}
          </div>
        )}

        {!estInvite && (
        <div className="xp-bloc">
          <h3 className="titre-section"><Icone nom="star" taille={18} /> XP gagnée</h3>
          <div className="xp-globale">
            <div className="xp-globale-titre">
              <span>XP totale du compte</span>
              <span className="xp-globale-val">
                +{xpGlobal.gain} XP · niv. {niveauTheme(xpGlobal.apres)}
              </span>
            </div>
            <div className="xp-barre">
              <i style={{ width: `${pctNiveau(xpGlobal.apres)}%` }} />
            </div>
            <div className="xp-globale-sous">
              {xpGlobal.apres} XP au total (avant : {xpGlobal.avant})
            </div>
          </div>
          {xpTheme.length > 0 && (
            <ul className="xp-themes">
              {xpTheme.map((l) => {
                const t = (themes || []).find((x) => x.id === l.themeId);
                return (
                  <li key={l.themeId} className="xp-theme">
                    <span className="xp-theme-nom" style={{ color: t ? t.couleur : '#a78bfa' }}>
                      <Icone nom={t ? t.icone : 'sparkles'} taille={15} /> {t ? t.nom : l.themeId}
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
            <Icone nom="user" taille={15} /> Mode invité : aucune XP, aucun badge, aucun titre et aucun classement n'est enregistré.
            Crée un compte pour tout conserver entre tes parties.
          </p>
        )}

        <div className="actions">
          {mode !== 'quotidien' && (
            <button className="btn-principal" onClick={onRejouer}>
              <Icone nom="replay" taille={18} /> Rejouer (nouvelles questions)
            </button>
          )}
          {mode === 'quotidien' && (
            <>
              <button className="btn-secondaire" onClick={() => partage.setPartageOuvert(true)}>
                <Icone nom="share" taille={18} /> Partager mon résultat
              </button>
              <p className="info-mix"><Icone nom="calendar" taille={15} /> Une seule tentative par jour — reviens demain pour un nouveau quizz !</p>
            </>
          )}
          <button className="btn-secondaire" onClick={onAccueil}>
            <Icone nom="home" taille={18} /> Accueil
          </button>
        </div>

        {partage.partageOuvert && mode === 'quotidien' && <PartageModal partage={partage} />}
      </div>
    </div>
  );
}
