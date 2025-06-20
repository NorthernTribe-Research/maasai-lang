interface CacheItem<T> {
  data: T;
  expires: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expires });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();

// Run cleanup every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);