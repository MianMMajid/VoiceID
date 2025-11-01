/**
 * Error Handler Framework
 * Provides standardized error codes, error responses, retry logic, circuit breaker, and timeout handling
 */

/**
 * Standard error codes for the VLO system
 */
export enum ErrorCode {
  // Client errors (4xx)
  INVALID_AUDIO = 'invalid_audio',
  SESSION_EXPIRED = 'session_expired',
  SESSION_NOT_FOUND = 'session_not_found',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_REQUEST = 'invalid_request',
  UNAUTHORIZED = 'unauthorized',
  
  // Server errors (5xx)
  EXTERNAL_API_ERROR = 'external_api_error',
  MODEL_TIMEOUT = 'model_timeout',
  STORAGE_ERROR = 'storage_error',
  DATABASE_ERROR = 'database_error',
  INTERNAL_ERROR = 'internal_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  
  // Processing errors
  AUDIO_PROCESSING_ERROR = 'audio_processing_error',
  STT_ERROR = 'stt_error',
  SYNTH_CLASSIFICATION_ERROR = 'synth_classification_error',
  SPOOF_DETECTION_ERROR = 'spoof_detection_error',
  TTS_GENERATION_ERROR = 'tts_generation_error',
  
  // Timeout errors
  VERIFICATION_TIMEOUT = 'verification_timeout',
  API_TIMEOUT = 'api_timeout',
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    retryable: boolean;
    timestamp: number;
  };
}

/**
 * VLO Error class with additional metadata
 */
export class VLOError extends Error {
  public readonly code: ErrorCode;
  public readonly retryable: boolean;
  public readonly details?: any;
  public readonly timestamp: number;

  constructor(
    code: ErrorCode,
    message: string,
    retryable: boolean = false,
    details?: any
  ) {
    super(message);
    this.name = 'VLOError';
    this.code = code;
    this.retryable = retryable;
    this.details = details;
    this.timestamp = Date.now();
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to standard error response format
   */
  toErrorResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        retryable: this.retryable,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: ErrorCode[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (error instanceof VLOError && !error.retryable) {
        throw error;
      }
      
      // Check if we've exhausted retries
      if (attempt === config.maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeoutMs: number;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 10000,
  resetTimeoutMs: 60000,
};

/**
 * Circuit breaker for external services
 * Prevents cascading failures by failing fast when a service is unavailable
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptTime: number = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new VLOError(
          ErrorCode.SERVICE_UNAVAILABLE,
          'Circuit breaker is open - service unavailable',
          true,
          { state: this.state, nextAttemptTime: this.nextAttemptTime }
        );
      }
      // Try to recover
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeoutMs;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
  }
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorCode: ErrorCode = ErrorCode.API_TIMEOUT,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new VLOError(errorCode, errorMessage, true, { timeoutMs }));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

/**
 * Service-specific timeout configurations (in milliseconds)
 */
export const SERVICE_TIMEOUTS = {
  TTS_GENERATION: 2000,
  STT_TRANSCRIPTION: 3000,
  SYNTH_CLASSIFICATION: 2000,
  SPOOF_DETECTION: 3000,
  TOTAL_VERIFICATION: 10000,
  STORAGE_OPERATION: 5000,
  DATABASE_OPERATION: 3000,
};

/**
 * Helper to create retryable errors
 */
export function createRetryableError(
  code: ErrorCode,
  message: string,
  details?: any
): VLOError {
  return new VLOError(code, message, true, details);
}

/**
 * Helper to create non-retryable errors
 */
export function createNonRetryableError(
  code: ErrorCode,
  message: string,
  details?: any
): VLOError {
  return new VLOError(code, message, false, details);
}

/**
 * Convert unknown errors to VLOError
 */
export function normalizeError(error: unknown): VLOError {
  if (error instanceof VLOError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new VLOError(
      ErrorCode.INTERNAL_ERROR,
      error.message,
      false,
      { originalError: error.name, stack: error.stack }
    );
  }
  
  return new VLOError(
    ErrorCode.INTERNAL_ERROR,
    'An unknown error occurred',
    false,
    { error }
  );
}
