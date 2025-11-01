import {
  Session,
  SessionResponse,
  VerificationResult,
  ErrorResponse,
  ErrorCodes,
  SessionStatus
} from '@vlo/shared-types';
import { AuthenticatedAPIGateway, AuthMiddleware, AuthContext, AuthenticationError } from './auth-middleware';
import { 
  RateLimiter, 
  DeviceFingerprintService, 
  CaptchaService,
  DeviceFingerprint 
} from './rate-limiter';

/**
 * API Gateway configuration
 */
export interface APIGatewayConfig {
  corsOrigins: string[];
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  enableRateLimiting: boolean;
  enableAuthentication: boolean;
  enableDeviceFingerprinting?: boolean;
  enableCaptcha?: boolean;
  tlsConfig?: {
    minVersion: string;
    cipherSuites?: string[];
  };
}

/**
 * HTTP request interface
 */
export interface HTTPRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: string;
  queryParams?: Record<string, string>;
  pathParams?: Record<string, string>;
}

/**
 * HTTP response interface
 */
export interface HTTPResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Rate limit store interface
 */
export interface RateLimitStore {
  increment(key: string, ttl: number): Promise<number>;
  get(key: string): Promise<number>;
}

/**
 * API Gateway handler class
 */
export class APIGateway {
  private config: APIGatewayConfig;
  private rateLimitStore?: RateLimitStore;
  private authenticatedGateway?: AuthenticatedAPIGateway;
  private rateLimiter?: RateLimiter;
  private deviceFingerprintService?: DeviceFingerprintService;
  private captchaService?: CaptchaService;

  constructor(
    config: APIGatewayConfig, 
    rateLimitStore?: RateLimitStore,
    authMiddleware?: AuthMiddleware,
    rateLimiter?: RateLimiter,
    captchaService?: CaptchaService
  ) {
    this.config = config;
    this.rateLimitStore = rateLimitStore;
    this.rateLimiter = rateLimiter;
    this.captchaService = captchaService;
    
    if (authMiddleware) {
      this.authenticatedGateway = new AuthenticatedAPIGateway(authMiddleware);
    }
    
    if (config.enableDeviceFingerprinting) {
      this.deviceFingerprintService = new DeviceFingerprintService();
    }
  }

  /**
   * Handle incoming HTTP request
   */
  async handleRequest(request: HTTPRequest): Promise<HTTPResponse> {
    try {
      // Apply CORS headers
      const corsHeaders = this.getCORSHeaders(request.headers.origin || '');

      // Authenticate request if enabled
      let authContext: AuthContext | undefined;
      if (this.config.enableAuthentication && this.authenticatedGateway) {
        try {
          authContext = await this.authenticatedGateway.authenticateRequest(
            request.method,
            request.path,
            request.headers
          );
        } catch (error) {
          if (error instanceof AuthenticationError) {
            return this.errorResponse(
              error.statusCode,
              error.code,
              error.message,
              undefined,
              corsHeaders
            );
          }
          throw error;
        }
      }

      // Check rate limits with advanced DDoS protection
      if (this.config.enableRateLimiting && this.rateLimiter) {
        const ipAddress = this.getClientIP(request);
        const userId = authContext?.userId || null;
        
        // Generate device fingerprint if enabled
        let deviceFingerprint: DeviceFingerprint | undefined;
        if (this.deviceFingerprintService) {
          deviceFingerprint = this.deviceFingerprintService.generateFingerprint(request.headers);
          
          // Block suspicious devices
          if (this.deviceFingerprintService.isSuspicious(deviceFingerprint)) {
            return this.errorResponse(
              403,
              'SUSPICIOUS_DEVICE',
              'Request blocked due to suspicious device characteristics',
              undefined,
              corsHeaders
            );
          }
        }
        
        // Check CAPTCHA if required
        if (this.config.enableCaptcha && this.captchaService) {
          const captchaToken = request.headers['x-captcha-token'];
          const requiresCaptcha = request.headers['x-requires-captcha'] === 'true';
          
          if (requiresCaptcha && !captchaToken) {
            return this.errorResponse(
              403,
              'CAPTCHA_REQUIRED',
              'CAPTCHA verification required',
              { requiresCaptcha: true },
              corsHeaders
            );
          }
          
          if (captchaToken) {
            const captchaValid = await this.captchaService.verify(captchaToken, ipAddress);
            if (!captchaValid) {
              return this.errorResponse(
                403,
                'CAPTCHA_FAILED',
                'CAPTCHA verification failed',
                undefined,
                corsHeaders
              );
            }
          }
        }
        
        // Check rate limits
        const rateLimitResult = await this.rateLimiter.checkRateLimit(
          userId,
          ipAddress,
          deviceFingerprint
        );
        
        if (!rateLimitResult.allowed) {
          return this.errorResponse(
            429,
            ErrorCodes.RATE_LIMIT,
            rateLimitResult.reason || 'Rate limit exceeded',
            { 
              retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
              requiresCaptcha: rateLimitResult.requiresCaptcha
            },
            {
              ...corsHeaders,
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
              'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString()
            }
          );
        }
        
        // Add rate limit headers to response
        corsHeaders['X-RateLimit-Remaining'] = rateLimitResult.remaining.toString();
        corsHeaders['X-RateLimit-Reset'] = rateLimitResult.resetAt.toString();
      } else if (this.config.enableRateLimiting && this.rateLimitStore) {
        // Fallback to simple rate limiting
        const rateLimitResult = await this.checkRateLimit(request);
        if (!rateLimitResult.allowed) {
          return this.errorResponse(
            429,
            ErrorCodes.RATE_LIMIT,
            'Rate limit exceeded',
            { retryAfter: rateLimitResult.retryAfter },
            corsHeaders
          );
        }
      }

      // Route request to appropriate handler
      const response = await this.routeRequest(request, authContext);
      
      // Add CORS headers to response
      return {
        ...response,
        headers: {
          ...response.headers,
          ...corsHeaders
        }
      };
    } catch (error) {
      return this.handleError(error, request);
    }
  }

