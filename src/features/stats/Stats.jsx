import { useMemo } from 'react';

import Icone from '@shared/ui/Icone.jsx';

import { chargerParties, chargerXP, xpPourNiveau } from '@lib/index.js';

import {
  calculerStats,
  calculerCalendrier,
  calculerTempsMoyen,
  calculerXpGlobale,
  classerThemesParXp,
} from './statsCalculs.js';

// Écran « Mes statistiques » : bilan global, par mode, par thème, par difficulté, XP,
// calendrier d'activité et courbe de progression.
// Tous les calculs sont dans statsCalculs.js (fonctions pures) ; ici il n'y a que du rendu.

const MODES = [
  { id: 'solo', nom: 'Solo', icone: 'timer' },
  { id: 'duel', nom: 'Duel 1v1', icone: 'swords' },
  { id: 'survie', nom: 'Survie', icone: 'skull' },
  { id: 'quotidien', nom: 'Quizz du jour', icone: 'calendar' },
];

export default function Stats({ themes, pseudo, onAccueil }) {
  const parties = useMemo(() => chargerParties(), []);
  const xp = useMemo(() => chargerXP(), []);

  const stats = useMemo(() => calculerStats(parties), [parties]);
  const calendrier = useMemo(() => calculerCalendrier(parties), [parties]);
  const tempsMoyen = useMemo(() => calculerTempsMoyen(parties), [parties]);
  const { xpTotal, nivGlobal, xpNext, pctXp } = useMemo(() => calculerXpGlobale(xp), [xp]);
  const themesNives = useMemo(() => classerThemesParXp(themes, xp), [themes, xp]);

  return (
    <div className="ecran-centre stats-ecran">
      <div className="stats">
        <div className="stats-titre">
          <h2><Icone nom="chart" taille={24} /> Mes statistiques — {pseudo}</h2>
          <button className="btn-secondaire" onClick={onAccueil}>
            <Icone nom="home" taille={18} /> Accueil
          </button>
        </div>

        <section className="stats-cartes">
          <div className="stat-carte">
            <div className="stat-valeur">{stats.parties}</div>
            <div className="stat-label">parties jouées</div>
          </div>
          <div className="stat-carte">
            <div className="stat-valeur">{stats.repondues}</div>
            <div className="stat-label">questions répondues</div>
          </div>
          <div className="stat-carte">
            <div className="stat-valeur">{stats.pct} %</div>
            <div className="stat-label">de réussite</div>
          </div>
          <div className="stat-carte">
            <div className="stat-valeur">{stats.points}</div>
            <div className="stat-label">points cumulés</div>
          </div>
          {tempsMoyen !== null && (
            <div className="stat-carte">
              <div className="stat-valeur">{tempsMoyen} s</div>
              <div className="stat-label">temps de réaction moyen</div>
            </div>
          )}
        </section>

        <section>
          <h3 className="titre-section">Activité — {calendrier.nomMois}</h3>
          <div className="calendrier">
            <div className="cal-ligne cal-entetes">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => (
                <span key={i} className="cal-entete">{l}</span>
              ))}
            </div>
            {calendrier.semaines.map((s, wi) => (
              <div key={wi} className="cal-ligne">
                {s.map((j, ji) =>
                  j === null ? (
                    <span key={`vide-${wi}-${ji}`} className="cal-case cal-vide" />
                  ) : (
                    <span
                      key={j.cle}
                      className={j.futur ? 'cal-case cal-futur' : `cal-case cal-n${j.niveau}`}
                      title={`${j.cle} : ${j.n} partie(s)`}
                    >
                      {j.jour}
                    </span>
                  )
                )}
              </div>
            ))}
          </div>
          <p className="vide">Chaque case = un jour du mois en cours. Plus c’est plein, plus tu as joué ce jour-là.</p>
        </section>

        <section>
          <h3 className="titre-section">Points marqués — 30 derniers jours</h3>
          <div className="barres">
            {calendrier.jours30.map((j) => (
              <span
                key={j.cle}
                className="barre"
                style={{ height: `${Math.round((j.points / calendrier.maxPoints) * 100)}%` }}
                data-label={`${j.points} pts · ${j.parties} partie(s)`}
                title={`${j.cle} : ${j.points} pts · ${j.parties} partie(s)`}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 className="titre-section">Ma progression (XP)</h3>
          <div className="xp-globale">
            <div className="xp-globale-haut">
              <span>Niveau global <strong>{nivGlobal}</strong></span>
              <span>{xpTotal} XP · prochain niveau à {xpNext} XP</span>
            </div>
            <span className="user-xpbar grosse">
              <i style={{ width: `${pctXp}%` }} />
            </span>
          </div>
          {themesNives.length > 0 && (
            <ul className="stats-themes">
              {themesNives.map((t) => {
                const xpN = xpPourNiveau(t.niv);
                const xpS = xpPourNiveau(t.niv + 1);
                const pct = Math.min(100, Math.round(((t.xp - xpN) / Math.max(1, xpS - xpN)) * 100));
                return (
                  <li key={t.id} className="stats-theme">
                    <span className="stats-theme-nom" style={{ '--couleur': t.couleur }}>
                      <Icone nom={t.icone} taille={16} /> {t.nom}
                    </span>
                    <span className="stats-theme-barre">
                      <i style={{ width: `${pct}%`, background: t.couleur }} />
                    </span>
                    <span className="stats-theme-niv">Niv. {t.niv} · {t.xp} XP</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h3 className="titre-section">Par mode de jeu</h3>
          <ul className="stats-liste">
            {MODES.map((m) => {
              const s = stats.parMode[m.id];
              return (
                <li key={m.id} className="stats-ligne">
                  <span className="stats-ligne-nom"><Icone nom={m.icone} taille={17} /> {m.nom}</span>
                  <span className="stats-ligne-val">
                    {s ? `${s.parties} partie(s) · meilleur score ${s.meilleur} pts` : 'pas encore joué'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {stats.parThemeListe.length > 0 && (
          <section>
            <h3 className="titre-section">Par thème</h3>
            <ul className="stats-liste">
              {stats.parThemeListe.map((t) => (
                <li key={t.id} className="stats-ligne">
                  <span className="stats-ligne-nom">{t.nom}</span>
                  <span className="stats-ligne-val">
                    {t.correctes}/{t.jouées} bonnes réponses · {t.pct} %
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stats.parNiveauListe.length > 0 && (
          <section>
            <h3 className="titre-section">Par niveau de difficulté</h3>
            <ul className="stats-liste">
              {stats.parNiveauListe.map((n) => (
                <li key={n.id} className="stats-ligne">
                  <span className="stats-ligne-nom" style={{ color: n.couleur }}>{n.nom}</span>
                  <span className="stats-ligne-val">
                    {n.correctes}/{n.jouées} bonnes réponses · {n.pct} %
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stats.parties === 0 && (
          <p className="vide">Aucune partie pour le moment — lance un quiz depuis l'accueil et tes stats apparaîtront ici.</p>
        )}
      </div>
    </div>
  );
}
