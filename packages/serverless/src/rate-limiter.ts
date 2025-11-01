/**
 * Rate Limiting and DDoS Protection Service
 * Implements per-user and per-IP rate limiting with device fingerprinting
 */

export interface RateLimitConfig {
  perUserLimits: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  perIPLimits: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  enableDeviceFingerprinting: boolean;
  enableCaptcha: boolean;
  captchaThreshold: number; // Number of failed attempts before requiring CAPTCHA
  blockDuration: number; // Duration in seconds to block after exceeding limits
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  requiresCaptcha: boolean;
  reason?: string;
}

export interface RateLimitStore {
  increment(key: string, ttl: number): Promise<number>;
  get(key: string): Promise<number>;
  set(key: string, value: number, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  screenResolution?: string;
  timezone?: string;
  platform?: string;
  plugins?: string[];
}

/**
 * Rate limiter service with DDoS protection
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private store: RateLimitStore;
  private blockedIPs: Set<string> = new Set();
  private blockedDevices: Set<string> = new Set();
  
  constructor(config: RateLimitConfig, store: RateLimitStore) {
    this.config = config;
    this.store = store;
  }
  
  /**
   * Check rate limits for a request
   */
  async checkRateLimit(
    userId: string | null,
    ipAddress: string,
    deviceFingerprint?: DeviceFingerprint
  ): Promise<RateLimitResult> {
    // Check if IP is blocked
    if (this.blockedIPs.has(ipAddress)) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + this.config.blockDuration * 1000,
        requiresCaptcha: true,
        reason: 'IP address blocked due to excessive requests'
      };
    }
    
    // Check if device is blocked
    if (deviceFingerprint && this.blockedDevices.has(deviceFingerprint.id)) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + this.config.blockDuration * 1000,
        requiresCaptcha: true,
        reason: 'Device blocked due to suspicious activity'
      };
    }
    
    // Check per-IP rate limits
    const ipLimitResult = await this.checkIPRateLimit(ipAddress);
    if (!ipLimitResult.allowed) {
      // Block IP if limits exceeded
      await this.blockIP(ipAddress);
      return ipLimitResult;
    }
    
    // Check per-user rate limits if user is authenticated
    if (userId) {
      const userLimitResult = await this.checkUserRateLimit(userId);
      if (!userLimitResult.allowed) {
        return userLimitResult;
      }
    }
    
    // Check if CAPTCHA is required based on failed attempts
    const requiresCaptcha = await this.shouldRequireCaptcha(userId, ipAddress);
    
    return {
      allowed: true,
      remaining: ipLimitResult.remaining,
      resetAt: ipLimitResult.resetAt,
      requiresCaptcha
    };
  }
  
  /**
   * Check per-IP rate limits
   */
  private async checkIPRateLimit(ipAddress: string): Promise<RateLimitResult> {
    const now = Date.now();
    
    // Check per-minute limit
    const minuteKey = `ratelimit:ip:${ipAddress}:minute:${Math.floor(now / 60000)}`;
    const minuteCount = await this.store.increment(minuteKey, 60);
    
    if (minuteCount > this.config.perIPLimits.perMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil(now / 60000) * 60000,
        requiresCaptcha: true,
        reason: 'Per-IP per-minute rate limit exceeded'
      };
    }
    
    // Check per-hour limit
    const hourKey = `ratelimit:ip:${ipAddress}:hour:${Math.floor(now / 3600000)}`;
    const hourCount = await this.store.increment(hourKey, 3600);
    
    if (hourCount > this.config.perIPLimits.perHour) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil(now / 3600000) * 3600000,
        requiresCaptcha: true,
        reason: 'Per-IP per-hour rate limit exceeded'
      };
    }
    
    // Check per-day limit
    const dayKey = `ratelimit:ip:${ipAddress}:day:${Math.floor(now / 86400000)}`;
    const dayCount = await this.store.increment(dayKey, 86400);
    
    if (dayCount > this.config.perIPLimits.perDay) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil(now / 86400000) * 86400000,
        requiresCaptcha: true,
        reason: 'Per-IP per-day rate limit exceeded'
      };
    }
    
    return {
      allowed: true,
      remaining: this.config.perIPLimits.perMinute - minuteCount,
      resetAt: Math.ceil(now / 60000) * 60000,
      requiresCaptcha: false
    };
  }
  
  /**
   * Check per-user rate limits
   */
  private async checkUserRateLimit(userId: string): Promise<RateLimitResult> {
    const now = Date.now();
    
    // Check per-minute limit
    const minuteKey = `ratelimit:user:${userId}:minute:${Math.floor(now / 60000)}`;
    const minuteCount = await this.store.increment(minuteKey, 60);
    
    if (minuteCount > this.config.perUserLimits.perMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil(now / 60000) * 60000,
        requiresCaptcha: true,
        reason: 'Per-user per-minute rate limit exceeded'
      };
    }
    
    // Check per-hour limit
    const hourKey = `ratelimit:user:${userId}:hour:${Math.floor(now / 3600000)}`;
    const hourCount = await this.store.increment(hourKey, 3600);
    
    if (hourCount > this.config.perUserLimits.perHour) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil(now / 3600000) * 3600000,
        requiresCaptcha: true,
        reason: 'Per-user per-hour rate limit exceeded'
      };
    }
    
    // Check per-day limit
    const dayKey = `ratelimit:user:${userId}:day:${Math.floor(now / 86400000)}`;
    const dayCount = await this.store.increment(dayKey, 86400);
    
    if (dayCount > this.config.perUserLimits.perDay) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil(now / 86400000) * 86400000,
        requiresCaptcha: true,
        reason: 'Per-user per-day rate limit exceeded'
      };
    }
    
    return {
      allowed: true,
      remaining: this.config.perUserLimits.perMinute - minuteCount,
      resetAt: Math.ceil(now / 60000) * 60000,
      requiresCaptcha: false
    };
  }
  
  /**
   * Check if CAPTCHA should be required
   */
  private async shouldRequireCaptcha(userId: string | null, ipAddress: string): Promise<boolean> {
    if (!this.config.enableCaptcha) {
      return false;
    }
    
    const key = userId ? `captcha:user:${userId}` : `captcha:ip:${ipAddress}`;
    const failedAttempts = await this.store.get(key);
    
    return failedAttempts >= this.config.captchaThreshold;
  }
  
  /**
   * Record failed verification attempt
   */
  async recordFailedAttempt(userId: string | null, ipAddress: string): Promise<void> {
    const key = userId ? `captcha:user:${userId}` : `captcha:ip:${ipAddress}`;
    const ttl = 3600; // 1 hour
    
    const count = await this.store.increment(key, ttl);
    
    // Block if too many failed attempts
    if (count >= this.config.captchaThreshold * 2) {
      await this.blockIP(ipAddress);
    }
  }
  
  /**
   * Reset failed attempts after successful verification
   */
  async resetFailedAttempts(userId: string | null, ipAddress: string): Promise<void> {
    const key = userId ? `captcha:user:${userId}` : `captcha:ip:${ipAddress}`;
    await this.store.delete(key);
  }
  
  /**
   * Block an IP address
   */
  private async blockIP(ipAddress: string): Promise<void> {
    this.blockedIPs.add(ipAddress);
    
    // Store block in persistent storage
    const blockKey = `blocked:ip:${ipAddress}`;
    await this.store.set(blockKey, 1, this.config.blockDuration);
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ipAddress);
    }, this.config.blockDuration * 1000);
  }
  
  /**
   * Block a device
   */
  async blockDevice(deviceId: string): Promise<void> {
    this.blockedDevices.add(deviceId);
    
    // Store block in persistent storage
    const blockKey = `blocked:device:${deviceId}`;
    await this.store.set(blockKey, 1, this.config.blockDuration);
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedDevices.delete(deviceId);
    }, this.config.blockDuration * 1000);
  }
  
  /**
   * Manually unblock an IP address
   */
  async unblockIP(ipAddress: string): Promise<void> {
    this.blockedIPs.delete(ipAddress);
    const blockKey = `blocked:ip:${ipAddress}`;
    await this.store.delete(blockKey);
  }
  
  /**
   * Manually unblock a device
   */
  async unblockDevice(deviceId: string): Promise<void> {
    this.blockedDevices.delete(deviceId);
    const blockKey = `blocked:device:${deviceId}`;
    await this.store.delete(blockKey);
  }
  
  /**
   * Get rate limit status
   */
  async getRateLimitStatus(userId: string | null, ipAddress: string): Promise<{
    userLimits?: { minute: number; hour: number; day: number };
    ipLimits: { minute: number; hour: number; day: number };
    isBlocked: boolean;
  }> {
    const now = Date.now();
    
    // Get IP limits
    const ipMinuteKey = `ratelimit:ip:${ipAddress}:minute:${Math.floor(now / 60000)}`;
    const ipHourKey = `ratelimit:ip:${ipAddress}:hour:${Math.floor(now / 3600000)}`;
    const ipDayKey = `ratelimit:ip:${ipAddress}:day:${Math.floor(now / 86400000)}`;
    
    const ipLimits = {
      minute: await this.store.get(ipMinuteKey),
      hour: await this.store.get(ipHourKey),
      day: await this.store.get(ipDayKey)
    };
    
    let userLimits;
    if (userId) {
      const userMinuteKey = `ratelimit:user:${userId}:minute:${Math.floor(now / 60000)}`;
      const userHourKey = `ratelimit:user:${userId}:hour:${Math.floor(now / 3600000)}`;
      const userDayKey = `ratelimit:user:${userId}:day:${Math.floor(now / 86400000)}`;
      
      userLimits = {
        minute: await this.store.get(userMinuteKey),
        hour: await this.store.get(userHourKey),
        day: await this.store.get(userDayKey)
      };
    }
    
    return {
      userLimits,
      ipLimits,
      isBlocked: this.blockedIPs.has(ipAddress)
    };
  }
}