  /**
   * Route request to appropriate handler
   */
  private async routeRequest(request: HTTPRequest, authContext?: AuthContext): Promise<HTTPResponse> {
    const { method, path } = request;

    // Session creation endpoint
    if (method === 'POST' && path === '/api/v1/sessions') {
      return this.createSessionHandler(request, authContext);
    }

    // Get session status endpoint
    if (method === 'GET' && path.match(/^\/api\/v1\/sessions\/[^/]+$/)) {
      return this.getSessionHandler(request, authContext);
    }

    // Submit audio endpoint
    if (method === 'POST' && path.match(/^\/api\/v1\/sessions\/[^/]+\/audio$/)) {
      return this.submitAudioHandler(request, authContext);
    }

    // Get verification result endpoint
    if (method === 'GET' && path.match(/^\/api\/v1\/sessions\/[^/]+\/result$/)) {
      return this.getResultHandler(request, authContext);
    }

    // Handle OPTIONS for CORS preflight
    if (method === 'OPTIONS') {
      return this.optionsHandler(request);
    }

    // 404 Not Found
    return this.errorResponse(
      404,
      'NOT_FOUND',
      'Endpoint not found',
      undefined,
      this.getCORSHeaders(request.headers.origin || '')
    );
  }

  /**
   * Create session handler (placeholder)
   */
  private async createSessionHandler(request: HTTPRequest, authContext?: AuthContext): Promise<HTTPResponse> {
    // This will be implemented by the orchestrator
    return this.successResponse(200, {
      message: 'Session creation endpoint - to be implemented by orchestrator',
      authenticated: authContext?.authenticated || false
    });
  }

  /**
   * Get session handler (placeholder)
   */
  private async getSessionHandler(request: HTTPRequest, authContext?: AuthContext): Promise<HTTPResponse> {
    return this.successResponse(200, {
      message: 'Get session endpoint - to be implemented by orchestrator',
      authenticated: authContext?.authenticated || false
    });
  }

  /**
   * Submit audio handler (placeholder)
   */
  private async submitAudioHandler(request: HTTPRequest, authContext?: AuthContext): Promise<HTTPResponse> {
    return this.successResponse(200, {
      message: 'Submit audio endpoint - to be implemented by orchestrator',
      authenticated: authContext?.authenticated || false
    });
  }

  /**
   * Get result handler (placeholder)
   */
  private async getResultHandler(request: HTTPRequest, authContext?: AuthContext): Promise<HTTPResponse> {
    return this.successResponse(200, {
      message: 'Get result endpoint - to be implemented by orchestrator',
      authenticated: authContext?.authenticated || false
    });
  }

