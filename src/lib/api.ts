// api.ts — client HTTP de l'API VoltQuiz (V2). Aujourd'hui l'appli fonctionne
// 100 % en local ; quand le flag VOLTQUIZ_STOCKAGE=d1 est posé, lib/storage.js
// bascule lire/ecrire sur ces appels. Zéro dépendance, fetch natif.
import { currentOrigin } from './nav.js';
import type { GameResult } from './types.js';

const BASE = '/api';

// --- Formes des réponses JSON du worker (worker-api.js) ---
// Chaque route répond { ok: true, ... } ou { ok: false, error } (voir jsonError).

/** /api/ping et /api/health (routes ouvertes, répondent même V2 off). */
export interface HealthResponse {
  ok: boolean;
  app?: string;
  version?: string;
  v2?: boolean;
  hour?: string;
}

/** /api/stats : rooms KV, rapports CSP, hits 429 (503 si V2 off, géré côté appelant). */
export interface StatsResponse {
  ok: boolean;
  v2?: boolean;
  rooms?: number;
  rapportsCsp?: number;
  hits429?: number;
  hour?: string;
}

/** GET /api/kv/<cle> : la valeur stockée côté serveur (null si absente). */
export interface KvGetResponse {
  ok: boolean;
  key: string;
  value: unknown;
}

export interface KvSetResponse {
  ok: boolean;
  key: string;
}

export interface AuthResponse {
  ok: boolean;
  pseudo: string;
}

export interface AddGameResponse {
  ok: boolean;
  id: string;
}

export interface GamesResponse {
  ok: boolean;
  games: unknown[];
}

/** Ligne de la table D1 « records ». */
export interface RecordRow {
  cle: string;
  valeur: number;
  pseudo: string | null;
  date: string;
}

export interface RecordResponse {
  ok: boolean;
  record: RecordRow | null;
}

export interface OkResponse {
  ok: boolean;
}

export interface XpResponse {
  ok: boolean;
  xp: number;
}

/** Room de duel éphémère stockée en KV (TTL 1 h). */
export interface Room {
  id: string;
  createur: string | null;
  createdAt: string;
}

export interface CreateRoomResponse {
  ok: boolean;
  id: string;
}

export interface RoomResponse {
  ok: boolean;
  room: Room;
}

// Options de fetch utilisées par ce client (sous-ensemble de RequestInit — on le
// redéclare localement car ESLint (no-undef) ne connaît pas les types globaux du lib DOM).
interface AppelOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

// Appel générique : JSON des deux côtés, lève une Error avec le message serveur si !r.ok.
// Le corps est re-typé ici (r.json() renvoie Promise<any> côté lib DOM).
async function appel<T = unknown>(chemin: string, options: AppelOptions = {}): Promise<T> {
  const r = await fetch(`${BASE}${chemin}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  const data = (await r.json().catch(() => null)) as { error?: string } | null;
  if (!r.ok) throw new Error((data && data.error) || `Erreur API ${r.status}`);
  return data as T;
}

// Stockage clé/valeur générique (sync localStorage -> D1/KV côté serveur).
export const kvGet = (key: string): Promise<KvGetResponse> =>
  appel(`/kv/${encodeURIComponent(key)}`);
export const kvSet = (key: string, value: unknown): Promise<KvSetResponse> =>
  appel(`/kv/${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify({
      value: value,
    }),
  });
export const kvDelete = (key: string): Promise<OkResponse> =>
  appel(`/kv/${encodeURIComponent(key)}`, { method: 'DELETE' });

// Santé de l'API (route ouverte, répond même V2 off) + stats V2 (rooms KV,
// rapports CSP, hits 429 — 503 si V2 off, à gérer côté appelant).
export const apiHealth = (): Promise<HealthResponse> => appel('/health');
export const apiStats = (): Promise<StatsResponse> => appel('/stats');

// Auth (hash vérifié côté serveur, PBKDF2 en V2).
export const authSignup = (
  pseudo: string,
  email: string,
  password: string
): Promise<AuthResponse> =>
  appel('/auth/inscription', {
    method: 'POST',
    body: JSON.stringify({
      pseudo,
      email,
      password: password,
    }),
  });
export const authLogin = (pseudo: string, password: string): Promise<AuthResponse> =>
  appel('/auth/connexion', {
    method: 'POST',
    body: JSON.stringify({
      pseudo,
      password: password,
    }),
  });

// Parties / records / XP.
export const apiAddGame = (game: GameResult): Promise<AddGameResponse> =>
  appel('/parties', {
    method: 'POST',
    body: JSON.stringify(game),
  });
export const apiGames = (pseudo?: string): Promise<GamesResponse> =>
  appel(`/parties${pseudo ? `?pseudo=${encodeURIComponent(pseudo)}` : ''}`);
export const apiRecord = (key: string): Promise<RecordResponse> =>
  appel(`/records/${encodeURIComponent(key)}`);
export const apiSaveRecord = (key: string, value: number, pseudo?: string): Promise<OkResponse> =>
  appel('/records', {
    method: 'POST',
    body: JSON.stringify({
      key,
      value: value,
      pseudo,
    }),
  });
export const apiXp = (pseudo: string, themeId: string): Promise<XpResponse> =>
  appel(`/xp/${encodeURIComponent(pseudo)}/${encodeURIComponent(themeId)}`);
export const apiSaveXp = (pseudo: string, themeId: string, xp: number): Promise<OkResponse> =>
  appel('/xp', {
    method: 'POST',
    body: JSON.stringify({
      pseudo,
      themeId,
      xp,
    }),
  });

// Rooms de duel éphémères (KV) + WebSocket vers le Durable Object (V2).
export const apiCreateRoom = (pseudo: string): Promise<CreateRoomResponse> =>
  appel('/room', {
    method: 'POST',
    body: JSON.stringify({
      pseudo,
    }),
  });
export const apiJoinRoom = (id: string, pseudo: string): Promise<RoomResponse> =>
  appel('/room/rejoindre', {
    method: 'POST',
    body: JSON.stringify({
      id,
      pseudo,
    }),
  });
export const apiRoom = (id: string): Promise<RoomResponse> => appel(`/room/${encodeURIComponent(id)}`);
export function apiDuelSocket(roomId: string): WebSocket {
  // Origine ws déduite de l'origine courante (via nav.js, seul habilité à lire l'URL — R5).
  const wsOrigin = currentOrigin().replace(/^http/, 'ws');
  return new WebSocket(`${wsOrigin}/api/duel/${encodeURIComponent(roomId)}`);
}
