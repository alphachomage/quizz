// api.js — client HTTP de l'API VoltQuiz (V2). Aujourd'hui l'appli fonctionne
// 100 % en local ; quand le flag VOLTQUIZ_STOCKAGE=d1 est posé, lib/storage.js
// bascule lire/ecrire sur ces appels. Zéro dépendance, fetch natif.
import { currentOrigin } from './nav.js';

const BASE = '/api';

async function appel(chemin, options = {}) {
  const r = await fetch(`${BASE}${chemin}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error((data && data.erreur) || `Erreur API ${r.status}`);
  return data;
}

// Stockage clé/valeur générique (sync localStorage -> D1/KV côté serveur).
export const kvGet = (key) => appel(`/kv/${encodeURIComponent(key)}`);
export const kvSet = (key, valeur) =>
  appel(`/kv/${encodeURIComponent(key)}`, { method: 'POST', body: JSON.stringify({ valeur }) });

// Auth (hash vérifié côté serveur, PBKDF2 en V2).
export const authSignup = (pseudo, email, mdp) =>
  appel('/auth/inscription', { method: 'POST', body: JSON.stringify({ pseudo, email, mdp }) });
export const authLogin = (pseudo, mdp) =>
  appel('/auth/connexion', { method: 'POST', body: JSON.stringify({ pseudo, mdp }) });

// Parties / records / XP.
export const apiAddGame = (game) => appel('/parties', { method: 'POST', body: JSON.stringify(game) });
export const apiGames = (pseudo) => appel(`/parties${pseudo ? `?pseudo=${encodeURIComponent(pseudo)}` : ''}`);
export const apiRecord = (key) => appel(`/records/${encodeURIComponent(key)}`);
export const apiSaveRecord = (key, valeur, pseudo) =>
  appel('/records', { method: 'POST', body: JSON.stringify({ key, valeur, pseudo }) });
export const apiXp = (pseudo, themeId) => appel(`/xp/${encodeURIComponent(pseudo)}/${encodeURIComponent(themeId)}`);
export const apiSaveXp = (pseudo, themeId, xp) =>
  appel('/xp', { method: 'POST', body: JSON.stringify({ pseudo, themeId, xp }) });

// Rooms de duel éphémères (KV) + WebSocket vers le Durable Object (V2).
export const apiCreateRoom = (pseudo) => appel('/room', { method: 'POST', body: JSON.stringify({ pseudo }) });
export const apiJoinRoom = (id, pseudo) =>
  appel('/room/rejoindre', { method: 'POST', body: JSON.stringify({ id, pseudo }) });
export const apiRoom = (id) => appel(`/room/${encodeURIComponent(id)}`);
export function apiDuelSocket(roomId) {
  // Origine ws déduite de l'origine courante (via nav.js, seul habilité à lire l'URL — R5).
  const wsOrigin = currentOrigin().replace(/^http/, 'ws');
  return new WebSocket(`${wsOrigin}/api/duel/${encodeURIComponent(roomId)}`);
}