  /**
   * OPTIONS handler for CORS preflight
   */
  private optionsHandler(request: HTTPRequest): HTTPResponse {
    return {
      statusCode: 204,
      headers: {
        ...this.getCORSHeaders(request.headers.origin || ''),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  /**
   * Get CORS headers
   */
  private getCORSHeaders(origin: string): Record<string, string> {
    const allowedOrigin = this.isOriginAllowed(origin) ? origin : this.config.corsOrigins[0] || '*';
    
    return {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Expose-Headers': 'X-Request-Id, X-RateLimit-Remaining'
    };
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    if (this.config.corsOrigins.includes('*')) {
      return true;
    }
    return this.config.corsOrigins.includes(origin);
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(request: HTTPRequest): Promise<{ allowed: boolean; retryAfter?: number }> {
    if (!this.rateLimitStore) {
      return { allowed: true };
    }

    const clientId = this.getClientIdentifier(request);
    
    // Check per-minute limit
    const minuteKey = `ratelimit:${clientId}:minute:${Math.floor(Date.now() / 60000)}`;
    const minuteCount = await this.rateLimitStore.increment(minuteKey, 60);
    
    if (minuteCount > this.config.rateLimitPerMinute) {
      return { allowed: false, retryAfter: 60 };
    }

    // Check per-hour limit
    const hourKey = `ratelimit:${clientId}:hour:${Math.floor(Date.now() / 3600000)}`;
    const hourCount = await this.rateLimitStore.increment(hourKey, 3600);
    
    if (hourCount > this.config.rateLimitPerHour) {
      return { allowed: false, retryAfter: 3600 };
    }

    return { allowed: true };
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(request: HTTPRequest): string {
    // Use IP address or authenticated user ID
    return request.headers['x-forwarded-for'] || 
           request.headers['x-real-ip'] || 
           'unknown';
  }
  
  /**
   * Get client IP address
   */
  private getClientIP(request: HTTPRequest): string {
    return request.headers['x-forwarded-for']?.split(',')[0].trim() ||
           request.headers['x-real-ip'] ||
           request.headers['cf-connecting-ip'] || // Cloudflare
           'unknown';
  }

  /**
   * Handle errors
   */
  private handleError(error: any, request: HTTPRequest): HTTPResponse {
    console.error('API Gateway error:', error);
    
    const corsHeaders = this.getCORSHeaders(request.headers.origin || '');
    
    if (error.statusCode) {
      return this.errorResponse(
        error.statusCode,
        error.code || 'INTERNAL_ERROR',
        error.message,
        error.details,
        corsHeaders
      );
    }

    return this.errorResponse(
      500,
      'INTERNAL_ERROR',
      'Internal server error',
      undefined,
      corsHeaders
    );
  }

  /**
   * Create success response
   */
  private successResponse(statusCode: number, data: any): HTTPResponse {
    const tlsConfig = this.getTLSConfig();
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': this.generateRequestId(),
        ...APIGateway.getSecurityHeaders(tlsConfig.minVersion)
      },
      body: JSON.stringify(data)
    };
  }

  /**
   * Create error response
   */
  private errorResponse(
    statusCode: number,
    code: string,
    message: string,
    details?: any,
    additionalHeaders?: Record<string, string>
  ): HTTPResponse {
    const errorResponse: ErrorResponse = {
      error: {
        code,
        message,
        details,
        retryable: statusCode >= 500 || statusCode === 429
      }
    };

    const tlsConfig = this.getTLSConfig();
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': this.generateRequestId(),
        ...APIGateway.getSecurityHeaders(tlsConfig.minVersion),
        ...additionalHeaders
      },
      body: JSON.stringify(errorResponse)
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add security headers including TLS enforcement
   */
  static getSecurityHeaders(tlsMinVersion: string = 'TLSv1.3'): Record<string, string> {
    return {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-TLS-Version': tlsMinVersion
    };
  }
  
  /**
   * Get TLS configuration for API Gateway
   */
  getTLSConfig() {
    return this.config.tlsConfig || {
      minVersion: 'TLSv1.3',
      cipherSuites: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256'
      ]
    };
  }
}

/**
 * In-memory rate limit store (for development/testing)
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; expiresAt: number }> = new Map();

  async increment(key: string, ttl: number): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.expiresAt < now) {
      this.store.set(key, { count: 1, expiresAt: now + ttl * 1000 });
      return 1;
    }

    entry.count++;
    return entry.count;
  }

  async get(key: string): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.expiresAt < now) {
      return 0;
    }

    return entry.count;
  }
}
