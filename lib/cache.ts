type Entry<T> = {
  value: T;
  expires: number;
};

export class TTLCache<T = unknown> {
  private store = new Map<string, Entry<T>>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T) {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  has(key: string) {
    return this.get(key) !== undefined;
  }

  size() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }
}

export const cacheSeconds = Number(process.env.CACHE_TTL_SECONDS || 60);
export const sharedCache = new TTLCache<any>(cacheSeconds * 1000);
