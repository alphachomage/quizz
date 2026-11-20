// Toute la logique du jeu est centralisée ici :
// niveaux de difficulté, mélange, points, minuteur, records.

export const TEMPS_PAR_QUESTION = 10; // secondes par question
export const QUESTIONS_SOLO = 10; // plafond de questions en solo (le pool réel peut être plus court)
export const QUESTIONS_DUEL = 6; // nombre de questions PAR JOUEUR en mode duel

export const QUESTIONS_QUOTIDIEN = 10; // questions du quizz du jour

export const QUESTIONS_SURVIE_MAX = 30; // plafond de questions en mode survie (la partie s'arrête à la 1re faute)

// --- Préférences d'affichage (sons / animations / vibrations) ---
// Stockées dans localStorage, activées par défaut, modifiables dans les paramètres.

const CLE_PREFS = 'voltquiz_prefs';

export function chargerPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(CLE_PREFS)) || {};
    return {
      sons: p.sons !== false,
      musique: p.musique !== false, // musique de fond (toggle séparé, ON par défaut)
      animations: p.animations !== false,
      vibrations: p.vibrations !== false,
      // Accessibilité : thème clair, mode daltonien, mode dys (tous OFF par défaut)
      themeClair: p.themeClair === true,
      daltonien: p.daltonien === true,
      dys: p.dys === true,
    };
  } catch {
    return { sons: true, musique: true, animations: true, vibrations: true, themeClair: false, daltonien: false, dys: false };
  }
}

export function sauverPrefs(prefs) {
  localStorage.setItem(CLE_PREFS, JSON.stringify({
    sons: prefs.sons !== false,
    musique: prefs.musique !== false,
    animations: prefs.animations !== false,
    vibrations: prefs.vibrations !== false,
    themeClair: prefs.themeClair === true,
    daltonien: prefs.daltonien === true,
    dys: prefs.dys === true,
  }));
}

// --- Quizz du jour ---
// Le même quizz pour tout le monde le même jour : le tirage dépend uniquement de la date.

// Date du jour au format AAAA-MM-JJ (heure locale).
export function dateAujourdhui() {
  const d = new Date();
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${a}-${m}-${j}`;
}

// --- Série de jours du quizz du jour (façon Snapchat, mais avec un éclair) ---
// { compte: N, dernierJour: 'AAAA-MM-JJ' } — +1 si joué hier, sinon recommence à 1.
const CLE_STREAK_JOUR = 'voltquiz_streak_quotidien';

function dateJour(offsetJours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetJours);
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${a}-${m}-${j}`;
}

export function chargerStreakJour() {
  try {
    return JSON.parse(localStorage.getItem(CLE_STREAK_JOUR)) || { compte: 0, dernierJour: null };
  } catch {
    return { compte: 0, dernierJour: null };
  }
}

// Pour l'affichage : si le dernier jour joué est antérieur à hier, la série est rompue.
export function streakJourActuelle() {
  const s = chargerStreakJour();
  if (!s.dernierJour || s.dernierJour < dateJour(-1)) return { compte: 0, dernierJour: s.dernierJour };
  return s;
}

// Appelé à la fin d'une partie "quizz du jour" : incrémente la série si joué hier.
export function enregistrerStreakJour() {
  const aujourdhui = dateAujourdhui();
  const hier = dateJour(-1);
  const s = chargerStreakJour();
  let compte = 1;
  if (s.dernierJour === hier) compte = (s.compte || 0) + 1;
  else if (s.dernierJour === aujourdhui) compte = s.compte || 1;
  const nouveau = { compte, dernierJour: aujourdhui };
  localStorage.setItem(CLE_STREAK_JOUR, JSON.stringify(nouveau));
  return nouveau;
}

