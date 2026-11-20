import { useEffect, useMemo, useState } from 'react';

import Icone from './Icone.jsx';

import {
  chargerRecords,
  sauverRecord,
  cleRecord,
  nomNiveau,
  ajouterPartie,
  ajouterXP,
  chargerXP,
  niveauTheme,
  xpPourNiveau,
  chargerParties,
  enregistrerStreakJour,
} from '@lib/index.js';

import { jouerSon, vibrer } from '../lib/sons.js';

import { textePartage, urlApp, liensPartage, imageStory, partagerNatif, copierPressePapier } from '../lib/partage.js';

// Écran des résultats : score final, record, gagnant en mode duel,
// XP gagnée par thème + XP globale du compte (avec barres de progression),
// position au leaderboard si top 10, et bouton Rejouer (nouvelles questions
// garanties différentes de la série précédente).

// Pourcentage de progression dans le niveau actuel (courbe racine carrée).
function pctNiveau(xp) {
  const niv = niveauTheme(xp);
  const base = xpPourNiveau(niv);
  const next = xpPourNiveau(niv + 1);
  return Math.min(100, Math.max(0, Math.round(((xp - base) / (next - base)) * 100)));
}

export default function Resultat({ resultat, prefs, themes, estInvite, onRejouer, onAccueil }) {
  const { mode, niveau, theme, joueurs, scores, bonnes, total, details } = resultat;
  const cle = cleRecord(mode, niveau, theme.id);
  const [record, setRecord] = useState(0);
  const [recordAvant, setRecordAvant] = useState(0); // record avant cette partie (pour comparaison)
  const [nouveauRecord, setNouveauRecord] = useState(false);
  const [xpTheme, setXpTheme] = useState([]); // [{ themeId, gain, nivAvant, nivApres, pct }]
  const [xpGlobal, setXpGlobal] = useState({ avant: 0, apres: 0, gain: 0 });
  const [rang, setRang] = useState(null); // position au leaderboard du mode (1 = premier)
  const [streakJour, setStreakJour] = useState(0); // série de jours du quizz du jour (éclair)
  const [partageOuvert, setPartageOuvert] = useState(false);
  const [messagePartage, setMessagePartage] = useState('');

  useEffect(() => {
    const valeur = mode === 'duel' ? Math.max(...scores) : scores[0];
    const avant = chargerRecords()[cle] || 0;
    const estRecord = valeur > avant && valeur > 0;
    setNouveauRecord(estRecord);
    setRecordAvant(avant);
    setRecord(sauverRecord(cle, valeur));
    if (estRecord) { jouerSon('record', prefs); vibrer([60, 60, 120], prefs); }
    else jouerSon('fin', prefs);
    // Historique de la partie (alimente le leaderboard ET les statistiques perso)
    // Mode invité : rien n'est enregistré (pas de leaderboard, pas de stats, pas de "déjà joué" du jour).
    if (!estInvite) ajouterPartie({
      mode,
      niveau,
      themeId: theme.id,
      themeNom: theme.nom,
      total,
      details: details || [],
      joueurs: joueurs.map((nom, i) => ({ nom, score: scores[i], bonnes: bonnes[i] })),
    });

    // XP gagnée : par thème grâce au détail question par question,
    // sinon le score total est crédité au thème de la partie.
    // Mode invité : aucune XP (ni compte ni thème) n'est enregistrée.
    if (!estInvite) {
    const xpAvant = chargerXP();
    const parTheme = {};
    if (details && details.length > 0) {
      for (const d of details) parTheme[d.themeId] = (parTheme[d.themeId] || 0) + (d.gain || 0);
    } else {
      parTheme[theme.id] = scores.reduce((a, b) => a + b, 0);
    }
    const lignes = [];
    for (const [themeId, gain] of Object.entries(parTheme)) {
      if (!gain) continue;
      const av = xpAvant[themeId] || 0;
      ajouterXP(themeId, gain);
      const ap = av + gain;
      lignes.push({
        themeId,
        gain,
        nivAvant: niveauTheme(av),
        nivApres: niveauTheme(ap),
        pct: pctNiveau(ap),
      });
    }
    setXpTheme(lignes);
    const globAvant = Object.values(xpAvant).reduce((a, b) => a + (b || 0), 0);
    const gainTotal = lignes.reduce((a, l) => a + l.gain, 0);
    setXpGlobal({ avant: globAvant, apres: globAvant + gainTotal, gain: gainTotal });
    }

    // Position au leaderboard du mode (top 20 affiché dans Classement) :
    // on compte combien de scores sont strictement meilleurs que le nôtre.
    // Mode invité : pas de leaderboard.
    if (!estInvite) {
    const lignesLB = [];
    for (const p of chargerParties()) {
      if (p.mode !== mode) continue;
      if (mode === 'solo' && p.niveau !== niveau) continue; // survie : tous niveaux mélangés
      for (const j of p.joueurs || []) lignesLB.push(j.score);
    }
    lignesLB.sort((a, b) => b - a);
    if (valeur > 0) setRang(lignesLB.filter((s) => s > valeur).length + 1);
    }

    // Série de jours du quizz du jour (logo éclair, façon Snapchat)
    if (mode === 'quotidien') setStreakJour(enregistrerStreakJour().compte);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stats de cette partie : temps moyen par question + meilleure série (streak)
  const statsPartie = useMemo(() => {
    const ds = (details || []).filter((d) => typeof d.secondes === 'number');
    const tempsMoyen = ds.length ? Math.round((ds.reduce((a, d) => a + d.secondes, 0) / ds.length) * 10) / 10 : null;
    const meilleureSerie = (details || []).reduce((m, d) => Math.max(m, d.streak || 0), 0);
    return { tempsMoyen, meilleureSerie };
  }, [details]);

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

  // --- Partage du résultat du quizz du jour ---
  const textePartageJour = textePartage({
    pseudo: joueurs[0],
    date: niveau,
    score: scores[0],
    bonnes: bonnes[0],
    total,
    streak: streakJour,
  });

  async function partagerVers(nom) {
    const url = urlApp();
    const liens = liensPartage(textePartageJour, url);
    setMessagePartage('');
    if (nom === 'natif') {
      const ok = await partagerNatif({ texte: textePartageJour, url });
      if (!ok) setMessagePartage('Partage natif indisponible ici — copie le texte plutôt.');
      return;
    }
    if (nom === 'copier') {
      const ok = await copierPressePapier(`${textePartageJour} ${url}`);
      setMessagePartage(ok ? 'Résultat copié dans le presse-papiers.' : 'Copie impossible.');
      return;
    }
    if (nom === 'x') { window.open(liens.x, '_blank', 'noopener'); return; }
    if (nom === 'facebook') { window.open(liens.facebook, '_blank', 'noopener'); return; }
    if (nom === 'whatsapp') { window.open(liens.whatsapp, '_blank', 'noopener'); return; }
    if (nom === 'messenger') {
      await copierPressePapier(`${textePartageJour} ${url}`);
      window.open(liens.messengerApp, '_blank', 'noopener');
      setTimeout(() => window.open(liens.messenger, '_blank', 'noopener'), 500);
      setMessagePartage('Texte copié — colle-le dans ta conversation Messenger.');
      return;
    }
    if (nom === 'instagram' || nom === 'tiktok' || nom === 'story') {
      // Image "story" générée en direct, puis feuille de partage native (story, amis...)
      const fichier = await imageStory({
        pseudo: joueurs[0], date: niveau, score: scores[0], bonnes: bonnes[0], total, streak: streakJour,
      });
      const ok = await partagerNatif({ texte: textePartageJour, url, fichier });
      if (ok) return;
      // repli : on télécharge l'image + on copie le texte
      const a = document.createElement('a');
      a.href = URL.createObjectURL(fichier);
      a.download = fichier.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      await copierPressePapier(`${textePartageJour} ${url}`);
      setMessagePartage('Image story téléchargée + texte copié : publie-la toi-même sur ' + (nom === 'tiktok' ? 'TikTok' : nom === 'instagram' ? 'Instagram' : 'ta story') + '.');
    }
  }

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
              <button className="btn-secondaire" onClick={() => setPartageOuvert(true)}>
                <Icone nom="share" taille={18} /> Partager mon résultat
              </button>
              <p className="info-mix"><Icone nom="calendar" taille={15} /> Une seule tentative par jour — reviens demain pour un nouveau quizz !</p>
            </>
          )}
          <button className="btn-secondaire" onClick={onAccueil}>
            <Icone nom="home" taille={18} /> Accueil
          </button>
        </div>

        {partageOuvert && mode === 'quotidien' && (
          <div className="modal-overlay" onClick={() => setPartageOuvert(false)} style={{ position: 'fixed' }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-titre">
                <h2><Icone nom="share" taille={22} /> Partager mon résultat</h2>
                <button className="btn-suppr" onClick={() => setPartageOuvert(false)} title="Fermer">
                  <Icone nom="x" taille={18} />
                </button>
              </div>
              <p className="vide" style={{ marginBottom: 10 }}>{textePartageJour}</p>
              <div className="partage-liste">
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button className="btn-principal" onClick={() => partagerVers('natif')}>
                    <Icone nom="share" taille={18} /> Partager… (story, amis, apps installées)
                  </button>
                )}
                <button className="btn-secondaire" onClick={() => partagerVers('x')}>X (Twitter)</button>
                <button className="btn-secondaire" onClick={() => partagerVers('facebook')}>Facebook</button>
                <button className="btn-secondaire" onClick={() => partagerVers('whatsapp')}>WhatsApp</button>
                <button className="btn-secondaire" onClick={() => partagerVers('messenger')}>Messenger</button>
                <button className="btn-secondaire" onClick={() => partagerVers('instagram')}>Instagram (story)</button>
                <button className="btn-secondaire" onClick={() => partagerVers('tiktok')}>TikTok</button>
                <button className="btn-secondaire" onClick={() => partagerVers('story')}>Ma story (image)</button>
                <button className="btn-secondaire" onClick={() => partagerVers('copier')}>
                  <Icone nom="download" taille={16} /> Copier le résultat
                </button>
              </div>
              {messagePartage && <p className="info-mix" style={{ marginTop: 10 }}>{messagePartage}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
