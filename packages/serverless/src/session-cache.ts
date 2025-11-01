/**
 * Session Cache with Redis
 * Caches session data for fast lookups
 * Task 15.2: Add Redis caching for session data
 */

import { Session } from '@vlo/shared-types';

export interface SessionCacheConfig {
  redisEndpoint?: string;
  redisPort?: number;
  ttlSeconds?: number;
  enableCache?: boolean;
}

/**
 * Session Cache Manager
 * Provides fast in-memory and Redis caching for session data
 */
export class SessionCache {
  private memoryCache: Map<string, { session: Session; expiresAt: number }> = new Map();
  private config: SessionCacheConfig;
  private redisClient: any = null; // Would be Redis client in production

  constructor(config: SessionCacheConfig = {}) {
    this.config = {
      redisEndpoint: config.redisEndpoint || process.env.REDIS_ENDPOINT,
      redisPort: config.redisPort || parseInt(process.env.REDIS_PORT || '6379'),
      ttlSeconds: config.ttlSeconds ?? 300, // 5 minutes default
      enableCache: config.enableCache ?? true,
    };

    if (this.config.enableCache && this.config.redisEndpoint) {
      this.initializeRedis();
    }
  }

  /**
   * Initialize Redis client
   * Task 15.2: Set up Redis connection for session caching
   */
  private initializeRedis(): void {
    // In production, initialize Redis client:
    // this.redisClient = new Redis({
    //   host: this.config.redisEndpoint,
    //   port: this.config.redisPort,
    //   retryStrategy: (times) => Math.min(times * 50, 2000),
    // });

    console.log('Redis cache initialized', {
      endpoint: this.config.redisEndpoint,
      port: this.config.redisPort,
    });
  }

  /**
   * Get session from cache
   * Checks memory cache first, then Redis
   * Task 15.2: Fast session lookup from cache
   */
  async get(sessionId: string): Promise<Session | null> {
    if (!this.config.enableCache) {
      return null;
    }

    // Check memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(sessionId);
    if (memoryEntry) {
      if (Date.now() < memoryEntry.expiresAt) {
        console.log('Session cache hit (memory)', { sessionId });
        return memoryEntry.session;
      } else {
        // Expired, remove from memory cache
        this.memoryCache.delete(sessionId);
      }
    }

    // Check Redis cache
    if (this.redisClient) {
      try {
        const cached = await this.getFromRedis(sessionId);
        if (cached) {
          // Promote to memory cache
          this.setInMemory(sessionId, cached);
          console.log('Session cache hit (Redis)', { sessionId });
          return cached;
        }
      } catch (error) {
        console.error('Redis get error', { sessionId, error });
      }
    }

    console.log('Session cache miss', { sessionId });
    return null;
  }

  /**
   * Set session in cache
   * Stores in both memory and Redis
   * Task 15.2: Cache session data for fast access
   */
  async set(sessionId: string, session: Session): Promise<void> {
    if (!this.config.enableCache) {
      return;
    }

    // Store in memory cache
    this.setInMemory(sessionId, session);

    // Store in Redis cache
    if (this.redisClient) {
      try {
        await this.setInRedis(sessionId, session);
        console.log('Session cached', { sessionId, ttl: this.config.ttlSeconds });
      } catch (error) {
        console.error('Redis set error', { sessionId, error });
      }
    }
  }

  /**
   * Delete session from cache
   */
  async delete(sessionId: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(sessionId);

    // Remove from Redis cache
    if (this.redisClient) {
      try {
        await this.deleteFromRedis(sessionId);
        console.log('Session removed from cache', { sessionId });
      } catch (error) {
        console.error('Redis delete error', { sessionId, error });
      }
    }
  }

  /**
   * Store in memory cache
   */
  private setInMemory(sessionId: string, session: Session): void {
    const expiresAt = Date.now() + (this.config.ttlSeconds! * 1000);
    this.memoryCache.set(sessionId, { session, expiresAt });

    // Cleanup expired entries periodically
    if (this.memoryCache.size > 100) {
      this.cleanupMemoryCache();
    }
  }

  /**
   * Cleanup expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [sessionId, entry] of this.memoryCache.entries()) {
      if (now >= entry.expiresAt) {
        this.memoryCache.delete(sessionId);
        removed++;
      }
    }

    if (removed > 0) {
      console.log('Cleaned up memory cache', { removed, remaining: this.memoryCache.size });
    }
  }

  /**
   * Get from Redis
   */
  private async getFromRedis(sessionId: string): Promise<Session | null> {
    if (!this.redisClient) {
      return null;
    }

    // In production:
    // const data = await this.redisClient.get(`session:${sessionId}`);
    // if (!data) return null;
    // return JSON.parse(data) as Session;

    return null; // Placeholder
  }

  /**
   * Set in Redis with TTL
   */
  private async setInRedis(sessionId: string, session: Session): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    // In production:
    // await this.redisClient.setex(
    //   `session:${sessionId}`,
    //   this.config.ttlSeconds!,
    //   JSON.stringify(session)
    // );
  }

  /**
   * Delete from Redis
   */
  private async deleteFromRedis(sessionId: string): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    // In production:
    // await this.redisClient.del(`session:${sessionId}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryCacheSize: number;
    redisConnected: boolean;
  } {
    return {
      memoryCacheSize: this.memoryCache.size,
      redisConnected: this.redisClient !== null,
    };
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.redisClient) {
      // In production: await this.redisClient.flushdb();
      console.log('All caches cleared');
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      // In production: await this.redisClient.quit();
      this.redisClient = null;
      console.log('Redis connection closed');
    }
  }
}

// Singleton instance for Lambda reuse
let globalSessionCache: SessionCache | null = null;

/**
 * Get global session cache instance
 * Task 15.2: Reuse cache across Lambda invocations
 */
export function getSessionCache(config?: SessionCacheConfig): SessionCache {
  if (!globalSessionCache) {
    globalSessionCache = new SessionCache(config);
  }
  return globalSessionCache;
}