// Hachage simple d'un texte en nombre (pour rendre le tirage du jour déterministe).
export function hashTexte(texte) {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Générateur pseudo-aléatoire déterministe (mulberry32) : même graine = même tirage.
export function generateurGraine(graine) {
  let a = graine >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mélange déterministe (Fisher-Yates avec le générateur fourni).
export function melangerSeed(tableau, rand) {
  const t = [...tableau];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

// Tirage du quizz du jour : 10 questions parmi TOUS les thèmes et TOUS les niveaux,
// identique pour tout le monde le même jour (graine = hash de la date).
// Chaque question repart avec ses réponses mélangées (mélange aussi seedé).
export function questionsQuotidien(themes, date = dateAujourdhui()) {
  const rand = generateurGraine(hashTexte(`voltquiz-quotidien-${date}`));
  const tout = [];
  for (const t of themes) {
    for (const q of t.questions) {
      tout.push({ ...q, themeId: t.id, themeNom: t.nom, themeCouleur: t.couleur, themeIcone: t.icone });
    }
  }
  // tirage seedé MAIS diversifié : max 2 questions du même sujet et max 2 du même thème
  const tirage = tirerSerie(tout, QUESTIONS_QUOTIDIEN, 2, 2, rand);
  return tirage.map((q) => {
    const ordre = melangerSeed(q.reponses.map((_, i) => i), rand);
    return { ...q, reponses: ordre.map((i) => q.reponses[i]), bonne: ordre.indexOf(q.bonne) };
  });
}

// Les 3 niveaux de difficulté (utilisés en mode solo).
export const NIVEAUX = [
  { id: 'facile', nom: 'Facile', couleur: '#4ade80' },
  { id: 'moyen', nom: 'Moyen', couleur: '#fbbf24' },
  { id: 'dur', nom: 'Dur', couleur: '#fb7185' },
];

export function nomNiveau(id) {
  const n = NIVEAUX.find((x) => x.id === id);
  return n ? n.nom : 'Tous niveaux'; // survie = tous niveaux mélangés (clé "mix")
}

export function couleurNiveau(id) {
  const n = NIVEAUX.find((x) => x.id === id);
  return n ? n.couleur : '#a78bfa';
}

// Mélange un tableau (algorithme de Fisher-Yates), sans modifier l'original.
export function melanger(tableau) {
  const t = [...tableau];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

// --- Diversité des sujets dans une série ---
// Détecte le "sujet" d'une question : le premier groupe de mots en capitales
// (nom propre / franchise) qui n'est PAS en début de phrase,
// ex. "One Piece", "Naruto", "Dragon Ball", "Zelda".
export function sujetDe(texte) {
  const t = String(texte || '');
  const re = /[A-ZÀ-Þ][\p{L}0-9’'-]*/gu;
  const mots = [];
  let m;
  while ((m = re.exec(t)) !== null) mots.push({ w: m[0], i: m.index });
  const groupes = [];
  let cur = [];
  for (const mot of mots) {
    const prev = cur[cur.length - 1];
    if (prev && mot.i <= prev.i + prev.w.length + 2) cur.push(mot);
    else {
      if (cur.length) groupes.push(cur);
      cur = [mot];
    }
  }
  if (cur.length) groupes.push(cur);
  const g = groupes.find((gr) => gr[0].i > 0 && gr.map((x) => x.w).join(' ').replace(/[^\p{L}]/giu, '').length >= 4);
  return g ? g.map((x) => x.w).join(' ').toLowerCase() : '';
}

// Tire nb questions au hasard dans le pool en diversifiant :
// - au maximum maxParSujet questions du même SUJET détecté (ex. pas 3x One Piece),
// - au maximum maxParTheme questions du même THEME (si les questions ont un themeId,
//   ex. survie / quizz du jour : pas 5 questions de Géographie dans la même série).
// Tant qu'il reste assez de questions différentes ; sinon on complète avec le reste.
// `rand` permet un tirage déterministe (quizz du jour : même tirage pour tous le même jour).
export function tirerSerie(pool, nb, maxParSujet = 2, maxParTheme = 0, rand = Math.random) {
  const ordre = melangerSeed(pool, rand);
  const choisie = [];
  const compteSujets = new Map();
  const compteThemes = new Map();
  const reste = [];
  for (const q of ordre) {
    if (choisie.length >= nb) break;
    const s = sujetDe(q.q);
    const th = q.themeId || '';
    if (s && (compteSujets.get(s) || 0) >= maxParSujet) {
      reste.push(q);
      continue;
    }
    if (th && maxParTheme > 0 && (compteThemes.get(th) || 0) >= maxParTheme) {
      reste.push(q);
      continue;
    }
    if (s) compteSujets.set(s, (compteSujets.get(s) || 0) + 1);
    if (th) compteThemes.set(th, (compteThemes.get(th) || 0) + 1);
    choisie.push(q);
  }
  for (const q of melangerSeed(reste, rand)) {
    if (choisie.length >= nb) break;
    choisie.push(q);
  }
  return choisie;
}

// --- Score façon arcade ---
// Bonne réponse : 20 pts de base, -1 pt par seconde écoulée (minimum 10 pts).
// Faux ou temps écoulé : 0 pt. En manche bonus, les points sont doublés.
// (max solo : 8×20 + 2×40 = 240 pts)
export function pointsPour(correct, secondesEcoulees, bonus = false) {
  if (!correct) return 0;
  const base = Math.max(10, 20 - Math.floor(secondesEcoulees));
  return bonus ? base * 2 : base;
}

// --- Structure en manches ---
// Une partie = 3 manches ; la 3e manche est "bonus" (points ×2).
export function infoManche(index, total) {
  const taille = Math.ceil(total / 3);
  const manche = Math.min(3, Math.floor(index / taille) + 1);
  return { manche, bonus: manche === 3 };
}

// --- XP et niveaux par thème ---
const CLE_XP = 'voltquiz_xp';

export function chargerXP() {
  try {
    return JSON.parse(localStorage.getItem(CLE_XP)) || {};
  } catch {
    return {};
  }
}

// Ajoute de l'XP à un thème (appelé à chaque partie terminée). Retourne le nouveau total.
export function ajouterXP(themeId, montant) {
  const xp = chargerXP();
  xp[themeId] = (xp[themeId] || 0) + montant;
  localStorage.setItem(CLE_XP, JSON.stringify(xp));
  return xp[themeId];
}

// Niveau d'un thème (courbe racine) : niv. 2 à 100 XP, niv. 3 à 400 XP, niv. 4 à 900 XP...
export function niveauTheme(xp) {
  return 1 + Math.floor(Math.sqrt((xp || 0) / 100));
}

// XP total requise pour atteindre un niveau.
export function xpPourNiveau(n) {
  return 100 * (n - 1) * (n - 1);
}

// --- Anti-répétition : la dernière série de questions jouée est mémorisée ---
// par mode/niveau/thème, pour que "Rejouer" ne retombe JAMAIS sur la même série.
const CLE_SERIES = 'voltquiz_dernieres_series';

export function normaliserTexteQuestion(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleSerie(mode, niveau, themeId) {
  return `${mode}:${niveau || 'mix'}:${themeId}`;
}

// Vrai si la date ISO tombe dans la semaine en cours (lundi 00:00 -> lundi suivant 00:00).
export function dansSemaineEnCours(dateISO) {
  const d = dateISO ? new Date(dateISO) : new Date();
  if (isNaN(d)) return false;
  const maintenant = new Date();
  const lundi = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7)); // lundi de cette semaine
  const lundiProchain = new Date(lundi);
  lundiProchain.setDate(lundiProchain.getDate() + 7);
  return d >= lundi && d < lundiProchain;
}

// Clé de jour au format AAAA-MM-JJ en heure LOCALE (pour les stats / le calendrier).
export function cleJourLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function chargerSerie(cle) {
  try {
    const m = JSON.parse(localStorage.getItem(CLE_SERIES)) || {};
    return Array.isArray(m[cle]) ? m[cle] : [];
  } catch {
    return [];
  }
}

export function sauverSerie(cle, questions) {
  try {
    const m = JSON.parse(localStorage.getItem(CLE_SERIES)) || {};
    m[cle] = questions.map((q) => normaliserTexteQuestion(q.q));
    localStorage.setItem(CLE_SERIES, JSON.stringify(m));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

// Retire du pool les questions de la dernière série jouée (si ça laisse assez de questions).
export function poolSansSeriePrecedente(pool, cle, nbMin) {
  const excl = new Set(chargerSerie(cle));
  if (excl.size === 0) return pool;
  const dispo = pool.filter((q) => !excl.has(normaliserTexteQuestion(q.q)));
  return dispo.length >= nbMin ? dispo : pool;
}

// Proposer une question dans un thème demande d'y être niveau 3 (débloqueProgressif).
export const SEUIL_SOUMISSION_NIVEAU = 3;

// Les records sont stockés dans le navigateur (localStorage) :
// ils survivent à la fermeture de l'onglet, mais restent sur ce PC.
const CLE_RECORDS = 'voltquiz_records';

// Clé de record : un record par mode, par niveau (solo) et par thème.
// En duel, le niveau est "mix" (toutes difficultés confondues).
export function cleRecord(mode, niveau, themeId) {
  return `${mode}:${niveau || 'mix'}:${themeId}`;
}

export function chargerRecords() {
  try {
    return JSON.parse(localStorage.getItem(CLE_RECORDS)) || {};
  } catch {
    return {};
  }
}

// Sauvegarde le record si le score est meilleur. Retourne le record actuel.
export function sauverRecord(cle, valeur) {
  const records = chargerRecords();
  if ((records[cle] || 0) < valeur) {
    records[cle] = valeur;
    localStorage.setItem(CLE_RECORDS, JSON.stringify(records));
  }
  return records[cle] || 0;
}

// --- Questions proposées par les utilisateurs ---
// Stockées dans le navigateur (localStorage) : elles sont jouables immédiatement
// et exportables en JSON pour être ajoutées au fichier questions-utilisateur.json.
const CLE_SOUMISSIONS = 'voltquiz_soumissions';

export function chargerSoumissions() {
  try {
    return JSON.parse(localStorage.getItem(CLE_SOUMISSIONS)) || [];
  } catch {
    return [];
  }
}

// Ajoute une question proposée. q = { themeId, q, reponses, bonne, niveau, info? }
export function ajouterSoumission(q) {
  const liste = chargerSoumissions();
  const soumission = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    date: new Date().toISOString(),
    ...q,
  };
  liste.push(soumission);
  localStorage.setItem(CLE_SOUMISSIONS, JSON.stringify(liste));
  return soumission;
}

export function supprimerSoumission(id) {
  const liste = chargerSoumissions().filter((s) => s.id !== id);
  localStorage.setItem(CLE_SOUMISSIONS, JSON.stringify(liste));
}

// --- Questions VALIDÉES manuellement ---
// Une question proposée est d'abord "en attente" (CLE_SOUMISSIONS, visible dans
// « Questions proposées »). Quand l'utilisateur clique sur « Valider », elle est
// déplacée ici : elle devient jouable et DISPARAÎT de la liste des propositions.
const CLE_VALIDEES = 'voltquiz_validees';

export function chargerValidees() {
  try {
    return JSON.parse(localStorage.getItem(CLE_VALIDEES)) || [];
  } catch {
    return [];
  }
}

export function validerSoumission(id) {
  const enAttente = chargerSoumissions();
  const aValider = enAttente.find((s) => s.id === id);
  if (!aValider) return;
  const validees = chargerValidees();
  validees.push({ ...aValider, valideLe: new Date().toISOString() });
  localStorage.setItem(CLE_VALIDEES, JSON.stringify(validees));
  localStorage.setItem(CLE_SOUMISSIONS, JSON.stringify(enAttente.filter((s) => s.id !== id)));
}

// --- Questions signalées (pouce rouge) ---
// Un joueur peut signaler une question potentiellement erronée, mal écrite ou peu claire.
// PAS affiché dans l'interface joueur : visible uniquement dans la vue admin (?admin=1).
// Stocké dans localStorage : { q, themeId, themeNom, count, date, dernier }
// "count" = nombre de signalements reçus pour cette question.
const CLE_SIGNALES = 'voltquiz_signales';

export function chargerSignales() {
  try {
    return JSON.parse(localStorage.getItem(CLE_SIGNALES)) || [];
  } catch {
    return [];
  }
}

export function ajouterSignalement(s) {
  const liste = chargerSignales();
  const existant = liste.find((x) => x.q === s.q);
  if (existant) {
    existant.count = (existant.count || 1) + 1;
    existant.dernier = new Date().toISOString();
  } else {
    liste.push({ id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, date: new Date().toISOString(), count: 1, ...s });
  }
  localStorage.setItem(CLE_SIGNALES, JSON.stringify(liste));
  return liste;
}

export function supprimerSignalement(q) {
  const liste = chargerSignales().filter((x) => x.q !== q);
  localStorage.setItem(CLE_SIGNALES, JSON.stringify(liste));
}

export function viderSignales() {
  localStorage.removeItem(CLE_SIGNALES);
}

// --- Suggestions / remontées des joueurs ---
// Stockées dans localStorage (clé voltquiz_suggestions) et visibles UNIQUEMENT
// dans la vue admin (?admin=1) : jamais affichées dans l'interface joueur.
const CLE_SUGGESTIONS = 'voltquiz_suggestions';

export function chargerSuggestions() {
  try {
    const l = JSON.parse(localStorage.getItem(CLE_SUGGESTIONS)) || [];
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
}

export function ajouterSuggestion(texte, pseudo) {
  const t = String(texte || '').trim();
  if (!t) return null;
  const s = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    texte: t.slice(0, 2000),
    pseudo: String(pseudo || 'Anonyme').slice(0, 30),
    date: new Date().toISOString(),
  };
  const liste = chargerSuggestions();
  liste.unshift(s); // plus récente en premier
  try {
    localStorage.setItem(CLE_SUGGESTIONS, JSON.stringify(liste.slice(0, 200)));
  } catch {}
  return s;
}

export function supprimerSuggestion(id) {
  try {
    localStorage.setItem(CLE_SUGGESTIONS, JSON.stringify(chargerSuggestions().filter((s) => s.id !== id)));
  } catch {}
}

// Vérification admin d'un signalement : statut 'garder' (la question reste dans le pool)
// ou 'retirer' (la question est exclue du pool, via la liste voltquiz_exclues).
export function marquerSignalement(q, statut) {
  const liste = chargerSignales();
  const s = liste.find((x) => x.q === q);
  if (s) {
    s.statut = statut;
    s.revuLe = new Date().toISOString();
    localStorage.setItem(CLE_SIGNALES, JSON.stringify(liste));
  }
  const n = normaliserTexteQuestion(q);
  if (statut === 'retirer') ajouterExclusion(n);
  else retirerExclusion(n);
}

// --- Questions retirées du pool par l'admin (signalées puis validées comme mauvaises) ---
const CLE_EXCLUES = 'voltquiz_exclues';

export function chargerExclues() {
  try {
    return JSON.parse(localStorage.getItem(CLE_EXCLUES)) || [];
  } catch {
    return [];
  }
}

function sauverExclues(liste) {
  localStorage.setItem(CLE_EXCLUES, JSON.stringify(liste));
}

export function ajouterExclusion(texteNormalise) {
  const liste = chargerExclues();
  if (!liste.includes(texteNormalise)) {
    liste.push(texteNormalise);
    sauverExclues(liste);
  }
}

export function retirerExclusion(texteNormalise) {
  sauverExclues(chargerExclues().filter((x) => x !== texteNormalise));
}

// Réinitialise les scores : records (voltquiz_records) + historique des parties
// (voltquiz_parties = leaderboards) + XP des thèmes (voltquiz_xp) + séries mémorisées.
// Utilisé uniquement via ?reset=1 sur la version d'essai (aucun bouton dans l'appli).
export function reinitialiserScores() {
  localStorage.removeItem(CLE_RECORDS);
  localStorage.removeItem(CLE_PARTIES);
  localStorage.removeItem(CLE_XP);
  localStorage.removeItem(CLE_SERIES);
}

// Offset des compteurs de soumissions au moment d'un reset de progression :
// les questions perso (soumissions/validées) sont CONSERVÉES dans le pool,
// mais les badges "proposer/valider" repartent de zéro (voir statsBadges).
const CLE_RESET_SOUM = 'voltquiz_reset_soumissions';

// Réinitialise TOUTE la progression : niveau global 1, XP des thèmes à 0,
// records, historique (leaderboard/stats), streak du quizz du jour,
// badge favori et titre actif re-verrouillés.
// Utilisé uniquement via ?resetcompte=1 sur la version d'essai (aucun bouton).
export function reinitialiserProgression() {
  reinitialiserScores();
  localStorage.removeItem(CLE_STREAK_JOUR);
  // clés définies dans badges.js / titres.js (literal pour éviter l'import circulaire)
  localStorage.removeItem('voltquiz_badge_favori');
  localStorage.removeItem('voltquiz_titre_actif');
  localStorage.setItem(
    CLE_RESET_SOUM,
    JSON.stringify({ proposees: chargerSoumissions().length, validees: chargerValidees().length })
  );
}

// --- Historique des parties (pour le leaderboard) ---
// Chaque partie terminée est enregistrée localement : { date, mode, niveau, themeId, themeNom, total, joueurs: [{ nom, score, bonnes }] }
const CLE_PARTIES = 'voltquiz_parties';

export function chargerParties() {
  try {
    return JSON.parse(localStorage.getItem(CLE_PARTIES)) || [];
  } catch {
    return [];
  }
}

export function ajouterPartie(partie) {
  const liste = chargerParties();
  liste.push({ id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, date: new Date().toISOString(), ...partie });
  // on garde les 500 dernières parties max
  const tailles = liste.slice(-500);
  localStorage.setItem(CLE_PARTIES, JSON.stringify(tailles));
}

// Construit le contenu JSON exportable (même format que questions-utilisateur.json)
// à partir des soumissions locales.
export function exporterSoumissionsJSON(soumissions, themes) {
  const map = new Map();
  for (const s of soumissions) {
    if (!map.has(s.themeId)) {
      const t = themes.find((x) => x.id === s.themeId);
      map.set(s.themeId, {
        id: s.themeId,
        nom: t ? t.nom : s.themeId,
        icone: t ? t.icone : 'question',
        couleur: t ? t.couleur : '#8b5cf6',
        questions: [],
      });
    }
    const entree = {
      q: s.q,
      reponses: s.reponses,
      bonne: s.bonne,
      niveau: s.niveau,
    };
    if (s.info) entree.info = s.info;
    map.get(s.themeId).questions.push(entree);
  }
  return JSON.stringify({ themes: [...map.values()] }, null, 2);
}
