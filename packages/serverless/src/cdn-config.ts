import * as crypto from 'crypto';

/**
 * CDN configuration
 */
export interface CDNConfig {
  distributionDomain: string;
  signingKeyId: string;
  privateKey: string;
  defaultExpiration: number; // seconds
  audioBucket: string;
  audioPrefix: string;
}

/**
 * Signed URL options
 */
export interface SignedURLOptions {
  expiresIn?: number; // seconds
  ipAddress?: string;
  customPolicy?: boolean;
}

/**
 * CDN Manager for audio delivery
 */
export class CDNManager {
  private config: CDNConfig;

  constructor(config: CDNConfig) {
    this.config = config;
  }

  /**
   * Generate signed URL for audio file
   */
  generateSignedURL(audioKey: string, options: SignedURLOptions = {}): string {
    const expiresIn = options.expiresIn || this.config.defaultExpiration;
    const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;

    const url = `https://${this.config.distributionDomain}/${this.config.audioPrefix}/${audioKey}`;

    if (options.customPolicy || options.ipAddress) {
      return this.generateCustomPolicySignedURL(url, expirationTime, options.ipAddress);
    }

    return this.generateCannedPolicySignedURL(url, expirationTime);
  }

  /**
   * Generate signed URL with canned policy (simpler, most common)
   */
  private generateCannedPolicySignedURL(url: string, expirationTime: number): string {
    const policy = this.createCannedPolicy(url, expirationTime);
    const signature = this.signPolicy(policy);
    const encodedSignature = this.encodeSignature(signature);

    return `${url}?Expires=${expirationTime}&Signature=${encodedSignature}&Key-Pair-Id=${this.config.signingKeyId}`;
  }

  /**
   * Generate signed URL with custom policy (for IP restrictions, etc.)
   */
  private generateCustomPolicySignedURL(url: string, expirationTime: number, ipAddress?: string): string {
    const policy = this.createCustomPolicy(url, expirationTime, ipAddress);
    const encodedPolicy = this.encodePolicy(policy);
    const signature = this.signPolicy(policy);
    const encodedSignature = this.encodeSignature(signature);

    return `${url}?Policy=${encodedPolicy}&Signature=${encodedSignature}&Key-Pair-Id=${this.config.signingKeyId}`;
  }

  /**
   * Create canned policy
   */
  private createCannedPolicy(url: string, expirationTime: number): string {
    return JSON.stringify({
      Statement: [
        {
          Resource: url,
          Condition: {
            DateLessThan: {
              'AWS:EpochTime': expirationTime
            }
          }
        }
      ]
    });
  }

  /**
   * Create custom policy
   */
  private createCustomPolicy(url: string, expirationTime: number, ipAddress?: string): string {
    const condition: any = {
      DateLessThan: {
        'AWS:EpochTime': expirationTime
      }
    };

    if (ipAddress) {
      condition.IpAddress = {
        'AWS:SourceIp': ipAddress
      };
    }

    return JSON.stringify({
      Statement: [
        {
          Resource: url,
          Condition: condition
        }
      ]
    });
  }

  /**
   * Sign policy with private key
   */
  private signPolicy(policy: string): Buffer {
    const sign = crypto.createSign('RSA-SHA1');
    sign.update(policy);
    return sign.sign(this.config.privateKey);
  }

  /**
   * Encode signature for URL
   */
  private encodeSignature(signature: Buffer): string {
    return signature
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/=/g, '_')
      .replace(/\//g, '~');
  }

  /**
   * Encode policy for URL
   */
  private encodePolicy(policy: string): string {
    return Buffer.from(policy)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/=/g, '_')
      .replace(/\//g, '~');
  }

  /**
   * Get audio URL (without signing, for public access)
   */
  getAudioURL(audioKey: string): string {
    return `https://${this.config.distributionDomain}/${this.config.audioPrefix}/${audioKey}`;
  }

  /**
   * Generate cache key for audio file
   */
  generateCacheKey(challengePhrase: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(challengePhrase);
    return hash.digest('hex');
  }

  /**
   * Get audio key from challenge phrase
   */
  getAudioKeyFromPhrase(challengePhrase: string): string {
    const cacheKey = this.generateCacheKey(challengePhrase);
    return `${cacheKey}.mp3`;
  }
}