/**
 * Device fingerprinting service
 */
export class DeviceFingerprintService {
  /**
   * Generate device fingerprint from request headers
   */
  generateFingerprint(headers: Record<string, string>): DeviceFingerprint {
    const userAgent = headers['user-agent'] || '';
    const acceptLanguage = headers['accept-language'] || '';
    const acceptEncoding = headers['accept-encoding'] || '';
    
    // Generate fingerprint ID using hash of combined attributes
    const fingerprintString = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    const id = this.hashString(fingerprintString);
    
    return {
      id,
      userAgent,
      acceptLanguage,
      acceptEncoding
    };
  }
  
  /**
   * Enhance fingerprint with client-side data
   */
  enhanceFingerprint(
    fingerprint: DeviceFingerprint,
    clientData: {
      screenResolution?: string;
      timezone?: string;
      platform?: string;
      plugins?: string[];
    }
  ): DeviceFingerprint {
    return {
      ...fingerprint,
      ...clientData,
      id: this.hashString(JSON.stringify({ ...fingerprint, ...clientData }))
    };
  }
  
  /**
   * Simple hash function for fingerprint ID
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Check if fingerprint is suspicious
   */
  isSuspicious(fingerprint: DeviceFingerprint): boolean {
    // Check for missing or suspicious user agent
    if (!fingerprint.userAgent || fingerprint.userAgent.length < 10) {
      return true;
    }
    
    // Check for bot patterns in user agent
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i
    ];
    
