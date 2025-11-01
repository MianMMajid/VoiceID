import * as jwt from 'jsonwebtoken';
import { ErrorCodes } from '@vlo/shared-types';

/**
 * JWT token payload
 */
export interface JWTPayload {
  userId: string;
  sessionId?: string;
  type: 'session' | 'api_key';
  iat: number;
  exp: number;
}

/**
 * Authentication context
 */
export interface AuthContext {
  userId: string;
  sessionId?: string;
  tokenType: 'session' | 'api_key';
  authenticated: boolean;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  jwtSecret: string;
  jwtExpirationMinutes: number;
  sessionTokenExpirationMinutes: number;
  apiKeyHeader: string;
  sessionTokenHeader: string;
}

/**
 * Authentication error
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string = ErrorCodes.EXTERNAL_API_ERROR,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authentication middleware
 */
export class AuthMiddleware {
  private config: AuthConfig;
  private apiKeys: Set<string>;

  constructor(config: AuthConfig, apiKeys: string[] = []) {
    this.config = config;
    this.apiKeys = new Set(apiKeys);
  }

  /**
   * Generate JWT session token
   */
  generateSessionToken(userId: string, sessionId: string): string {
    const payload: JWTPayload = {
      userId,
      sessionId,
      type: 'session',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (this.config.sessionTokenExpirationMinutes * 60)
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      algorithm: 'HS256'
    });
  }

  /**
   * Generate API key token for internal services
   */
  generateAPIKeyToken(userId: string): string {
    const payload: JWTPayload = {
      userId,
      type: 'api_key',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (this.config.jwtExpirationMinutes * 60)
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      algorithm: 'HS256'
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        algorithms: ['HS256']
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired', 'TOKEN_EXPIRED', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token', 'INVALID_TOKEN', 401);
      }
      throw new AuthenticationError('Token verification failed', 'AUTH_FAILED', 401);
    }
  }

  /**
   * Authenticate request
   */
  authenticate(headers: Record<string, string>): AuthContext {
    // Check for session token
    const sessionToken = headers[this.config.sessionTokenHeader.toLowerCase()] || 
                        headers[this.config.sessionTokenHeader];
    
    if (sessionToken) {
      return this.authenticateSessionToken(sessionToken);
    }

    // Check for API key
    const apiKey = headers[this.config.apiKeyHeader.toLowerCase()] || 
                   headers[this.config.apiKeyHeader];
    
    if (apiKey) {
      return this.authenticateAPIKey(apiKey);
    }

    // Check for Bearer token in Authorization header
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return this.authenticateSessionToken(token);
    }

    throw new AuthenticationError('No authentication credentials provided', 'NO_AUTH', 401);
  }

  /**
   * Authenticate session token
   */
  private authenticateSessionToken(token: string): AuthContext {
    const payload = this.verifyToken(token);

    if (payload.type !== 'session') {
      throw new AuthenticationError('Invalid token type', 'INVALID_TOKEN_TYPE', 401);
    }

    if (!payload.sessionId) {
      throw new AuthenticationError('Session ID missing from token', 'INVALID_TOKEN', 401);
    }

    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
      tokenType: 'session',
      authenticated: true
    };
  }

  /**
   * Authenticate API key
   */
  private authenticateAPIKey(apiKey: string): AuthContext {
    // Check if API key is in the allowed list
    if (!this.apiKeys.has(apiKey)) {
      throw new AuthenticationError('Invalid API key', 'INVALID_API_KEY', 401);
    }

    // For API keys, we can optionally verify JWT format
    try {
      const payload = this.verifyToken(apiKey);
      
      if (payload.type !== 'api_key') {
        throw new AuthenticationError('Invalid API key format', 'INVALID_API_KEY', 401);
      }

      return {
        userId: payload.userId,
        tokenType: 'api_key',
        authenticated: true
      };
    } catch (error) {
      // If JWT verification fails, treat as simple API key
      // This allows for both JWT-based and simple string API keys
      return {
        userId: 'internal-service',
        tokenType: 'api_key',
        authenticated: true
      };
    }
  }

  /**
   * Validate session token matches session ID
   */
  validateSessionAccess(authContext: AuthContext, sessionId: string): boolean {
    if (authContext.tokenType === 'api_key') {
      // API keys have access to all sessions
      return true;
    }

    if (authContext.tokenType === 'session') {
      // Session tokens can only access their own session
      return authContext.sessionId === sessionId;
    }

    return false;
  }

  /**
   * Add API key to allowed list
   */
  addAPIKey(apiKey: string): void {
    this.apiKeys.add(apiKey);
  }

  /**
   * Remove API key from allowed list
   */
  removeAPIKey(apiKey: string): void {
    this.apiKeys.delete(apiKey);
  }

  /**
   * Check if request requires authentication
   */
  static requiresAuthentication(method: string, path: string): boolean {
    // Public endpoints that don't require authentication
    const publicEndpoints = [
      { method: 'POST', pattern: /^\/api\/v1\/sessions$/ },
      { method: 'OPTIONS', pattern: /.*/ }
    ];

    for (const endpoint of publicEndpoints) {
      if (endpoint.method === method && endpoint.pattern.test(path)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract session ID from path
   */
  static extractSessionId(path: string): string | null {
    const match = path.match(/\/api\/v1\/sessions\/([^/]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Create default auth configuration
 */
export function createDefaultAuthConfig(): AuthConfig {
  return {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    jwtExpirationMinutes: 60,
    sessionTokenExpirationMinutes: 5,
    apiKeyHeader: 'X-API-Key',
    sessionTokenHeader: 'X-Session-Token'
  };
}

/**
 * Authentication middleware wrapper for API Gateway
 */
export class AuthenticatedAPIGateway {
  private authMiddleware: AuthMiddleware;

  constructor(authMiddleware: AuthMiddleware) {
    this.authMiddleware = authMiddleware;
  }

  /**
   * Authenticate and authorize request
   */
  async authenticateRequest(
    method: string,
    path: string,
    headers: Record<string, string>
  ): Promise<AuthContext> {
    // Check if authentication is required
    if (!AuthMiddleware.requiresAuthentication(method, path)) {
      return {
        userId: 'anonymous',
        tokenType: 'session',
        authenticated: false
      };
    }

    // Authenticate the request
    const authContext = this.authMiddleware.authenticate(headers);

    // For session-specific endpoints, validate access
    const sessionId = AuthMiddleware.extractSessionId(path);
    if (sessionId) {
      const hasAccess = this.authMiddleware.validateSessionAccess(authContext, sessionId);
      if (!hasAccess) {
        throw new AuthenticationError(
          'Access denied to this session',
          'ACCESS_DENIED',
          403
        );
      }
    }

    return authContext;
  }

  /**
   * Generate session token for new session
   */
  generateSessionToken(userId: string, sessionId: string): string {
    return this.authMiddleware.generateSessionToken(userId, sessionId);
  }
}
