type Entry<T> = { value: T; expires: number }

export class TTLCache<T = unknown> {
  private store = new Map<string, Entry<T>>()

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const e = this.store.get(key)
    if (!e) return
    if (Date.now() > e.expires) {
      this.store.delete(key)
      return
    }
    return e.value
  }

  set(key: string, value: T) {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs })
  }

  has(key: string) {
    return this.get(key) !== undefined
  }

  size() {
    return this.store.size
  }
}

export const cacheSeconds = Number(process.env.CACHE_TTL_SECONDS || 60)
export const sharedCache = new TTLCache<any>(cacheSeconds * 1000)
