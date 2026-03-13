// In-memory cache fallback (no Redis/Valkey required)
const memoryCache = new Map<string, { value: string; expiry: number }>();

export const cache = {
  set(key: string, value: string, _ex?: string, _ttl?: number): void {
    const ttl = _ttl || 60;
    memoryCache.set(key, { value, expiry: Date.now() + ttl * 1000 });
  },
  async get(key: string): Promise<string | null> {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  },
  del(key: string): void {
    memoryCache.delete(key);
  }
};

console.log("Using in-memory cache (no Redis required).");