    for (const pattern of botPatterns) {
      if (pattern.test(fingerprint.userAgent)) {
        return true;
      }
    }
    
    return false;
  }
}

/**
 * CAPTCHA verification service interface
 */
export interface CaptchaService {
  verify(token: string, ipAddress: string): Promise<boolean>;
}

/**
 * Google reCAPTCHA v3 implementation
 */
export class RecaptchaV3Service implements CaptchaService {
  private secretKey: string;
  private minScore: number;
  
  constructor(secretKey: string, minScore: number = 0.5) {
    this.secretKey = secretKey;
    this.minScore = minScore;
  }
  
  /**
   * Verify reCAPTCHA token
   */
  async verify(token: string, ipAddress: string): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `secret=${this.secretKey}&response=${token}&remoteip=${ipAddress}`
      });
      
      const data = await response.json();
      
      return data.success && data.score >= this.minScore;
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return false;
    }
  }
}

/**
 * In-memory rate limit store (for development/testing)
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { value: number; expiresAt: number }> = new Map();
  
  async increment(key: string, ttl: number): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);
    
    if (!entry || entry.expiresAt < now) {
      this.store.set(key, { value: 1, expiresAt: now + ttl * 1000 });
      return 1;
    }
    
    entry.value++;
    return entry.value;
  }
  
  async get(key: string): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);
    
    if (!entry || entry.expiresAt < now) {
      return 0;
    }
    
    return entry.value;
  }
  
  async set(key: string, value: number, ttl: number): Promise<void> {
    const now = Date.now();
    this.store.set(key, { value, expiresAt: now + ttl * 1000 });
  }
  
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }
}
