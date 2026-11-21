// Comptes : en mode 'd1' (défaut), inscription/connexion passent par le serveur
// (POST /api/auth/*, hash PBKDF2 210k côté worker) ; le localStorage ne garde qu'un
// CACHE du profil (pseudo, e-mail, avatar — JAMAIS de hash ni mot de passe).
// En mode 'local' (?stockage=local, hors-ligne) : hash SHA-256 salé 100 % local,
// le mot de passe n'est JAMAIS stocké en clair.
import { normalizePseudo, isValidPseudo } from './moderation.js';
import { read, write, remove, STORAGE_KEYS, STORAGE_MODE } from './storage.js';
import { authSignup, authLogin } from './api.js';
import type { Account, Session } from './types.js';

// Compte tel que persisté en cache local : hash/sel/email ne sont présents qu'en
// mode 'local' (en mode 'd1' le serveur détient le hash PBKDF2). Le champ `date`
// historique est conservé tel quel.
type StoredAccount = Omit<Account, 'hash' | 'sel' | 'email'> & {
  hash?: string;
  sel?: string;
  email?: string;
  date?: string;
};

// Traduit une erreur de l'appel API serveur en message utilisateur.
function messageErreurServeur(e: unknown): string {
  if (e instanceof TypeError) {
    return "Serveur injoignable — réessaie, ou ouvre l'appli avec ?stockage=local.";
  }
  return e instanceof Error ? e.message : 'Erreur serveur.';
}

// Met à jour le cache local du profil (sans secret) à partir d'un compte serveur.
function upsertCompteLocal(compte: {
  pseudo: string;
  pseudoNormalise: string;
  email?: string;
  avatar?: string | null;
}): void {
  const accounts = loadAccounts();
  const i = accounts.findIndex((c) => c.pseudoNormalise === compte.pseudoNormalise);
  const entree: StoredAccount = {
    pseudo: compte.pseudo,
    pseudoNormalise: compte.pseudoNormalise,
    email: compte.email ?? (i >= 0 ? accounts[i].email : undefined),
    avatar: compte.avatar ?? (i >= 0 ? accounts[i].avatar : null),
    date: i >= 0 ? accounts[i].date : new Date().toISOString(),
  };
  if (i >= 0) accounts[i] = entree;
  else accounts.push(entree);
  saveAccounts(accounts);
}

// Session telle que persistée : le mode invité pose `guest: true` (champ historique).
type StoredSession = Session & { guest?: boolean };

// Résultat d'une création de compte ou d'une connexion.
type AccountResult = { ok: true; pseudo: string } | { ok: false; error: string };

