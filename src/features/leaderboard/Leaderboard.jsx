import { useMemo, useState } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { loadGames } from '@lib/game-history.js';
import { levelName, LEVELS } from '@lib/scoring.js';
import { isThisWeek } from '@lib/dates.js';

// Leaderboard local : UNIQUEMENT les classements par mode de jeu, avec pour chaque
// ligne le thème, la difficulté et le nombre de points.
//  - Solo : filtre par niveau (Tous / Facile / Moyen / Difficile)
//  - Duel 1v1, Survie, Quizz du jour : top scores de l'historique des parties
// (les stats personal détaillées sont dans l'écran « Mes statistiques »)

const RANK_COLORS = ['#fde047', '#cbd5e1', '#fbbf24'];
const TABS = [
  {
    id: 'solo',
    nom: 'Solo',
    icone: 'timer',
  },
  {
    id: 'duel',
    nom: 'Duel 1v1',
    icone: 'swords',
  },
  {
    id: 'survie',
    nom: 'Survie',
    icone: 'skull',
  },
  {
    id: 'quotidien',
    nom: 'Quizz du jour',
    icone: 'calendar',
  },
];
export default function Leaderboard({ themes, onHome: onHome, onStats }) {
  const [tab, setTab] = useState('solo');
  const [niveauSolo, setSoloLevel] = useState('tous'); // filtre de l'onglet Solo
  const [periode, setPeriode] = useState('tout'); // 'tout' | 'semaine' (classement hebdo)
  const games = useMemo(() => loadGames(), []);

  // --- Lignes de classement pour un mode donné (depuis l'historique des parties) ---
  const modeRows = useMemo(() => {
    const rows = [];
    for (const p of games) {
      if (p.mode !== tab) continue;
      if (periode === 'semaine' && !isThisWeek(p.date)) continue; // classement de la semaine
      if (tab === 'solo' && niveauSolo !== 'tous' && p.niveau !== niveauSolo) continue;
      const theme = themes.find((t) => t.id === p.themeId);
      for (const j of p.players || []) {
        rows.push({
          key: `${p.id}-${j.nom}`,
          nom: j.nom,
          score: j.score,
          bonnes: j.bonnes,
          total: p.total,
          themeName: p.themeId === 'tous' ? 'Tous les thèmes' : theme ? theme.nom : p.themeName,
          themeColor: theme ? theme.couleur : '#8b5cf6',
          themeIcon: theme ? theme.icone : 'sparkles',
          niveau: p.niveau,
          date: p.date,
        });
      }
    }
    return rows.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [games, tab, niveauSolo, periode, themes]);
  function labelMode(mode, niveau) {
    if (mode === 'solo') return `solo · ${levelName(niveau)}`;
    if (mode === 'duel') return 'duel 1v1';
    if (mode === 'survie') return `survie · ${levelName(niveau)}`;
    if (mode === 'quotidien') return `quizz du ${niveau}`;
    return mode;
  }
  function rowDetail(l) {
    if (tab === 'solo' || tab === 'duel') {
      return `${labelMode(tab, l.niveau)} · ${l.bonnes}/${l.total} bonnes`;
    }
    if (tab === 'survie') return `survie · ${levelName(l.niveau)} · série de ${l.bonnes}`;
    if (tab === 'quotidien') return `quizz du ${l.niveau} · ${l.bonnes}/${l.total} bonnes`;
    return '';
  }
  const isGameMode = ['solo', 'duel', 'survie', 'quotidien'].includes(tab);
  return (
    <div className="classement">
      <header className="hero">
        <div
          className="logo"
          style={{
            fontSize: '1.9rem',
          }}
        >
          <span
            className="logo-marque"
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
            }}
          >
            <Icon nom="podium" taille={26} />
          </span>
          Classement
        </div>
        <p className="tagline">Un classement par mode de jeu, enregistré localement sur ce PC.</p>
      </header>

      <div className="onglets">
        {TABS.map((o) => (
          <button
            key={o.id}
            className={tab === o.id ? 'onglet actif' : 'onglet'}
            onClick={() => setTab(o.id)}
          >
            <Icon nom={o.icone} taille={15} /> {o.nom}
          </button>
        ))}
      </div>

      <div className="filtres-niveau">
        {[
          {
            id: 'tout',
            nom: 'Tout l’historique',
          },
          {
            id: 'semaine',
            nom: 'Cette semaine',
          },
        ].map((p) => (
          <button
            key={p.id}
            className={periode === p.id ? 'filtre actif' : 'filtre'}
            onClick={() => setPeriode(p.id)}
          >
            {p.nom}
          </button>
        ))}
      </div>

      {tab === 'solo' && (
        <div className="filtres-niveau">
          {[
            {
              id: 'tous',
              nom: 'Tous niveaux',
            },
            ...LEVELS,
          ].map((n) => (
            <button
              key={n.id}
              className={niveauSolo === n.id ? 'filtre actif' : 'filtre'}
              onClick={() => setSoloLevel(n.id)}
            >
              {n.nom}
            </button>
          ))}
        </div>
      )}

      {isGameMode &&
        (modeRows.length === 0 ? (
          <p className="vide">
            {periode === 'semaine' &&
              'Aucune partie cette semaine — le classement hebdo se remplit dès ta prochaine partie. '}
            {tab === 'solo'
              ? `Aucune partie solo${niveauSolo !== 'tous' ? ` au niveau ${levelName(niveauSolo)}` : ''}${periode === 'tout' ? ' enregistrée pour l’instant.' : ''}`
              : periode === 'tout' &&
                `Aucune partie ${TABS.find((o) => o.id === tab)?.nom.toLowerCase()} enregistrée pour l’instant.`}
          </p>
        ) : (
          <ul className="liste-classement">
            {modeRows.map((l, i) => (
              <li key={l.key} className="ligne-classement">
                <span
                  className="rang"
                  style={{
                    color: RANK_COLORS[i] || 'var(--texte-doux)',
                  }}
                >
                  {i + 1}
                </span>
                <span className="lc-nom">{l.nom}</span>
                <span
                  className="lc-theme"
                  style={{
                    '--couleur': l.themeColor,
                  }}
                  title={l.themeName}
                >
                  <Icon nom={l.themeIcon} taille={14} />
                  <span className="lc-theme-nom">{l.themeName}</span>
                </span>
                <span className="lc-detail">{rowDetail(l)}</span>
                <span className="lc-score">{l.score} pts</span>
              </li>
            ))}
          </ul>
        ))}

      <button className="btn-secondaire" onClick={onStats}>
        <Icon nom="chart" taille={18} /> Mes statistiques
      </button>
      <button className="btn-secondaire" onClick={onHome}>
        <Icon nom="home" taille={18} /> Accueil
      </button>
    </div>
  );
}
