/* global RequestInit, BufferSource */
// durable-objects/workers-env.d.ts — types minimaux du runtime Cloudflare Workers (workerd).
// Volontairement SANS @cloudflare/workers-types : règle 8 du projet, aucune nouvelle
// dépendance. On déclare ici uniquement ce que worker.ts, worker-api.ts et DuelRoom.ts
// utilisent. Fichier ambient (sans import/export) : inclus dans le programme TS via
// l'entrée "durable-objects" de tsconfig.json, ses déclarations sont donc globales.

/** Binding ASSETS : sert les fichiers statiques (public/ en dev, dist/client en prod). */
interface Fetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

/** D1 (binding DB) : base SQLite managée — schéma dans migrations/0001_init.sql. */
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

/** KV (binding ROOMS) : rooms de duel éphémères. */
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  list(options?: { prefix?: string }): Promise<KVListResult>;
}
interface KVListResult {
  keys: { name: string }[];
}

/** Durable Objects (binding DUEL_ROOMS) : room de duel temps réel (WebSocket). */
interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}
interface DurableObjectId {
  readonly name?: string;
}
interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}
/** État de l'instance Durable Object, passé au constructeur de la classe. */
interface DurableObjectState {
  readonly id: DurableObjectId;
  storage: DurableObjectStorage;
  acceptWebSocket(ws: WebSocket): void;
}
interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

/** Contexte d'exécution passé en 3e argument du handler fetch du Worker. */
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/** Paire de WebSocket créée côté serveur lors d'un upgrade HTTP 101 (workerd). */
declare class WebSocketPair {
  readonly length: 2;
  [index: number]: WebSocket;
}

// --- Augmentations de lib.dom.d.ts (présentes dans workerd, absentes du DOM standard) ---
/** Réponse 101 : le socket est exposé via response.webSocket (spécifique workerd). */
interface Response {
  readonly webSocket?: WebSocket | null;
}
interface ResponseInit {
  webSocket?: WebSocket;
}
/** Comparaison en temps constant (anti-oracle de timing, spécifique workerd). */
interface SubtleCrypto {
  timingSafeEqual(a: BufferSource, b: BufferSource): boolean;
}

/** Bindings + variables d'environnement du Worker (définis dans wrangler.toml). */
interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ROOMS: KVNamespace;
  DUEL_ROOMS: DurableObjectNamespace;
  ENVIRONMENT: string;
  APP_VERSION: string;
  CSP_REPORT_ONLY: string;
  V2_ENABLED: string;
  ALLOWED_ORIGINS: string;
}
