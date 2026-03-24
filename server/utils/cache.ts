interface CacheItem<T> {
  data: T;
  expires: number;
  createdAt: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Enhanced memory cache with TTL, statistics, and cache invalidation strategies
 * Requirements: 23.2
 */
class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private stats = { hits: 0, misses: 0 };
  
  // Cache TTL configurations (in milliseconds)
  private readonly TTL = {
    AI_CONTENT: 60 * 60 * 1000,      // 1 hour - AI-generated content
    CURRICULUM: 24 * 60 * 60 * 1000,  // 24 hours - Curriculum data (relatively static)
    LESSON: 12 * 60 * 60 * 1000,      // 12 hours - Lesson content
    EXERCISE: 30 * 60 * 1000,         // 30 minutes - Exercise data
    USER_PROFILE: 5 * 60 * 1000,      // 5 minutes - User profile data
    DEFAULT: 5 * 60 * 1000            // 5 minutes - Default TTL
  };

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.TTL.DEFAULT);
    this.cache.set(key, { 
      data, 
      expires, 
      createdAt: Date.now(),
      hits: 0 
    });
  }

  /**
   * Get a value from cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.logCacheMiss(key);
      return null;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      this.logCacheMiss(key);
      return null;
    }

    item.hits++;
    this.stats.hits++;
    this.logCacheHit(key);
    return item.data;
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all cache entries matching a pattern
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);
    
    this.cache.forEach((_item, key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    });
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Clean expired items
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((item, key) => {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
    };
  }

  /**
   * Get TTL configuration
   */
  getTTL(type: keyof typeof this.TTL): number {
    return this.TTL[type];
  }

  /**
   * Invalidate cache for a specific user profile
   */
  invalidateProfile(profileId: string): void {
    this.deletePattern(`^profile:${profileId}`);
    this.deletePattern(`^curriculum:${profileId}`);
    this.deletePattern(`^lesson:.*:${profileId}`);
  }

  /**
   * Invalidate cache for a specific curriculum
   */
  invalidateCurriculum(curriculumId: string): void {
    this.deletePattern(`^curriculum:${curriculumId}`);
    this.deletePattern(`^lesson:${curriculumId}`);
  }

  /**
   * Log cache hit
   */
  private logCacheHit(key: string): void {
    console.log(`[Cache HIT] ${key}`);
  }

  /**
   * Log cache miss
   */
  private logCacheMiss(key: string): void {
    console.log(`[Cache MISS] ${key}`);
  }
}

export const cache = new MemoryCache();

// Run cleanup every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);

// Log cache statistics every hour
setInterval(() => {
  const stats = cache.getStats();
  console.log('[Cache Stats]', {
    hits: stats.hits,
    misses: stats.misses,
    size: stats.size,
    hitRate: `${stats.hitRate.toFixed(2)}%`
  });
}, 60 * 60 * 1000);