/**
 * Cache configuration for CDN
 */
export interface CacheConfig {
  maxAge: number; // seconds
  sMaxAge: number; // seconds (shared cache)
  staleWhileRevalidate: number; // seconds
  staleIfError: number; // seconds
}

/**
 * CDN cache manager
 */
export class CDNCacheManager {
  /**
   * Get cache control headers for audio files
   */
  static getCacheHeaders(config: CacheConfig): Record<string, string> {
    const cacheControl = [
      `max-age=${config.maxAge}`,
      `s-maxage=${config.sMaxAge}`,
      `stale-while-revalidate=${config.staleWhileRevalidate}`,
      `stale-if-error=${config.staleIfError}`,
      'public'
    ].join(', ');

    return {
      'Cache-Control': cacheControl,
      'Content-Type': 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Max-Age': '86400'
    };
  }

  /**
   * Get default cache configuration for challenge audio
   * Task 15.2: Implement CDN caching for static assets
   */
  static getDefaultCacheConfig(): CacheConfig {
    return {
      maxAge: 3600,           // 1 hour browser cache
      sMaxAge: 86400,         // 24 hours CDN cache
      staleWhileRevalidate: 3600,  // 1 hour stale while revalidating
      staleIfError: 86400     // 24 hours stale if error
    };
  }

  /**
   * Get aggressive cache configuration for pre-generated challenges
   * Task 15.2: Cache TTS challenge audio (100 pre-generated)
   */
  static getAggressiveCacheConfig(): CacheConfig {
    return {
      maxAge: 86400,          // 24 hours browser cache
      sMaxAge: 604800,        // 7 days CDN cache
      staleWhileRevalidate: 86400,  // 24 hours stale while revalidating
      staleIfError: 604800    // 7 days stale if error
    };
  }

  /**
   * Invalidate cache for specific audio files
   */
  static createInvalidationPaths(audioKeys: string[]): string[] {
    return audioKeys.map(key => `/${key}`);
  }
}

/**
 * Create default CDN configuration
 */
export function createDefaultCDNConfig(): CDNConfig {
  return {
    distributionDomain: process.env.CDN_DOMAIN || 'cdn.example.com',
    signingKeyId: process.env.CDN_KEY_ID || 'APKAEXAMPLE',
    privateKey: process.env.CDN_PRIVATE_KEY || '',
    defaultExpiration: 300, // 5 minutes
    audioBucket: process.env.AUDIO_BUCKET || 'vlo-audio',
    audioPrefix: 'challenges'
  };
}

/**
 * Audio storage interface
 */
export interface AudioStorage {
  uploadAudio(key: string, audioData: Buffer, metadata?: Record<string, string>): Promise<string>;
  getAudioURL(key: string): Promise<string>;
  deleteAudio(key: string): Promise<void>;
}

/**
 * CDN-backed audio storage
 */
export class CDNAudioStorage implements AudioStorage {
  private cdnManager: CDNManager;
  private cacheConfig: CacheConfig;

  constructor(cdnManager: CDNManager, cacheConfig?: CacheConfig) {
    this.cdnManager = cdnManager;
    this.cacheConfig = cacheConfig || CDNCacheManager.getDefaultCacheConfig();
  }

  /**
   * Upload audio and return CDN URL
   */
  async uploadAudio(key: string, audioData: Buffer, metadata?: Record<string, string>): Promise<string> {
    // In a real implementation, this would upload to S3/Cloud Storage
    // For now, we'll return a signed URL
    console.log(`Uploading audio: ${key}, size: ${audioData.length} bytes`);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return this.cdnManager.generateSignedURL(key, {
      expiresIn: 300 // 5 minutes
    });
  }

  /**
   * Get signed URL for audio
   */
  async getAudioURL(key: string): Promise<string> {
    return this.cdnManager.generateSignedURL(key, {
      expiresIn: 300 // 5 minutes
    });
  }

  /**
   * Delete audio from storage
   */
  async deleteAudio(key: string): Promise<void> {
    // In a real implementation, this would delete from S3/Cloud Storage
    console.log(`Deleting audio: ${key}`);
  }

  /**
   * Get cache headers for response
   */
  getCacheHeaders(): Record<string, string> {
    return CDNCacheManager.getCacheHeaders(this.cacheConfig);
  }
}
