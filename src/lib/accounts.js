// Comptes locaux : e-mail + mot de passe + pseudo, stockés UNIQUEMENT sur ce PC
// (localStorage). Le mot de passe n'est JAMAIS stocké en clair : on stocke un
// hash SHA-256 salé (crypto.subtle, dispo en local sur http://localhost).
import { normalizePseudo, isValidPseudo } from './moderation.js';
import { read, write, remove, STORAGE_KEYS } from './storage.js';

// Guard crypto : crypto.subtle n'existe que dans un context sécurisé (HTTPS ou
// localhost). Sur HTTP non-local, on renvoie une erreur claire au lieu de planter.
function secureContext() {
  return !!(
    globalThis.crypto &&
    globalThis.crypto.subtle &&
    typeof globalThis.crypto.randomUUID === 'function'
  );
}
export function loadAccounts() {
  return read(STORAGE_KEYS.accounts, []) || [];
}
function saveAccounts(list) {
  write(STORAGE_KEYS.accounts, list);
}
export function listPseudos() {
  return loadAccounts().map((c) => c.pseudo);
}
function pseudoExists(pseudo) {
  const n = normalizePseudo(pseudo);
  return loadAccounts().some((c) => c.pseudoNormalise === n);
}
export { pseudoExists };
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || '');
}
async function hashPassword(password, sel) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${sel}::${password}`)
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Crée un compte local. Retourne { ok: true, pseudo } ou { ok: false, erreur }.
export async function createAccount({ pseudo, email, password: password }) {
  if (!secureContext()) {
    return {
      ok: false,
      error:
        "Contexte non sécurisé : ouvre l'appli en https ou sur localhost pour créer un compte.",
    };
  }
  const pseudoError = isValidPseudo(pseudo);
  if (pseudoError)
    return {
      ok: false,
      error: pseudoError,
    };
  if (!isValidEmail(email))
    return {
      ok: false,
      error: "L'adresse e-mail semble invalide.",
    };
  if (!password || password.length < 8)
    return {
      ok: false,
      error: 'Le mot de passe doit faire au moins 8 caractères.',
    };
  if (pseudoExists(pseudo))
    return {
      ok: false,
      error: 'Ce pseudo est déjà pris sur ce PC.',
    };
  const sel = crypto.randomUUID();
  const hash = await hashPassword(password, sel);
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
  saveAccounts(accounts);
  write(STORAGE_KEYS.session, {
    pseudo,
    avatar: null,
  });
  return {
    ok: true,
    pseudo,
  };
}

// Connexion : vérifie le hash du mot de passe. Retourne { ok, pseudo? , erreur? }.
export async function connect(pseudo, password) {
  if (!secureContext()) {
    return {
      ok: false,
      error: 'Contexte non sécurisé : la connexion nécessite https ou localhost.',
    };
  }
  const n = normalizePseudo(pseudo);
  const account = loadAccounts().find((c) => c.pseudoNormalise === n);
  if (!account)
    return {
      ok: false,
      error: 'Aucun compte avec ce pseudo sur ce PC.',
    };
  const hash = await hashPassword(password || '', account.sel);
  if (hash !== account.hash)
    return {
      ok: false,
      error: 'Mot de passe incorrect.',
    };
  write(STORAGE_KEYS.session, {
    pseudo: account.pseudo,
    avatar: account.avatar || null,
  });
  return {
    ok: true,
    pseudo: account.pseudo,
  };
}
export function currentSession() {
  try {
    return read(STORAGE_KEYS.session, null);
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
  write(STORAGE_KEYS.session, {
    pseudo,
    guest: true,
    avatar: null,
  });
  return pseudo;
}
function isGuest() {
  const s = currentSession();
  return !!(s && s.guest);
}

// Avatar du compte connecté (dataURL stockée dans le compte).
export { isGuest };
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
    saveAccounts(accounts);
  }
  const s = currentSession();
  if (s)
    write(STORAGE_KEYS.session, {
      ...s,
      avatar: dataUrl,
    });
}
export function disconnect() {
  remove(STORAGE_KEYS.session);
}

// Tuto de bienvenue : affiché UNE SEULE FOIS par compte (première connexion).

export function hasSeenTutorial(pseudo) {
  try {
    const vu = read(STORAGE_KEYS.tutorial, {}) || {};
    return !!vu[normalizePseudo(pseudo)];
  } catch {
    return false;
  }
}
export function markTutorialSeen(pseudo) {
  try {
    const vu = read(STORAGE_KEYS.tutorial, {}) || {};
    vu[normalizePseudo(pseudo)] = true;
    write(STORAGE_KEYS.tutorial, vu);
  } catch {
    /* stockage indisponible : on ignore */
  }
}