// Guard crypto : crypto.subtle n'existe que dans un context sécurisé (HTTPS ou
// localhost). Sur HTTP non-local, on renvoie une erreur claire au lieu de planter.
function secureContext(): boolean {
  return !!(
    globalThis.crypto &&
    globalThis.crypto.subtle &&
    typeof globalThis.crypto.randomUUID === 'function'
  );
}
export function loadAccounts(): StoredAccount[] {
  // read() vient de storage.js (JS) : sa valeur par défaut est inférée `null`, d'où le cast.
  return (read(STORAGE_KEYS.accounts, null) || []) as StoredAccount[];
}
function saveAccounts(list: StoredAccount[]): void {
  write(STORAGE_KEYS.accounts, list);
}
export function listPseudos(): string[] {
  return loadAccounts().map((c) => c.pseudo);
}
function pseudoExists(pseudo: string): boolean {
  const n = normalizePseudo(pseudo);
  return loadAccounts().some((c) => c.pseudoNormalise === n);
}
export { pseudoExists };
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || '');
}
async function hashPassword(password: string, sel: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${sel}::${password}`)
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Crée un compte. Mode 'd1' (défaut) : inscription serveur (PBKDF2, /api/auth/inscription)
// + cache local du profil sans secret. Mode 'local' : hash SHA-256 salé 100 % local.
// Retourne { ok: true, pseudo } ou { ok: false, erreur }.
export async function createAccount({
  pseudo,
  email,
  password: password,
}: {
  pseudo: string;
  email: string;
  password: string;
}): Promise<AccountResult> {
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
  if (STORAGE_MODE === 'd1') {
    try {
      await authSignup(pseudo, email, password);
    } catch (e) {
      return {
        ok: false,
        error: messageErreurServeur(e),
      };
    }
    upsertCompteLocal({
      pseudo,
      pseudoNormalise: normalizePseudo(pseudo),
      email,
      avatar: null,
    });
    write(STORAGE_KEYS.session, {
      pseudo,
      avatar: null,
    });
    return {
      ok: true,
      pseudo,
    };
  }
  // --- mode 'local' (hors-ligne) ---
  if (!secureContext()) {
    return {
      ok: false,
      error:
        "Contexte non sécurisé : ouvre l'appli en https ou sur localhost pour créer un compte.",
    };
  }
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

// Connexion : mode 'd1' -> vérification serveur (PBKDF2, /api/auth/connexion, hash
// comparé en temps constant) ; mode 'local' -> hash SHA-256 local.
// Retourne { ok, pseudo? , erreur? }.
export async function connect(pseudo: string, password: string): Promise<AccountResult> {
  const n = normalizePseudo(pseudo);
  if (STORAGE_MODE === 'd1') {
    try {
      const r = await authLogin(pseudo, password || '');
      upsertCompteLocal({
        pseudo: r.pseudo,
        pseudoNormalise: n,
        avatar: currentAvatarCache(n),
      });
      write(STORAGE_KEYS.session, {
        pseudo: r.pseudo,
        avatar: currentAvatarCache(n),
      });
      return {
        ok: true,
        pseudo: r.pseudo,
      };
    } catch (e) {
      return {
        ok: false,
        error: messageErreurServeur(e),
      };
    }
  }
  // --- mode 'local' ---
  if (!secureContext()) {
    return {
      ok: false,
      error: 'Contexte non sécurisé : la connexion nécessite https ou localhost.',
    };
  }
  const account = loadAccounts().find((c) => c.pseudoNormalise === n);
  if (!account)
    return {
      ok: false,
      error: 'Aucun compte avec ce pseudo sur ce PC.',
    };
  const hash = await hashPassword(password || '', account.sel || '');
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

// Avatar en cache local pour un pseudo normalisé (évite de relire toute la liste).
function currentAvatarCache(pseudoNormalise: string): string | null {
  const c = loadAccounts().find((x) => x.pseudoNormalise === pseudoNormalise);
  return c?.avatar || null;
}
export function currentSession(): StoredSession | null {
  try {
    return read(STORAGE_KEYS.session, null) as StoredSession | null;
  } catch {
    return null;
  }
}

// Mode invité : pseudo automatique "user-xxxxxxx", session marquée invite:true.
// Un invité joue tout de suite, mais SANS XP (compte ni thèmes), badges, titres ni leaderboard.
export function startGuest(): string {
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
function isGuest(): boolean {
  const s = currentSession();
  return !!(s && s.guest);
}

// Avatar du compte connecté (dataURL stockée dans le compte).
export { isGuest };
export function currentAvatar(): string | null {
  const s = currentSession();
  if (!s) return null;
  if (s.avatar) return s.avatar;
  const c = loadAccounts().find((x) => x.pseudoNormalise === normalizePseudo(s.pseudo));
  return c?.avatar || null;
}

// Enregistre l'avatar (déjà validé et réduit) sur le compte + la session.
export function setAvatar(pseudo: string, dataUrl: string): void {
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
export function disconnect(): void {
  remove(STORAGE_KEYS.session);
}

// Tuto de bienvenue : affiché UNE SEULE FOIS par compte (première connexion).

export function hasSeenTutorial(pseudo: string): boolean {
  try {
    const vu = (read(STORAGE_KEYS.tutorial, null) || {}) as Record<string, boolean>;
    return !!vu[normalizePseudo(pseudo)];
  } catch {
    return false;
  }
}
export function markTutorialSeen(pseudo: string): void {
  try {
    const vu = (read(STORAGE_KEYS.tutorial, null) || {}) as Record<string, boolean>;
    vu[normalizePseudo(pseudo)] = true;
    write(STORAGE_KEYS.tutorial, vu);
  } catch {
    /* stockage indisponible : on ignore */
  }
}
