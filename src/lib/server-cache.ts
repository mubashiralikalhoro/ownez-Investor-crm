/**
 * Simple in-memory TTL cache for server-side data.
 *
 * Lives as a module-level singleton — persists for the lifetime of the
 * Node.js process (traditional server, Docker, Railway, Render, etc.).
 *
 * ⚠ Serverless caveat: on Vercel Serverless / Edge every cold-start creates
 *   a fresh process, so cache entries do not survive across invocations there.
 *   For long-lived servers this works exactly as expected.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;    // Date.now() + ttlMs
  cachedAt: number;     // Date.now() at write time
};

class SimpleServerCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  /** Return the cached value or null if missing / expired. */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /** Store a value with a TTL in milliseconds. */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      cachedAt: Date.now(),
    });
  }

  /** Remove a key (e.g. to force a refresh). */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** How many ms remain before the key expires (0 if not cached). */
  ttlRemainingMs(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.expiresAt - Date.now());
  }

  /** ISO string of when the entry was written (for debug headers). */
  cachedAtISO(key: string): string | null {
    const entry = this.store.get(key);
    return entry ? new Date(entry.cachedAt).toISOString() : null;
  }
}

export const serverCache = new SimpleServerCache();
