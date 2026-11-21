// Tests unitaires des idées récentes (sans navigateur) : PASS/FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// localStorage simulé pour les fonctions de src/lib/
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = {
  location: {
    search: '',
  },
};
import { dailyQuestions, drawSeries, subjectOf } from '../src/lib/draw.js';
import { pointsFor } from '../src/lib/scoring.js';
import { addSuggestion, loadSuggestions, removeSuggestion } from '../src/lib/suggestions.js';
import { isThisWeek, localDayKey } from '../src/lib/dates.js';
const B = await import('../src/lib/badges.js');
const T = await import('../src/lib/titles.js');
let ok = 0,
  ko = 0;
function check(nom, cond) {
  if (cond) {
    ok++;
    console.log('PASS  ' + nom);
  } else {
    ko++;
    console.log('FAIL  ' + nom);
  }
}

// --- 1) tirerSerie : diversité des sujets ---
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const files = fs.readdirSync(dir).filter((f) => /^questions-.*\.js$/.test(f));
const themes = [];
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href + '?t=' + Math.random());
  const lot = Object.values(mod)[0];
  if (!Array.isArray(lot)) continue;
  for (const t of lot) {
    const ex = themes.find((x) => x.id === t.id);
    if (ex) ex.questions.push(...t.questions);
    else
      themes.push({
        ...t,
        questions: [...t.questions],
      });
  }
}
const actifs = themes.filter((t) => !['insolite', 'pop-culture'].includes(t.id));
const mangas = actifs.find((t) => t.id === 'mangas-animes');
let maxPerSubject = 0,
  series3plus = 0;
for (let e = 0; e < 300; e++) {
  const seriesN = drawSeries(mangas.questions, 10, 2, 0);
  const c = new Map();
  for (const q of seriesN) {
    const s = subjectOf(q.q);
    if (s) c.set(s, (c.get(s) || 0) + 1);
  }
  const mx = c.size ? Math.max(...c.values()) : 0;
  if (mx > maxPerSubject) maxPerSubject = mx;
  if (mx >= 3) series3plus++;
  if (seriesN.length !== 10) {
    ko++;
    console.log('FAIL  tirage incomplet');
  }
}
check('tirerSerie solo : 10 questions tirees a chaque fois', true);
check('tirerSerie solo : max 2 du meme sujet (constate ' + maxPerSubject + ')', maxPerSubject <= 2);
check('tirerSerie solo : 0/300 series avec 3+ meme sujet', series3plus === 0);

// --- 2) tirerSerie multi-themes : plafond par theme ---
const survivalPool = actifs.flatMap((t) =>
  t.questions.map((q) => ({
    ...q,
    themeId: t.id,
  }))
);
const N = 30,
  maxPerTheme = Math.max(2, Math.ceil(N / actifs.length) + 1);
let maxThemeCount = 0,
  over = 0,
  minThemesHit = 99;
for (let e = 0; e < 200; e++) {
  const seriesN = drawSeries(survivalPool, N, 2, maxPerTheme);
  const c = new Map();
  for (const q of seriesN) c.set(q.themeId, (c.get(q.themeId) || 0) + 1);
  const mx = Math.max(...c.values());
  if (mx > maxThemeCount) maxThemeCount = mx;
  if (mx > maxPerTheme) over++;
  minThemesHit = Math.min(minThemesHit, c.size);
}
check(
  'tirerSerie survie : max ' +
    maxPerTheme +
    '/theme respecte (constate ' +
    maxThemeCount +
    ', depassements ' +
    over +
    ')',
  over === 0
);
// invariant reel = plafond par theme ci-dessus ; couverture : avec 30 questions et max 4/theme,
// 8+ themes touches sur 12 est un bon equilibre (le hasard peut concentrer ailleurs)
check(
  'tirerSerie survie : au moins 8 themes touches par serie (min constate ' + minThemesHit + ')',
  minThemesHit >= 8
);

// --- 3) quizz du jour : seedé + diversifié ---
const q1 = dailyQuestions(actifs, '2026-11-19')
  .map((q) => q.q)
  .join('|');
