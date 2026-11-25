// features/resultat/Resultat.tsx — écran des résultats, NE FAIT QUE RENDRE.
// La persistance (record, historique, XP, classement, streak) a été faite UNE FOIS
// par App.terminer via persisterResultat() et arrive dans resultat.persistance :
// plus aucun useEffect de persistance dans ce composant d'affichage.
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import type { GameResult, Theme } from '@lib/types.js';
import { computeGameStats } from './gameStats.js';
import { RELICS, RARETE_COULEUR } from '@lib/relics.js';
import type { Persistance } from './persist.js';
import { useShare } from './useShare.js';
import ShareModal from './components/ShareModal.jsx';
import ResultTiles from './components/ResultTiles.jsx';
import ResultXp from './components/ResultXp.jsx';

/** Props de l'écran de résultats (déléguées par app/Screens.tsx). */
export interface ResultsProps {
  result: GameResult & { persistance?: Persistance };
  themes: Theme[] | null;
  isGuest: boolean;
  onReplay: () => void;
  onHome: () => void;
}

export default function Results({
  result,
  themes,
  isGuest,
  onReplay,
  onHome,
}: ResultsProps): ReactElement {
  const { mode, niveau, theme, players, scores, bonnes, total, details, relics } = result;
  // persistance est toujours posée par App.terminer ; les défauts restent défensifs
  const persistance: Partial<Persistance> = result.persistance || {};
  const {
    record = 0,
    recordAvant = 0,
    nouveauRecord = false,
    themeXp = [],
    globalXp = {
      avant: 0,
      apres: 0,
      gain: 0,
    },
    rang = null,
    dailyStreak = 0,
  } = persistance;

  // Stats de cette partie : temps moyen par question + meilleure série (streak)
  const gameStats = useMemo(() => computeGameStats(details), [details]);
  const share = useShare({
    result,
  });
  const gagnant =
    mode === 'duel' ? (scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1) : null;
  const title =
    mode === 'duel'
      ? gagnant === null
        ? 'Égalité parfaite !'
        : `${players[gagnant]} remporte le duel !`
      : mode === 'rogue'
        ? 'Run terminée !'
        : mode === 'quotidien'
          ? `Quizz du jour du ${niveau} terminé !`
          : 'Partie terminée';
  return (
    <div className="ecran-centre">
      <div className="resultat">
        {mode === 'duel' ? (
          <>
            <h2>{title}</h2>
            <div className="scores-duel">
              {players.map((j, i) => (
                <div
                  key={j}
                  className={i === gagnant ? 'score-joueur gagnant' : 'score-joueur'}
                  style={{
                    borderColor: theme.couleur,
                  }}
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
            {/* Score et « Nouveau record » forment une seule section */}
            <div className="bloc-score">
              <div className="gros-score">
                {scores[0]} <span>pts</span>
              </div>
              {nouveauRecord && (
                <div className="record">
                  <Icon nom="bolt" taille={16} /> Nouveau record !
                  {recordAvant > 0 ? ` (avant : ${recordAvant} pts)` : ''}
                </div>
              )}
            </div>
            {mode === 'quotidien' && dailyStreak > 0 && (
              <div className="streak-jour gros">
                <Icon nom="bolt" taille={20} /> Série de {dailyStreak} jour
                {dailyStreak > 1 ? 's' : ''} consécutif{dailyStreak > 1 ? 's' : ''} !
              </div>
            )}
          </>
        )}

        {mode === 'duel' && nouveauRecord && (
          <div className="record">
            <Icon nom="bolt" taille={16} /> Nouveau record !
            {recordAvant > 0 ? ` (avant : ${recordAvant} pts)` : ''}
          </div>
        )}
        {mode !== 'duel' && (
          <ResultTiles
            mode={mode}
            bonnes={bonnes[0]}
            total={total}
            avgTime={gameStats.avgTime}
            meilleureSerie={gameStats.meilleureSerie}
          />
        )}

        {mode === 'rogue' && relics && relics.length > 0 && (
          <div className="resultat-reliques">
            <div className="resultat-reliques-titre">
              <Icon nom="gem" taille={18} /> Tes reliques ({relics.length})
            </div>
            <div className="resultat-reliques-liste">
              {relics.map((id) => {
                const r = RELICS.find((x) => x.id === id);
                if (!r) return null;
                return (
                  <span
                    key={id}
                    className="relique-puce grosse"
                    style={{ borderColor: RARETE_COULEUR[r.rarete] }}
                    title={`${r.nom} — ${r.desc} (${r.rarete})`}
                  >
                    <Icon nom={r.icone} taille={18} />
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="resultat-record">
          <span>
            <Icon nom="trophy" taille={22} /> Record : <strong>{record} pts</strong>
          </span>
          {!isGuest && rang !== null && rang <= 10 && (
            <span className="resultat-top10">
              <Icon nom="podium" taille={20} /> Top 10 · #{rang}
            </span>
          )}
        </div>

        {!isGuest && <ResultXp globalXp={globalXp} themeXp={themeXp} themes={themes} />}

        {isGuest && (
          <p className="info-mix">
            <Icon nom="user" taille={15} /> Mode invité : aucune XP, aucun badge, aucun titre et
            aucun classement n'est enregistré. Crée un compte pour tout conserver entre tes parties.
          </p>
        )}

        <div className="actions">
          {mode !== 'quotidien' && (
            <button className="btn-principal" onClick={onReplay}>
              <Icon nom="replay" taille={20} /> Rejouer
            </button>
          )}
          {mode === 'quotidien' && (
            <>
              <button className="btn-secondaire" onClick={() => share.setShareOpen(true)}>
                <Icon nom="share" taille={18} /> Partager mon résultat
              </button>
              <p className="info-mix">
                <Icon nom="calendar" taille={15} /> Une seule tentative par jour — reviens demain
                pour un nouveau quizz !
              </p>
            </>
          )}
          <button className="btn-secondaire" onClick={onHome}>
            <Icon nom="home" taille={18} /> Accueil
          </button>
        </div>

        {share.shareOpen && mode === 'quotidien' && <ShareModal share={share} />}
      </div>
    </div>
  );
}
