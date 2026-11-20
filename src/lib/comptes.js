// Comptes locaux : e-mail + mot de passe + pseudo, stockés UNIQUEMENT sur ce PC
// (localStorage). Le mot de passe n'est JAMAIS stocké en clair : on stocke un
// hash SHA-256 salé (crypto.subtle, dispo en local sur http://localhost).
import { normaliserPseudo, pseudoValide } from './moderation.js';

const CLE_COMPTES = 'voltquiz_comptes';
const CLE_SESSION = 'voltquiz_session';

// Guard crypto : crypto.subtle n'existe que dans un contexte sécurisé (HTTPS ou
// localhost). Sur HTTP non-local, on renvoie une erreur claire au lieu de planter.
export function contexteSecurise() {
  return !!(globalThis.crypto && globalThis.crypto.subtle && typeof globalThis.crypto.randomUUID === 'function');
}

export function chargerComptes() {
  try {
    return JSON.parse(localStorage.getItem(CLE_COMPTES)) || [];
  } catch {
    return [];
  }
}

function sauverComptes(liste) {
  localStorage.setItem(CLE_COMPTES, JSON.stringify(liste));
}

export function listePseudos() {
  return chargerComptes().map((c) => c.pseudo);
}

export function pseudoExiste(pseudo) {
  const n = normaliserPseudo(pseudo);
  return chargerComptes().some((c) => c.pseudoNormalise === n);
}

export function emailValide(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || '');
}

async function hashMdp(mdp, sel) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sel}::${mdp}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Crée un compte local. Retourne { ok: true, pseudo } ou { ok: false, erreur }.
export async function creerCompte({ pseudo, email, mdp }) {
  if (!contexteSecurise()) {
    return { ok: false, erreur: "Contexte non sécurisé : ouvre l'appli en https ou sur localhost pour créer un compte." };
  }
  const errPseudo = pseudoValide(pseudo);
  if (errPseudo) return { ok: false, erreur: errPseudo };
  if (!emailValide(email)) return { ok: false, erreur: "L'adresse e-mail semble invalide." };
  if (!mdp || mdp.length < 8) return { ok: false, erreur: 'Le mot de passe doit faire au moins 8 caractères.' };
  if (pseudoExiste(pseudo)) return { ok: false, erreur: 'Ce pseudo est déjà pris sur ce PC.' };
  const sel = crypto.randomUUID();
  const hash = await hashMdp(mdp, sel);
  const comptes = chargerComptes();
  comptes.push({
    pseudo,
    pseudoNormalise: normaliserPseudo(pseudo),
    email,
    sel,
    hash,
    avatar: null,
    date: new Date().toISOString(),
  });
  sauverComptes(comptes);
  localStorage.setItem(CLE_SESSION, JSON.stringify({ pseudo, avatar: null }));
  return { ok: true, pseudo };
}

// Connexion : vérifie le hash du mot de passe. Retourne { ok, pseudo? , erreur? }.
export async function connecter(pseudo, mdp) {
  if (!contexteSecurise()) {
    return { ok: false, erreur: "Contexte non sécurisé : la connexion nécessite https ou localhost." };
  }
  const n = normaliserPseudo(pseudo);
  const compte = chargerComptes().find((c) => c.pseudoNormalise === n);
  if (!compte) return { ok: false, erreur: 'Aucun compte avec ce pseudo sur ce PC.' };
  const hash = await hashMdp(mdp || '', compte.sel);
  if (hash !== compte.hash) return { ok: false, erreur: 'Mot de passe incorrect.' };
  localStorage.setItem(CLE_SESSION, JSON.stringify({ pseudo: compte.pseudo, avatar: compte.avatar || null }));
  return { ok: true, pseudo: compte.pseudo };
}

export function sessionActuelle() {
  try {
    return JSON.parse(localStorage.getItem(CLE_SESSION));
  } catch {
    return null;
  }
}

// Mode invité : pseudo automatique "user-xxxxxxx", session marquée invite:true.
// Un invité joue tout de suite, mais SANS XP (compte ni thèmes), badges, titres ni leaderboard.
export function demarrerInvite() {
  const caracteres = 'abcdefghjkmnpqrstuvwxyz23456789';
  let alea = '';
  for (let i = 0; i < 7; i++) alea += caracteres[Math.floor(Math.random() * caracteres.length)];
  const pseudo = `user-${alea}`;
  localStorage.setItem(CLE_SESSION, JSON.stringify({ pseudo, invite: true, avatar: null }));
  return pseudo;
}

export function estInvite() {
  const s = sessionActuelle();
  return !!(s && s.invite);
}

// Avatar du compte connecté (dataURL stockée dans le compte).
export function avatarActuel() {
  const s = sessionActuelle();
  if (!s) return null;
  if (s.avatar) return s.avatar;
  const c = chargerComptes().find((x) => x.pseudoNormalise === normaliserPseudo(s.pseudo));
  return c?.avatar || null;
}

// Enregistre l'avatar (déjà validé et réduit) sur le compte + la session.
export function definirAvatar(pseudo, dataUrl) {
  const comptes = chargerComptes();
  const c = comptes.find((x) => x.pseudoNormalise === normaliserPseudo(pseudo));
  if (c) {
    c.avatar = dataUrl;
    sauverComptes(comptes);
  }
  const s = sessionActuelle();
  if (s) localStorage.setItem(CLE_SESSION, JSON.stringify({ ...s, avatar: dataUrl }));
}

export function deconnecter() {
  localStorage.removeItem(CLE_SESSION);
}

// Tuto de bienvenue : affiché UNE SEULE FOIS par compte (première connexion).
const CLE_TUTO = 'voltquiz_tuto_vu';

export function aVuTuto(pseudo) {
  try {
    const vu = JSON.parse(localStorage.getItem(CLE_TUTO)) || {};
    return !!vu[normaliserPseudo(pseudo)];
  } catch {
    return false;
  }
}

export function marquerTutoVu(pseudo) {
  try {
    const vu = JSON.parse(localStorage.getItem(CLE_TUTO)) || {};
    vu[normaliserPseudo(pseudo)] = true;
    localStorage.setItem(CLE_TUTO, JSON.stringify(vu));
  } catch {
    /* stockage indisponible : on ignore */
  }
}
