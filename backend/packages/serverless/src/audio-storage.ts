/**
 * Audio Storage Service
 * Handles audio upload to S3/Cloud Storage and signed URL generation
 */

import { StorageProvider } from './tts-generator';
import { EncryptionService, encryptAudioData } from './encryption';

export interface AudioStorageConfig {
  bucketName: string;
  region?: string;
  cdnDomain?: string;
  signedUrlExpirySeconds?: number;
  cacheControlMaxAge?: number;
  encryptionEnabled?: boolean;
  serverSideEncryption?: 'AES256' | 'aws:kms' | 'none';
  kmsKeyId?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

/**
 * Abstract base class for audio storage implementations
 */
export abstract class AudioStorageService implements StorageProvider {
  protected readonly config: AudioStorageConfig;
  protected encryptionService?: EncryptionService;
  
  constructor(config: AudioStorageConfig, encryptionService?: EncryptionService) {
    this.config = config;
    this.encryptionService = encryptionService;
  }
  
  /**
   * Upload audio to storage
   */
  abstract uploadAudio(audioData: Buffer, contentType: string): Promise<string>;
  
  /**
   * Generate signed URL for audio access
   */
  abstract generateSignedUrl(key: string, expirySeconds?: number): Promise<string>;
  
  /**
   * Delete audio from storage
   */
  abstract deleteAudio(key: string): Promise<void>;
  
  /**
   * Generate unique key for audio file
   */
  protected generateAudioKey(prefix: string = 'challenges'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}/${timestamp}-${random}.mp3`;
  }
  
  /**
   * Get CDN URL if configured, otherwise return storage URL
   */
  protected getCdnUrl(storageUrl: string): string {
    if (this.config.cdnDomain) {
      const url = new URL(storageUrl);
      return `https://${this.config.cdnDomain}${url.pathname}`;
    }
    return storageUrl;
  }
}

/**
 * AWS S3 Storage Implementation
 */
export class S3AudioStorage extends AudioStorageService {
  private s3Client: any; // AWS SDK S3 client
  
  constructor(config: AudioStorageConfig, s3Client?: any, encryptionService?: EncryptionService) {
    super(config, encryptionService);
    this.s3Client = s3Client;
  }
  
  /**
   * Upload audio to S3 with encryption
   */
  async uploadAudio(audioData: Buffer, contentType: string): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }
    
    const key = this.generateAudioKey();
    const cacheControl = `public, max-age=${this.config.cacheControlMaxAge || 86400}`;
    
    let dataToUpload = audioData;
    let metadata: any = {};
    
    // Apply client-side encryption if enabled
    if (this.config.encryptionEnabled && this.encryptionService) {
      const encrypted = encryptAudioData(audioData, this.encryptionService);
      dataToUpload = encrypted.encryptedData;
      metadata['x-amz-meta-encryption'] = encrypted.metadata;
    }
    
    const params: any = {
      Bucket: this.config.bucketName,
      Key: key,
      Body: dataToUpload,
      ContentType: contentType,
      CacheControl: cacheControl,
      Metadata: metadata
    };
    
    // Add server-side encryption
    if (this.config.serverSideEncryption && this.config.serverSideEncryption !== 'none') {
      params.ServerSideEncryption = this.config.serverSideEncryption;
      
      if (this.config.serverSideEncryption === 'aws:kms' && this.config.kmsKeyId) {
        params.SSEKMSKeyId = this.config.kmsKeyId;
      }
    }
    
    await this.s3Client.putObject(params).promise();
    
    // Generate signed URL for secure access
    const signedUrl = await this.generateSignedUrl(key);
    
    return this.getCdnUrl(signedUrl);
  }
  
  /**
   * Generate signed URL for S3 object
   */
  async generateSignedUrl(key: string, expirySeconds?: number): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }
    
    const expiry = expirySeconds || this.config.signedUrlExpirySeconds || 3600;
    
    const params = {
      Bucket: this.config.bucketName,
      Key: key,
      Expires: expiry
    };
    
    return this.s3Client.getSignedUrl('getObject', params);
  }
  
  /**
   * Delete audio from S3
   */
  async deleteAudio(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }
    
    const params = {
      Bucket: this.config.bucketName,
      Key: key
    };
    
    await this.s3Client.deleteObject(params).promise();
  }
}

/**
 * Google Cloud Storage Implementation
 */
export class GCSAudioStorage extends AudioStorageService {
  private storage: any; // Google Cloud Storage client
  
  constructor(config: AudioStorageConfig, storageClient?: any, encryptionService?: EncryptionService) {
    super(config, encryptionService);
    this.storage = storageClient;
  }
  