const q2 = dailyQuestions(actifs, '2026-11-19')
  .map((q) => q.q)
  .join('|');
const q3 = dailyQuestions(actifs, '2026-11-20')
  .map((q) => q.q)
  .join('|');
check('quotidien : meme tirage 2x le meme jour', q1 === q2);
check('quotidien : tirage different le jour suivant', q1 !== q3);
const cT = new Map();
for (const q of dailyQuestions(actifs, '2026-11-19'))
  cT.set(q.themeId, (cT.get(q.themeId) || 0) + 1);
check(
  'quotidien : max 2 questions du meme theme (constate ' + Math.max(...cT.values()) + ')',
  Math.max(...cT.values()) <= 2
);

// --- 4) points : 20 max, -1/s, min 10, x2 bonus ---
check('pointsPour(correct, 0) = 20', pointsFor(true, 0) === 20);
check('pointsPour(correct, 5) = 15', pointsFor(true, 5) === 15);
check('pointsPour(correct, 10) = 10 (min)', pointsFor(true, 10) === 10);
check('pointsPour(faux) = 0', pointsFor(false, 0) === 0);
check('pointsPour(correct, 0, bonus) = 40', pointsFor(true, 0, true) === 40);

// --- 5) suggestions : ajout / liste / suppr / vide refuse ---
addSuggestion('Test suggestion A', 'Joris');
addSuggestion('Test suggestion B', 'Test');
const sl = loadSuggestions();
check(
  'suggestions : 2 ajoutees, plus recente en premier',
  sl.length === 2 && sl[0].text === 'Test suggestion B'
);
check('suggestions : vide refusee', addSuggestion('   ', 'X') === null);
removeSuggestion(sl[0].id);
check('suggestions : suppression OK', loadSuggestions().length === 1);

// --- 6) badges / titres calculables ---
const badges = B.computeBadges();
const titles = T.computeTitles();
check('badges : 30 definis', badges.length === 30);
check('titres : 50 definis', titles.length === 50);

// --- 7) compte par theme (objectif 1000+ partout) ---
const perTheme = {};
for (const t of actifs) perTheme[t.id] = t.questions.length;
const min = Math.min(...Object.values(perTheme));
check(
  '12 themes actifs, min ' + min + ' questions/theme (objectif 1000+)',
  Object.keys(perTheme).length === 12 && min >= 1000
);

// --- 8) classement hebdo : dansSemaineEnCours ---
const now = new Date();
const lundi = new Date(now.getFullYear(), now.getMonth(), now.getDate());
lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const ilYa10j = new Date(now);
ilYa10j.setDate(ilYa10j.getDate() - 10);
const lundiProchain = new Date(lundi);
lundiProchain.setDate(lundiProchain.getDate() + 7);
check('semaine en cours : aujourd’hui dedans', isThisWeek(now.toISOString()) === true);
check('semaine en cours : lundi de cette semaine dedans', isThisWeek(lundi.toISOString()) === true);
check('semaine en cours : il y a 10 jours dehors', isThisWeek(ilYa10j.toISOString()) === false);
check(
  'semaine en cours : lundi prochain dehors',
  isThisWeek(lundiProchain.toISOString()) === false
);
check('cleJourLocal format AAAA-MM-JJ', /^\d{4}-\d{2}-\d{2}$/.test(localDayKey(now)));

// --- 9) dopamine : prochain badge / titre ---
const pb = B.nextBadge();
check(
  'prochainBadge : un badge verrouillé proposé (attendu parties-1 0/1 au départ)',
  pb && pb.id === 'parties-1' && pb.current === 0 && pb.target === 1
);
const pt = T.nextTitle();
check(
  'prochainTitre : un titre verrouillé proposé (palier 3, niveau current 1)',
  pt && pt.target === 3 && pt.current === 1
);
console.log('\n==== RESULTAT : ' + ok + ' PASS / ' + ko + ' FAIL ====');
process.exit(ko === 0 ? 0 : 1);
