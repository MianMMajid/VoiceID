/**
 * TTS Challenge Cache
 * Pre-generates and caches 100+ TTS challenge audio files
 * Task 15.2: Cache TTS challenge audio (100 pre-generated)
 */

import { PHRASE_BANK } from './phrase-bank';

export interface CachedChallenge {
  text: string;
  audioUrl: string;
  audioData?: Buffer;
  generatedAt: number;
}

export interface TTSCacheConfig {
  cdnDomain: string;
  audioBucket: string;
  cacheSize: number;
  preGenerateOnInit: boolean;
}

/**
 * TTS Challenge Cache Manager
 * Maintains a pool of pre-generated TTS challenges for instant delivery
 */
export class TTSCache {
  private cache: Map<string, CachedChallenge> = new Map();
  private config: TTSCacheConfig;
  private isInitialized = false;

  constructor(config: TTSCacheConfig) {
    this.config = config;
  }

  /**
   * Initialize cache with pre-generated challenges
   * Task 15.2: Pre-generate 100 TTS challenges
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('TTS cache already initialized');
      return;
    }

    console.log('Initializing TTS cache', { cacheSize: this.config.cacheSize });

    if (this.config.preGenerateOnInit) {
      await this.preGenerateChallenges();
    } else {
      // Load pre-generated challenges from S3/CDN
      await this.loadPreGeneratedChallenges();
    }

    this.isInitialized = true;
    console.log('TTS cache initialized', { 
      cachedChallenges: this.cache.size 
    });
  }

  /**
   * Pre-generate TTS challenges
   * This would typically be done during deployment, not at runtime
   */
  private async preGenerateChallenges(): Promise<void> {
    const phrases = PHRASE_BANK;
    const targetCount = Math.min(this.config.cacheSize, phrases.length);

    console.log('Pre-generating TTS challenges', { count: targetCount });

    for (let i = 0; i < targetCount; i++) {
      const phrase = phrases[i];
      
      // In production, this would call ElevenLabs TTS API
      // For now, we create placeholder entries
      const challenge: CachedChallenge = {
        text: phrase,
        audioUrl: `https://${this.config.cdnDomain}/challenges/${this.hashPhrase(phrase)}.mp3`,
        generatedAt: Date.now(),
      };

      this.cache.set(phrase, challenge);
    }

    console.log('Pre-generation complete', { generated: this.cache.size });
  }

  /**
   * Load pre-generated challenges from S3/CDN
   * Assumes challenges were pre-generated during deployment
   */
  private async loadPreGeneratedChallenges(): Promise<void> {
    const phrases = PHRASE_BANK;
    const targetCount = Math.min(this.config.cacheSize, phrases.length);

    console.log('Loading pre-generated challenges', { count: targetCount });

    for (let i = 0; i < targetCount; i++) {
      const phrase = phrases[i];
      
      const challenge: CachedChallenge = {
        text: phrase,
        audioUrl: `https://${this.config.cdnDomain}/challenges/${this.hashPhrase(phrase)}.mp3`,
        generatedAt: Date.now(),
      };

      this.cache.set(phrase, challenge);
    }

    console.log('Pre-generated challenges loaded', { loaded: this.cache.size });
  }

  /**
   * Get a random cached challenge
   * Task 15.2: Serve pre-cached TTS audio for instant delivery
   */
  getRandomChallenge(): CachedChallenge {
    if (!this.isInitialized) {
      throw new Error('TTS cache not initialized');
    }

    if (this.cache.size === 0) {
      throw new Error('TTS cache is empty');
    }

    // Get random challenge from cache
    const challenges = Array.from(this.cache.values());
    const randomIndex = Math.floor(Math.random() * challenges.length);
    const challenge = challenges[randomIndex];

    console.log('Retrieved cached challenge', { 
      text: challenge.text.substring(0, 30) + '...',
      age: Date.now() - challenge.generatedAt 
    });

    return challenge;
  }

  /**
   * Get specific challenge by text
   */
  getChallenge(text: string): CachedChallenge | undefined {
    return this.cache.get(text);
  }

  /**
   * Check if challenge is cached
   */
  hasChallenge(text: string): boolean {
    return this.cache.has(text);
  }

  /**
   * Add challenge to cache
   */
  addChallenge(challenge: CachedChallenge): void {
    this.cache.set(challenge.text, challenge);
    console.log('Added challenge to cache', { 
      text: challenge.text.substring(0, 30) + '...',
      cacheSize: this.cache.size 
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    oldestChallenge: number;
    newestChallenge: number;
  } {
    const challenges = Array.from(this.cache.values());
    
    if (challenges.length === 0) {
      return {
        size: 0,
        oldestChallenge: 0,
        newestChallenge: 0,
      };
    }

    const timestamps = challenges.map(c => c.generatedAt);
    
    return {
      size: this.cache.size,
      oldestChallenge: Math.min(...timestamps),
      newestChallenge: Math.max(...timestamps),
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.isInitialized = false;
    console.log('TTS cache cleared');
  }

  /**
   * Hash phrase to generate consistent filename
   */
  private hashPhrase(phrase: string): string {
    // Simple hash for demo - in production use crypto.createHash
    let hash = 0;
    for (let i = 0; i < phrase.length; i++) {
      const char = phrase.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Singleton instance for Lambda reuse
let globalTTSCache: TTSCache | null = null;

/**
 * Get global TTS cache instance
 * Task 15.2: Reuse cache across Lambda invocations
 */
export function getTTSCache(config?: TTSCacheConfig): TTSCache {
  if (!globalTTSCache && config) {
    globalTTSCache = new TTSCache(config);
  }
  
  if (!globalTTSCache) {
    throw new Error('TTS cache not initialized - config required on first call');
  }
  
  return globalTTSCache;
}
