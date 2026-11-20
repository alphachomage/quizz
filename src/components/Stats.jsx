import { useMemo } from 'react';

import Icone from './Icone.jsx';

import {
  chargerParties,
  chargerXP,
  niveauTheme,
  xpPourNiveau,
  nomNiveau,
  cleRecord,
  NIVEAUX,
  cleJourLocal,
} from '@lib/index.js';

// Écran « Mes statistiques » : bilan global, par mode, par thème, par difficulté, XP,
// calendrier d'activité et courbe de progression.
// Tout est calculé à partir de l'historique local des parties.

const MODES = [
  { id: 'solo', nom: 'Solo', icone: 'timer' },
  { id: 'duel', nom: 'Duel 1v1', icone: 'swords' },
  { id: 'survie', nom: 'Survie', icone: 'skull' },
  { id: 'quotidien', nom: 'Quizz du jour', icone: 'calendar' },
];

export default function Stats({ themes, pseudo, onAccueil }) {
  const parties = useMemo(() => chargerParties(), []);
  const xp = useMemo(() => chargerXP(), []);

  const stats = useMemo(() => {
    let repondues = 0;
    let bonnes = 0;
    let points = 0;
    const parMode = {};
    const parTheme = {}; // themeId -> { nom, jouées, correctes }
    const parNiveau = {}; // 'facile'|'moyen'|'dur' -> { jouées, correctes }

    for (const p of parties) {
      const nbJ = (p.joueurs || []).length || 1;
      repondues += (p.total || 0) * nbJ;
      for (const j of p.joueurs || []) {
        bonnes += j.bonnes || 0;
        points += j.score || 0;
      }
      const m = parMode[p.mode] || (parMode[p.mode] = { parties: 0, meilleur: 0 });
      m.parties += 1;
      m.meilleur = Math.max(m.meilleur, ...(p.joueurs || []).map((j) => j.score || 0));

      if (Array.isArray(p.details) && p.details.length > 0) {
        for (const d of p.details) {
          const t = parTheme[d.themeId] || (parTheme[d.themeId] = { nom: d.themeNom || d.themeId, jouées: 0, correctes: 0 });
          t.jouées += 1;
          if (d.correct) t.correctes += 1;
          // % de réussite par difficulté (on ignore le quizz du jour dont le "niveau" est une date)
          if (NIVEAUX.some((n) => n.id === d.niveau)) {
            const nv = parNiveau[d.niveau] || (parNiveau[d.niveau] = { jouées: 0, correctes: 0 });
            nv.jouées += 1;
            if (d.correct) nv.correctes += 1;
          }
        }
      } else {
        const t = parTheme[p.themeId] || (parTheme[p.themeId] = { nom: p.themeNom || p.themeId, jouées: 0, correctes: 0 });
        t.jouées += (p.total || 0) * nbJ;
        t.correctes += (p.joueurs || []).reduce((a, j) => a + (j.bonnes || 0), 0);
        if (NIVEAUX.some((n) => n.id === p.niveau)) {
          const nv = parNiveau[p.niveau] || (parNiveau[p.niveau] = { jouées: 0, correctes: 0 });
          nv.jouées += (p.total || 0) * nbJ;
          nv.correctes += (p.joueurs || []).reduce((a, j) => a + (j.bonnes || 0), 0);
        }
      }
    }

    const parThemeListe = Object.entries(parTheme)
      .map(([id, v]) => ({ id, ...v, pct: v.jouées ? Math.round((v.correctes / v.jouées) * 100) : 0 }))
      .sort((a, b) => b.jouées - a.jouées);

    // Par difficulté, dans l'ordre Facile / Moyen / Difficile
    const parNiveauListe = NIVEAUX
      .map((n) => {
        const v = parNiveau[n.id] || { jouées: 0, correctes: 0 };
        return { id: n.id, nom: n.nom, couleur: n.couleur, ...v, pct: v.jouées ? Math.round((v.correctes / v.jouées) * 100) : 0 };
      })
      .filter((v) => v.jouées > 0);

    return {
      parties: parties.length,
      repondues,
      bonnes,
      pct: repondues ? Math.round((bonnes / repondues) * 100) : 0,
      points,
      parMode,
      parThemeListe,
      parNiveauListe,
    };
  }, [parties]);

  // --- Stats avancées : calendrier d'activité (12 semaines) + courbe des points (30 jours) ---
  const calendrier = useMemo(() => {
    const parJour = {};
    const parJourPoints = {};
    for (const p of parties) {
      if (!p.date) continue;
      const cle = cleJourLocal(new Date(p.date));
      parJour[cle] = (parJour[cle] || 0) + 1;
      parJourPoints[cle] = (parJourPoints[cle] || 0) + (p.joueurs || []).reduce((a, j) => a + (j.score || 0), 0);
    }
    const now = new Date();
    const annee = now.getFullYear();
    const mois = now.getMonth();
    const nbJours = new Date(annee, mois + 1, 0).getDate(); // nb de jours dans le mois en cours
    const premier = new Date(annee, mois, 1);
    const decalage = (premier.getDay() + 6) % 7; // 0 = lundi en première colonne
    // grille du mois en cours : lignes de semaines, cases vides avant le 1er
    const semaines = [];
    let semaine = new Array(decalage).fill(null);
    for (let j = 1; j <= nbJours; j++) {
      const d = new Date(annee, mois, j);
      const cle = cleJourLocal(d);
      const n = parJour[cle] || 0;
      semaine.push({ cle, n, jour: j, futur: d > now, niveau: n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3 });
      if (semaine.length === 7) { semaines.push(semaine); semaine = []; }
    }
    if (semaine.length > 0) { semaines.push(semaine); }
    const jours30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() - i);
      const cle = cleJourLocal(d);
      jours30.push({ cle, points: parJourPoints[cle] || 0, parties: parJour[cle] || 0 });
    }
    const nomMois = new Date(annee, mois, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    return { semaines, jours30, maxPoints: Math.max(1, ...jours30.map((j) => j.points)), nomMois };
  }, [parties]);

  // Temps de réaction moyen (champ "secondes" des détails, parties récentes)
  const tempsMoyen = useMemo(() => {
    let somme = 0;
    let n = 0;
    for (const p of parties) {
      for (const d of p.details || []) {
        if (typeof d.secondes === 'number') { somme += d.secondes; n++; }
      }
    }
    return n ? Math.round((somme / n) * 10) / 10 : null;
  }, [parties]);

  const xpTotal = Object.values(xp).reduce((a, b) => a + b, 0);
  const nivGlobal = niveauTheme(xpTotal);
  const xpNiv = xpPourNiveau(nivGlobal);
  const xpNext = xpPourNiveau(nivGlobal + 1);
  const pctXp = Math.min(100, Math.round(((xpTotal - xpNiv) / Math.max(1, xpNext - xpNiv)) * 100));

  const themesNives = themes
    .map((t) => ({ ...t, xp: xp[t.id] || 0, niv: niveauTheme(xp[t.id] || 0) }))
    .filter((t) => t.xp > 0)
    .sort((a, b) => b.xp - a.xp);

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
