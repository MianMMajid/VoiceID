import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VLOError,
  ErrorCode,
  retryWithBackoff,
  CircuitBreaker,
  withTimeout,
  normalizeError,
  createRetryableError,
  createNonRetryableError,
  SERVICE_TIMEOUTS,
} from '../error-handler';

describe('VLOError', () => {
  it('should create error with correct properties', () => {
    const error = new VLOError(
      ErrorCode.INVALID_AUDIO,
      'Invalid audio format',
      true,
      { format: 'mp3' }
    );

    expect(error.code).toBe(ErrorCode.INVALID_AUDIO);
    expect(error.message).toBe('Invalid audio format');
    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({ format: 'mp3' });
    expect(error.timestamp).toBeGreaterThan(0);
  });

  it('should convert to error response format', () => {
    const error = new VLOError(
      ErrorCode.SESSION_EXPIRED,
      'Session has expired',
      false
    );

    const response = error.toErrorResponse();

    expect(response.error.code).toBe(ErrorCode.SESSION_EXPIRED);
    expect(response.error.message).toBe('Session has expired');
    expect(response.error.retryable).toBe(false);
    expect(response.error.timestamp).toBeGreaterThan(0);
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(createRetryableError(ErrorCode.EXTERNAL_API_ERROR, 'API error'))
      .mockRejectedValueOnce(createRetryableError(ErrorCode.EXTERNAL_API_ERROR, 'API error'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelayMs: 100 });

    // Fast-forward through retries
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(
      createNonRetryableError(ErrorCode.INVALID_AUDIO, 'Invalid audio')
    );

    await expect(retryWithBackoff(fn)).rejects.toThrow('Invalid audio');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(
      createRetryableError(ErrorCode.EXTERNAL_API_ERROR, 'API error')
    );

    const promise = retryWithBackoff(fn, { maxRetries: 2 });
    
    // Run timers and wait for promise to settle
    const runTimers = vi.runAllTimersAsync();
    
    await expect(promise).rejects.toThrow('API error');
    await runTimers;
    
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});

describe('CircuitBreaker', () => {
  it('should allow requests when closed', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    const fn = vi.fn().mockResolvedValue('success');

    const result = await breaker.execute(fn);

    expect(result).toBe('success');
    expect(breaker.getState()).toBe('closed');
  });

  it('should open after failure threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    const fn = vi.fn().mockRejectedValue(new Error('Service error'));

    // Trigger failures
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow('Service error');
    }

    expect(breaker.getState()).toBe('open');

    // Next request should fail fast
    await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
  });

  it('should transition to half-open after reset timeout', async () => {
    vi.useFakeTimers();
    
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 1000,
    });
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Error'))
      .mockRejectedValueOnce(new Error('Error'))
      .mockResolvedValue('success');

    // Open the circuit
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState()).toBe('open');

    // Fast-forward past reset timeout
    vi.advanceTimersByTime(1001);

    // Should transition to half-open and allow request
    const result = await breaker.execute(fn);
    expect(result).toBe('success');

    vi.restoreAllMocks();
  });

  it('should close after success threshold in half-open state', async () => {
    vi.useFakeTimers();
    
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 2,
      resetTimeoutMs: 1000,
    });
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Error'))
      .mockRejectedValueOnce(new Error('Error'))
      .mockResolvedValue('success');

    // Open the circuit
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();

    // Fast-forward and recover
    vi.advanceTimersByTime(1001);
    await breaker.execute(fn);
    await breaker.execute(fn);

    expect(breaker.getState()).toBe('closed');

    vi.restoreAllMocks();
  });

  it('should reset circuit breaker state', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    const fn = vi.fn().mockRejectedValue(new Error('Error'));

    breaker.execute(fn).catch(() => {});
    breaker.reset();

    expect(breaker.getState()).toBe('closed');
  });
});

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should resolve if promise completes before timeout', async () => {
    const promise = Promise.resolve('success');

    const result = await withTimeout(promise, 1000);

    expect(result).toBe('success');
  });

  it('should reject if promise exceeds timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 2000);
    });

    const timeoutPromise = withTimeout(promise, 1000);

    vi.advanceTimersByTime(1001);

    await expect(timeoutPromise).rejects.toThrow('Operation timed out');
  });

  it('should use custom error code and message', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 2000);
    });

    const timeoutPromise = withTimeout(
      promise,
      1000,
      ErrorCode.MODEL_TIMEOUT,
      'Model inference timed out'
    );

    vi.advanceTimersByTime(1001);

    try {
      await timeoutPromise;
    } catch (error) {
      expect(error).toBeInstanceOf(VLOError);
      expect((error as VLOError).code).toBe(ErrorCode.MODEL_TIMEOUT);
      expect((error as VLOError).message).toBe('Model inference timed out');
    }
  });
});

describe('Error helpers', () => {
  it('should create retryable error', () => {
    const error = createRetryableError(
      ErrorCode.EXTERNAL_API_ERROR,
      'API failed',
      { statusCode: 503 }
    );

    expect(error.retryable).toBe(true);
    expect(error.code).toBe(ErrorCode.EXTERNAL_API_ERROR);
    expect(error.details).toEqual({ statusCode: 503 });
  });

  it('should create non-retryable error', () => {
    const error = createNonRetryableError(
      ErrorCode.INVALID_AUDIO,
      'Invalid format'
    );

    expect(error.retryable).toBe(false);
    expect(error.code).toBe(ErrorCode.INVALID_AUDIO);
  });

  it('should normalize VLOError', () => {
    const original = new VLOError(ErrorCode.SESSION_EXPIRED, 'Expired');
    const normalized = normalizeError(original);

    expect(normalized).toBe(original);
  });

  it('should normalize standard Error', () => {
    const original = new Error('Something went wrong');
    const normalized = normalizeError(original);

    expect(normalized).toBeInstanceOf(VLOError);
    expect(normalized.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(normalized.message).toBe('Something went wrong');
  });

  it('should normalize unknown error', () => {
    const normalized = normalizeError('string error');

    expect(normalized).toBeInstanceOf(VLOError);
    expect(normalized.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(normalized.message).toBe('An unknown error occurred');
  });
});

describe('SERVICE_TIMEOUTS', () => {
  it('should have correct timeout values', () => {
    expect(SERVICE_TIMEOUTS.TTS_GENERATION).toBe(2000);
    expect(SERVICE_TIMEOUTS.STT_TRANSCRIPTION).toBe(3000);
    expect(SERVICE_TIMEOUTS.SYNTH_CLASSIFICATION).toBe(2000);
    expect(SERVICE_TIMEOUTS.SPOOF_DETECTION).toBe(3000);
    expect(SERVICE_TIMEOUTS.TOTAL_VERIFICATION).toBe(10000);
  });
});
