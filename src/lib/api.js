// api.js — client HTTP de l'API VoltQuiz (V2). Aujourd'hui l'appli fonctionne
// 100 % en local ; quand le flag VOLTQUIZ_STOCKAGE=d1 est posé, lib/storage.js
// bascule lire/ecrire sur ces appels. Zéro dépendance, fetch natif.
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
export const kvGet = (cle) => appel(`/kv/${encodeURIComponent(cle)}`);
export const kvSet = (cle, valeur) =>
  appel(`/kv/${encodeURIComponent(cle)}`, { method: 'POST', body: JSON.stringify({ valeur }) });

// Auth (hash vérifié côté serveur, PBKDF2 en V2).
export const authInscription = (pseudo, email, mdp) =>
  appel('/auth/inscription', { method: 'POST', body: JSON.stringify({ pseudo, email, mdp }) });
export const authConnexion = (pseudo, mdp) =>
  appel('/auth/connexion', { method: 'POST', body: JSON.stringify({ pseudo, mdp }) });

// Parties / records / XP.
export const apiAjouterPartie = (partie) => appel('/parties', { method: 'POST', body: JSON.stringify(partie) });
export const apiParties = (pseudo) => appel(`/parties${pseudo ? `?pseudo=${encodeURIComponent(pseudo)}` : ''}`);
export const apiRecord = (cle) => appel(`/records/${encodeURIComponent(cle)}`);
export const apiSauverRecord = (cle, valeur, pseudo) =>
  appel('/records', { method: 'POST', body: JSON.stringify({ cle, valeur, pseudo }) });
export const apiXp = (pseudo, themeId) => appel(`/xp/${encodeURIComponent(pseudo)}/${encodeURIComponent(themeId)}`);
export const apiSauverXp = (pseudo, themeId, xp) =>
  appel('/xp', { method: 'POST', body: JSON.stringify({ pseudo, themeId, xp }) });

// Rooms de duel éphémères (KV) + WebSocket vers le Durable Object (V2).
export const apiCreerRoom = (pseudo) => appel('/room', { method: 'POST', body: JSON.stringify({ pseudo }) });
export const apiRejoindreRoom = (id, pseudo) =>
  appel('/room/rejoindre', { method: 'POST', body: JSON.stringify({ id, pseudo }) });
export const apiRoom = (id) => appel(`/room/${encodeURIComponent(id)}`);
export function apiDuelWebSocket(roomId) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${proto}//${location.host}/api/duel/${encodeURIComponent(roomId)}`);
}
