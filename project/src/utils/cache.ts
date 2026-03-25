/**
 * Cache utilitário com TTL baseado em localStorage.
 * TTL padrão: 6 horas — alinhado com as janelas de atualização do run_daily (12h e 18:30).
 */

export const CACHE_TTL = {
  SIX_HOURS: 6 * 60 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  THIRTY_MIN: 30 * 60 * 1000,
} as const;

const PREFIX = 'copiloto:cache:';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export const cache = {
  set<T>(key: string, data: T, ttl: number = CACHE_TTL.SIX_HOURS): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // localStorage cheio — opera sem cache
    }
  },

  get<T>(key: string): T | null {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }

    return entry.data as T;
  },

  invalidate(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },

  invalidateAll(): void {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};