  /**
   * Upload audio to GCS with encryption
   */
  async uploadAudio(audioData: Buffer, contentType: string): Promise<string> {
    if (!this.storage) {
      throw new Error('GCS client not initialized');
    }
    
    const key = this.generateAudioKey();
    const bucket = this.storage.bucket(this.config.bucketName);
    const file = bucket.file(key);
    
    const cacheControl = `public, max-age=${this.config.cacheControlMaxAge || 86400}`;
    
    let dataToUpload = audioData;
    let customMetadata: any = {};
    
    // Apply client-side encryption if enabled
    if (this.config.encryptionEnabled && this.encryptionService) {
      const encrypted = encryptAudioData(audioData, this.encryptionService);
      dataToUpload = encrypted.encryptedData;
      customMetadata.encryption = encrypted.metadata;
    }
    
    const saveOptions: any = {
      contentType,
      metadata: {
        cacheControl,
        ...customMetadata
      }
    };
    
    // Add server-side encryption with KMS
    if (this.config.kmsKeyId) {
      saveOptions.kmsKeyName = this.config.kmsKeyId;
    }
    
    await file.save(dataToUpload, saveOptions);
    
    // Generate signed URL for secure access
    const signedUrl = await this.generateSignedUrl(key);
    
    return this.getCdnUrl(signedUrl);
  }
  
  /**
   * Generate signed URL for GCS object
   */
  async generateSignedUrl(key: string, expirySeconds?: number): Promise<string> {
    if (!this.storage) {
      throw new Error('GCS client not initialized');
    }
    
    const expiry = expirySeconds || this.config.signedUrlExpirySeconds || 3600;
    const bucket = this.storage.bucket(this.config.bucketName);
    const file = bucket.file(key);
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiry * 1000
    });
    
    return url;
  }
  
  /**
   * Delete audio from GCS
   */
  async deleteAudio(key: string): Promise<void> {
    if (!this.storage) {
      throw new Error('GCS client not initialized');
    }
    
    const bucket = this.storage.bucket(this.config.bucketName);
    const file = bucket.file(key);
    
    await file.delete();
  }
}

/**
 * In-memory storage for testing/development
 */
export class InMemoryAudioStorage extends AudioStorageService {
  private storage: Map<string, { data: Buffer; contentType: string }> = new Map();
  
  /**
   * Upload audio to memory
   */
  async uploadAudio(audioData: Buffer, contentType: string): Promise<string> {
    const key = this.generateAudioKey();
    
    this.storage.set(key, {
      data: audioData,
      contentType
    });
    
    // Return a mock URL
    return `https://storage.example.com/${this.config.bucketName}/${key}`;
  }
  
  /**
   * Generate mock signed URL
   */
  async generateSignedUrl(key: string, expirySeconds?: number): Promise<string> {
    const expiry = expirySeconds || this.config.signedUrlExpirySeconds || 3600;
    const expiryTime = Date.now() + expiry * 1000;
    
    return `https://storage.example.com/${this.config.bucketName}/${key}?expires=${expiryTime}`;
  }
  
  /**
   * Delete audio from memory
   */
  async deleteAudio(key: string): Promise<void> {
    this.storage.delete(key);
  }
  
  /**
   * Get audio data (for testing)
   */
  getAudio(key: string): { data: Buffer; contentType: string } | undefined {
    return this.storage.get(key);
  }
  
  /**
   * Clear all stored audio
   */
  clear(): void {
    this.storage.clear();
  }
}

/**
 * Audio cache manager for pre-generated challenges
 */
export class AudioCacheManager {
  private cache: Map<string, { url: string; timestamp: number }> = new Map();
  private readonly maxCacheSize: number;
  private readonly cacheExpiryMs: number;
  
  constructor(maxCacheSize: number = 100, cacheExpiryMs: number = 86400000) {
    this.maxCacheSize = maxCacheSize;
    this.cacheExpiryMs = cacheExpiryMs;
  }
  
  /**
   * Get cached audio URL for a phrase
   */
  get(phrase: string): string | undefined {
    const cached = this.cache.get(phrase);
    
    if (!cached) {
      return undefined;
    }
    
    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > this.cacheExpiryMs) {
      this.cache.delete(phrase);
      return undefined;
    }
    
    return cached.url;
  }
  
  /**
   * Set cached audio URL for a phrase
   */
  set(phrase: string, url: string): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(phrase, {
      url,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    const now = Date.now();
    
    for (const [phrase, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheExpiryMs) {
        this.cache.delete(phrase);
      }
    }
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}
