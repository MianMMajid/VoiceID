/**
 * Model Weight Caching Utility
 * Caches ML model weights in Lambda /tmp directory and memory
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number;
}

interface ModelCacheConfig {
  tmpDir: string;
  maxMemoryCacheSizeMB: number;
  maxDiskCacheSizeMB: number;
  ttlSeconds: number;
}

const DEFAULT_CONFIG: ModelCacheConfig = {
  tmpDir: '/tmp/models',
  maxMemoryCacheSizeMB: 512,
  maxDiskCacheSizeMB: 1536,
  ttlSeconds: 3600, // 1 hour
};

/**
 * Model cache manager for Lambda functions
 * Implements two-tier caching: memory and /tmp disk
 */
export class ModelCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private config: ModelCacheConfig;
  private memoryCacheSizeBytes = 0;

  constructor(config: Partial<ModelCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureTmpDir();
  }

  /**
   * Ensure /tmp directory exists
   */
  private ensureTmpDir(): void {
    if (!fs.existsSync(this.config.tmpDir)) {
      fs.mkdirSync(this.config.tmpDir, { recursive: true });
      console.log('Created model cache directory', { path: this.config.tmpDir });
    }
  }

  /**
   * Get cache key hash
   */
  private getCacheKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get file path for disk cache
   */
  private getDiskPath(key: string): string {
    const hash = this.getCacheKey(key);
    return path.join(this.config.tmpDir, hash);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(timestamp: number): boolean {
    const age = (Date.now() - timestamp) / 1000;
    return age > this.config.ttlSeconds;
  }

  /**
   * Get estimated size of object in bytes
   */
  private getSize(data: any): number {
    if (Buffer.isBuffer(data)) {
      return data.length;
    }
    // Rough estimate for objects
    return JSON.stringify(data).length * 2;
  }

  /**
   * Evict oldest entries from memory cache if needed
   */
  private evictMemoryCache(requiredBytes: number): void {
    const maxBytes = this.config.maxMemoryCacheSizeMB * 1024 * 1024;
    
    if (this.memoryCacheSizeBytes + requiredBytes <= maxBytes) {
      return;
    }

    // Sort by timestamp (oldest first)
    const entries = Array.from(this.memoryCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    for (const [key, entry] of entries) {
      this.memoryCache.delete(key);
      this.memoryCacheSizeBytes -= entry.size;
      console.log('Evicted from memory cache', { key, size: entry.size });

      if (this.memoryCacheSizeBytes + requiredBytes <= maxBytes) {
        break;
      }
    }
  }

  /**
   * Get from memory cache
   */
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry.timestamp)) {
      this.memoryCache.delete(key);
      this.memoryCacheSizeBytes -= entry.size;
      console.log('Memory cache entry expired', { key });
      return null;
    }

    console.log('Memory cache hit', { key, age: Date.now() - entry.timestamp });
    return entry.data as T;
  }

  /**
   * Set in memory cache
   */
  private setInMemory<T>(key: string, data: T): void {
    const size = this.getSize(data);
    this.evictMemoryCache(size);

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });

    this.memoryCacheSizeBytes += size;
    console.log('Stored in memory cache', { key, size, totalSize: this.memoryCacheSizeBytes });
  }

  /**
   * Get from disk cache
   */
  private getFromDisk<T>(key: string): T | null {
    const diskPath = this.getDiskPath(key);

    if (!fs.existsSync(diskPath)) {
      return null;
    }

    try {
      const stats = fs.statSync(diskPath);
      const age = (Date.now() - stats.mtimeMs) / 1000;

      if (age > this.config.ttlSeconds) {
        fs.unlinkSync(diskPath);
        console.log('Disk cache entry expired', { key, age });
        return null;
      }

      const buffer = fs.readFileSync(diskPath);
      const data = JSON.parse(buffer.toString()) as T;
      
      console.log('Disk cache hit', { key, age, size: stats.size });
      
      // Promote to memory cache
      this.setInMemory(key, data);
      
      return data;
    } catch (error) {
      console.error('Error reading from disk cache', { key, error });
      return null;
    }
  }

  /**
   * Set in disk cache
   */
  private setInDisk<T>(key: string, data: T): void {
    const diskPath = this.getDiskPath(key);

    try {
      const json = JSON.stringify(data);
      fs.writeFileSync(diskPath, json);
      console.log('Stored in disk cache', { key, path: diskPath, size: json.length });
    } catch (error) {
      console.error('Error writing to disk cache', { key, error });
    }
  }

  /**
   * Get from cache (memory -> disk -> null)
   */
  public get<T>(key: string): T | null {
    // Try memory cache first
    const memoryData = this.getFromMemory<T>(key);
    if (memoryData !== null) {
      return memoryData;
    }

    // Try disk cache
    const diskData = this.getFromDisk<T>(key);
    if (diskData !== null) {
      return diskData;
    }

    console.log('Cache miss', { key });
    return null;
  }

  /**
   * Set in cache (both memory and disk)
   */
  public set<T>(key: string, data: T): void {
    this.setInMemory(key, data);
    this.setInDisk(key, data);
  }

  /**
   * Get or compute value with caching
   */
  public async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    console.log('Computing value for cache', { key });
    const data = await compute();
    this.set(key, data);
    return data;
  }

  /**
   * Clear all caches
   */
  public clear(): void {
    // Clear memory cache
    this.memoryCache.clear();
    this.memoryCacheSizeBytes = 0;

    // Clear disk cache
    try {
      const files = fs.readdirSync(this.config.tmpDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.config.tmpDir, file));
      }
      console.log('Cleared all caches', { filesDeleted: files.length });
    } catch (error) {
      console.error('Error clearing disk cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    memoryEntries: number;
    memorySizeMB: number;
    diskEntries: number;
    diskSizeMB: number;
  } {
    let diskEntries = 0;
    let diskSizeBytes = 0;

    try {
      const files = fs.readdirSync(this.config.tmpDir);
      diskEntries = files.length;
      
      for (const file of files) {
        const stats = fs.statSync(path.join(this.config.tmpDir, file));
        diskSizeBytes += stats.size;
      }
    } catch (error) {
      console.error('Error getting disk cache stats', { error });
    }

    return {
      memoryEntries: this.memoryCache.size,
      memorySizeMB: this.memoryCacheSizeBytes / (1024 * 1024),
      diskEntries,
      diskSizeMB: diskSizeBytes / (1024 * 1024),
    };
  }
}

// Singleton instance for Lambda function reuse
let globalCache: ModelCache | null = null;

/**
 * Get global model cache instance
 */
export function getModelCache(config?: Partial<ModelCacheConfig>): ModelCache {
  if (!globalCache) {
    globalCache = new ModelCache(config);
    console.log('Initialized global model cache');
  }
  return globalCache;
}
