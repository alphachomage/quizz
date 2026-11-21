// Tests du mode stockage 'd1' (src/lib/storage.ts + src/lib/api.ts) :
// write()/remove() doivent pousser au serveur (POST/DELETE /api/kv/<cle>), et une
// écriture que le serveur refuse (hors-ligne, 429, 5xx...) doit partir en file
// d'attente (localStorage 'voltquiz_pending_writes') puis être retentée — sans quoi
// preloadFromServer() écraserait le local par l'état serveur au démarrage (perte).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Réponse fetch minimale conforme à ce que lit appel() (src/lib/api.ts).
function reponse(ok: boolean, data: unknown, status = ok ? 200 : 500): Response {
  return { ok, status, json: async () => data } as unknown as Response;
}

// Sous-ensemble de RequestInit (no-undef ne connaît pas les types globaux du lib DOM).
type Init = { method?: string; body?: string };
type FetchMock = ReturnType<typeof vi.fn>;
let fetchMock: FetchMock;

// Importe storage.ts à neuf (état de module remis à zéro : file pending, cache lecture).
async function importStorage(): Promise<typeof import('@lib/storage.js')> {
  return import('@lib/storage.js');
}

beforeEach(() => {
  vi.resetModules();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mode d1 — write() pousse au serveur', () => {
  it('POST /api/kv/<cle> avec {"value": ...} + écriture locale, file vide après succès', async () => {
    fetchMock.mockResolvedValue(reponse(true, { ok: true, key: 'voltquiz_xp' }));
    const storage = await importStorage();
    storage.write(storage.STORAGE_KEYS.xp, { cuisine: 10 });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, Init];
    expect(url).toBe('/api/kv/voltquiz_xp');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ value: { cuisine: 10 } });
    expect(window.localStorage.getItem('voltquiz_xp')).toBe('{"cuisine":10}');
    // succès serveur -> pas d'écriture en attente
    await vi.waitFor(() =>
      expect(window.localStorage.getItem('voltquiz_pending_writes') || '{}').toBe('{}')
    );
  });

  it('échec serveur (fetch rejeté) : le local est gardé et la valeur part en file d attente', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const storage = await importStorage();
    storage.write(storage.STORAGE_KEYS.xp, { cuisine: 10 });
    await vi.waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('voltquiz_pending_writes') || '{}')).toEqual({
        voltquiz_xp: { cuisine: 10 },
      })
    );
    expect(window.localStorage.getItem('voltquiz_xp')).toBe('{"cuisine":10}');
  });

  it('flushPendingWrites() retente la file et la vide quand le serveur accepte', async () => {
    const storage = await importStorage();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    storage.write(storage.STORAGE_KEYS.xp, { cuisine: 10 });
    await vi.waitFor(() =>
      expect(window.localStorage.getItem('voltquiz_pending_writes')).not.toBe(null)
    );
    // le serveur revient
    fetchMock.mockResolvedValue(reponse(true, { ok: true, key: 'voltquiz_xp' }));
    await storage.flushPendingWrites();
    expect(window.localStorage.getItem('voltquiz_pending_writes')).toBe('{}');
    const posts = fetchMock.mock.calls.filter(
      (c) => (c[1] as Init | undefined)?.method === 'POST'
    );
    expect(posts.length).toBeGreaterThanOrEqual(2); // 1er essai + retry du flush
  });
});

describe('mode d1 — preloadFromServer()', () => {
  it('remplit le local depuis le serveur (GET) pour les clés sans écriture en attente', async () => {
    const storage = await importStorage();
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/api/kv/voltquiz_records')) {
        return reponse(true, { ok: true, key: 'voltquiz_records', value: { 'solo:dur:cuisine': 83 } });
      }
      return reponse(true, { ok: true, key: String(url).split('/').pop(), value: null });
    });
    await storage.preloadFromServer();
    expect(window.localStorage.getItem('voltquiz_records')).toBe('{"solo:dur:cuisine":83}');
  });

  it('n’écrase PAS une clé qui a une écriture locale en attente (le local est plus récent)', async () => {
    const storage = await importStorage();
    // écriture locale en attente (serveur indisponible)
    fetchMock.mockRejectedValue(new Error('offline'));
    storage.write(storage.STORAGE_KEYS.xp, { cuisine: 99 });
    await vi.waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('voltquiz_pending_writes') || '{}')).toEqual({
        voltquiz_xp: { cuisine: 99 },
      })
    );
    // redémarrage : le serveur renvoie une vieille valeur pour la même clé
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/api/kv/voltquiz_xp')) {
        return reponse(true, { ok: true, key: 'voltquiz_xp', value: { cuisine: 10 } });
      }
      return reponse(true, { ok: true, key: String(url).split('/').pop(), value: null });
    });
    await storage.preloadFromServer();
    expect(window.localStorage.getItem('voltquiz_xp')).toBe('{"cuisine":99}');
  });
});

describe('mode d1 — remove() pousse la suppression', () => {
  it('DELETE /api/kv/<cle> ; si échec, pending[cle] = null et preload ne restaure pas la clé', async () => {
    const storage = await importStorage();
    fetchMock.mockRejectedValue(new Error('offline'));
    window.localStorage.setItem('voltquiz_session', '{"pseudo":"x"}');
    storage.remove(storage.STORAGE_KEYS.session);
    await vi.waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('voltquiz_pending_writes') || '{}')).toEqual({
        voltquiz_session: null,
      })
    );
    expect(window.localStorage.getItem('voltquiz_session')).toBe(null);
    // redémarrage avec un serveur qui a encore la clé : la suppression en attente gagne
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/api/kv/voltquiz_session')) {
        return reponse(true, { ok: true, key: 'voltquiz_session', value: { pseudo: 'x' } });
      }
      return reponse(true, { ok: true, key: String(url).split('/').pop(), value: null });
    });
    await storage.preloadFromServer();
    expect(window.localStorage.getItem('voltquiz_session')).toBe(null);
  });

  it('DELETE accepté : la file ne contient pas la clé', async () => {
    fetchMock.mockResolvedValue(reponse(true, { ok: true }));
    const storage = await importStorage();
    window.localStorage.setItem('voltquiz_session', '{"pseudo":"x"}');
    storage.remove(storage.STORAGE_KEYS.session);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, Init];
    expect(url).toBe('/api/kv/voltquiz_session');
    expect(init.method).toBe('DELETE');
    await vi.waitFor(() =>
      expect(window.localStorage.getItem('voltquiz_pending_writes') || '{}').toBe('{}')
    );
  });
});
