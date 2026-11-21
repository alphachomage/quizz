// Comptes locaux : e-mail + mot de passe + pseudo, stockés UNIQUEMENT sur ce PC
// (localStorage). Le mot de passe n'est JAMAIS stocké en clair : on stocke un
// hash SHA-256 salé (crypto.subtle, dispo en local sur http://localhost).
import { normalizePseudo, pseudoValide } from './moderation.js';

const KEY_ACCOUNTS = 'voltquiz_comptes';
const KEY_SESSION = 'voltquiz_session';

// Guard crypto : crypto.subtle n'existe que dans un contexte sécurisé (HTTPS ou
// localhost). Sur HTTP non-local, on renvoie une erreur claire au lieu de planter.
export function contexteSecurise() {
  return !!(globalThis.crypto && globalThis.crypto.subtle && typeof globalThis.crypto.randomUUID === 'function');
}

export function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(KEY_ACCOUNTS)) || [];
  } catch {
    return [];
  }
}

function sauverComptes(list) {
  localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(list));
}

export function listPseudos() {
  return loadAccounts().map((c) => c.pseudo);
}

export function pseudoExiste(pseudo) {
  const n = normalizePseudo(pseudo);
  return loadAccounts().some((c) => c.pseudoNormalise === n);
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || '');
}

async function hashPassword(mdp, sel) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sel}::${mdp}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Crée un compte local. Retourne { ok: true, pseudo } ou { ok: false, erreur }.
export async function createAccount({ pseudo, email, mdp }) {
  if (!contexteSecurise()) {
    return { ok: false, erreur: "Contexte non sécurisé : ouvre l'appli en https ou sur localhost pour créer un compte." };
  }
  const errPseudo = pseudoValide(pseudo);
  if (errPseudo) return { ok: false, erreur: errPseudo };
  if (!isValidEmail(email)) return { ok: false, erreur: "L'adresse e-mail semble invalide." };
  if (!mdp || mdp.length < 8) return { ok: false, erreur: 'Le mot de passe doit faire au moins 8 caractères.' };
  if (pseudoExiste(pseudo)) return { ok: false, erreur: 'Ce pseudo est déjà pris sur ce PC.' };
  const sel = crypto.randomUUID();
  const hash = await hashPassword(mdp, sel);
  const accounts = loadAccounts();
  accounts.push({
    pseudo,
    pseudoNormalise: normalizePseudo(pseudo),
    email,
    sel,
    hash,
    avatar: null,
    date: new Date().toISOString(),
  });
  sauverComptes(accounts);
  localStorage.setItem(KEY_SESSION, JSON.stringify({ pseudo, avatar: null }));
  return { ok: true, pseudo };
}

// Connexion : vérifie le hash du mot de passe. Retourne { ok, pseudo? , erreur? }.
export async function connect(pseudo, mdp) {
  if (!contexteSecurise()) {
    return { ok: false, erreur: "Contexte non sécurisé : la connexion nécessite https ou localhost." };
  }
  const n = normalizePseudo(pseudo);
  const account = loadAccounts().find((c) => c.pseudoNormalise === n);
  if (!account) return { ok: false, erreur: 'Aucun compte avec ce pseudo sur ce PC.' };
  const hash = await hashPassword(mdp || '', account.sel);
  if (hash !== account.hash) return { ok: false, erreur: 'Mot de passe incorrect.' };
  localStorage.setItem(KEY_SESSION, JSON.stringify({ pseudo: account.pseudo, avatar: account.avatar || null }));
  return { ok: true, pseudo: account.pseudo };
}

export function currentSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY_SESSION));
  } catch {
    return null;
  }
}

// Mode invité : pseudo automatique "user-xxxxxxx", session marquée invite:true.
// Un invité joue tout de suite, mais SANS XP (compte ni thèmes), badges, titres ni leaderboard.
export function startGuest() {
  const caracteres = 'abcdefghjkmnpqrstuvwxyz23456789';
  let alea = '';
  for (let i = 0; i < 7; i++) alea += caracteres[Math.floor(Math.random() * caracteres.length)];
  const pseudo = `user-${alea}`;
  localStorage.setItem(KEY_SESSION, JSON.stringify({ pseudo, guest: true, avatar: null }));
  return pseudo;
}

export function estInvite() {
  const s = currentSession();
  return !!(s && s.guest);
}

// Avatar du compte connecté (dataURL stockée dans le compte).
export function currentAvatar() {
  const s = currentSession();
  if (!s) return null;
  if (s.avatar) return s.avatar;
  const c = loadAccounts().find((x) => x.pseudoNormalise === normalizePseudo(s.pseudo));
  return c?.avatar || null;
}

// Enregistre l'avatar (déjà validé et réduit) sur le compte + la session.
export function setAvatar(pseudo, dataUrl) {
  const accounts = loadAccounts();
  const c = accounts.find((x) => x.pseudoNormalise === normalizePseudo(pseudo));
  if (c) {
    c.avatar = dataUrl;
    sauverComptes(accounts);
  }
  const s = currentSession();
  if (s) localStorage.setItem(KEY_SESSION, JSON.stringify({ ...s, avatar: dataUrl }));
}

export function disconnect() {
  localStorage.removeItem(KEY_SESSION);
}

// Tuto de bienvenue : affiché UNE SEULE FOIS par compte (première connexion).
const KEY_TUTORIAL = 'voltquiz_tuto_vu';

export function hasSeenTutorial(pseudo) {
  try {
    const vu = JSON.parse(localStorage.getItem(KEY_TUTORIAL)) || {};
    return !!vu[normalizePseudo(pseudo)];
  } catch {
    return false;
  }
}

export function markTutorialSeen(pseudo) {
  try {
    const vu = JSON.parse(localStorage.getItem(KEY_TUTORIAL)) || {};
    vu[normalizePseudo(pseudo)] = true;
    localStorage.setItem(KEY_TUTORIAL, JSON.stringify(vu));
  } catch {
    /* stockage indisponible : on ignore */
  }
}
