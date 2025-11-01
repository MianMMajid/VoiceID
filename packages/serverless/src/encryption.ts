/**
 * Encryption Service
 * Handles data encryption at rest and key management
 */

import * as crypto from 'crypto';

export interface EncryptionConfig {
  algorithm?: string;
  keyRotationDays?: number;
  kmsKeyId?: string; // AWS KMS or GCP KMS key ID
}

export interface EncryptedData {
  data: Buffer;
  iv: Buffer;
  keyVersion: string;
  algorithm: string;
}

export interface EncryptionKey {
  id: string;
  key: Buffer;
  createdAt: number;
  expiresAt: number;
  version: string;
}

/**
 * Encryption service for data at rest
 */
export class EncryptionService {
  private readonly algorithm: string;
  private readonly keyRotationMs: number;
  private currentKey: EncryptionKey | null = null;
  private keyHistory: Map<string, EncryptionKey> = new Map();
  
  constructor(config: EncryptionConfig = {}) {
    this.algorithm = config.algorithm || 'aes-256-gcm';
    this.keyRotationMs = (config.keyRotationDays || 90) * 24 * 60 * 60 * 1000;
  }
  
  /**
   * Initialize encryption service with a master key
   */
  initialize(masterKey: Buffer): void {
    this.currentKey = this.generateKey(masterKey);
  }
  
  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: Buffer): EncryptedData {
    if (!this.currentKey) {
      throw new Error('Encryption service not initialized');
    }
    
    // Check if key rotation is needed
    if (this.isKeyExpired(this.currentKey)) {
      this.rotateKey();
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.currentKey.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    // Get auth tag for GCM mode
    const authTag = (cipher as any).getAuthTag();
    
    return {
      data: Buffer.concat([encrypted, authTag]),
      iv,
      keyVersion: this.currentKey.version,
      algorithm: this.algorithm
    };
  }
  
  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData): Buffer {
    const key = this.getKeyByVersion(encryptedData.keyVersion);
    
    if (!key) {
      throw new Error(`Encryption key version ${encryptedData.keyVersion} not found`);
    }
    
    // Split data and auth tag (last 16 bytes)
    const authTag = encryptedData.data.slice(-16);
    const ciphertext = encryptedData.data.slice(0, -16);
    
    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm,
      key.key,
      encryptedData.iv
    );
    
    (decipher as any).setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
  }
  
  /**
   * Generate a new encryption key
   */
  private generateKey(masterKey: Buffer): EncryptionKey {
    const version = `v${Date.now()}`;
    const keyId = crypto.randomBytes(16).toString('hex');
    
    // Derive key from master key using PBKDF2
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
    
    const now = Date.now();
    
    return {
      id: keyId,
      key,
      createdAt: now,
      expiresAt: now + this.keyRotationMs,
      version
    };
  }
  
  /**
   * Rotate encryption key
   */
  rotateKey(): void {
    if (!this.currentKey) {
      throw new Error('No current key to rotate');
    }
    
    // Store old key in history
    this.keyHistory.set(this.currentKey.version, this.currentKey);
    
    // Generate new key from current key
    this.currentKey = this.generateKey(this.currentKey.key);
    
    // Clean up expired keys from history
    this.cleanupExpiredKeys();
  }
  
  /**
   * Check if key is expired
   */
  private isKeyExpired(key: EncryptionKey): boolean {
    return Date.now() > key.expiresAt;
  }
  
  /**
   * Get key by version
   */
  private getKeyByVersion(version: string): EncryptionKey | null {
    if (this.currentKey?.version === version) {
      return this.currentKey;
    }
    
    return this.keyHistory.get(version) || null;
  }
  
  /**
   * Clean up expired keys from history
   */
  private cleanupExpiredKeys(): void {
    const now = Date.now();
    const retentionMs = 90 * 24 * 60 * 60 * 1000; // 90 days
    
    for (const [version, key] of this.keyHistory.entries()) {
      if (now - key.createdAt > retentionMs) {
        this.keyHistory.delete(version);
      }
    }
  }
  
  /**
   * Get current key version
   */
  getCurrentKeyVersion(): string {
    if (!this.currentKey) {
      throw new Error('Encryption service not initialized');
    }
    return this.currentKey.version;
  }
  
  /**
   * Get key rotation status
   */
  getKeyRotationStatus(): {
    currentVersion: string;
    expiresAt: number;
    daysUntilRotation: number;
  } {
    if (!this.currentKey) {
      throw new Error('Encryption service not initialized');
    }
    
    const msUntilRotation = this.currentKey.expiresAt - Date.now();
    const daysUntilRotation = Math.ceil(msUntilRotation / (24 * 60 * 60 * 1000));
    
    return {
      currentVersion: this.currentKey.version,
      expiresAt: this.currentKey.expiresAt,
      daysUntilRotation
    };
  }
}

/**
 * TLS configuration for API endpoints
 */
export interface TLSConfig {
  minVersion: string;
  cipherSuites?: string[];
  requireClientCert?: boolean;
}

/**
 * Get recommended TLS 1.3 configuration
 */
export function getTLS13Config(): TLSConfig {
  return {
    minVersion: 'TLSv1.3',
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256'
    ],
    requireClientCert: false
  };
}

/**
 * Encrypt audio data for storage
 */
export function encryptAudioData(
  audioData: Buffer,
  encryptionService: EncryptionService
): { encryptedData: Buffer; metadata: string } {
  const encrypted = encryptionService.encrypt(audioData);
  
  // Create metadata JSON with encryption info
  const metadata = JSON.stringify({
    iv: encrypted.iv.toString('base64'),
    keyVersion: encrypted.keyVersion,
    algorithm: encrypted.algorithm
  });
  
  return {
    encryptedData: encrypted.data,
    metadata
  };
}

/**
 * Decrypt audio data from storage
 */
export function decryptAudioData(
  encryptedData: Buffer,
  metadata: string,
  encryptionService: EncryptionService
): Buffer {
  const meta = JSON.parse(metadata);
  
  const encrypted: EncryptedData = {
    data: encryptedData,
    iv: Buffer.from(meta.iv, 'base64'),
    keyVersion: meta.keyVersion,
    algorithm: meta.algorithm
  };
  
  return encryptionService.decrypt(encrypted);
}
