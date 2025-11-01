/**
 * Distributed Tracing System
 * Provides OpenTelemetry-compatible distributed tracing for request tracking
 */

import { logger } from './logger';

/**
 * Span status
 */
export enum SpanStatus {
  OK = 'ok',
  ERROR = 'error',
}

/**
 * Span data structure
 */
export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: SpanStatus;
  attributes: Record<string, any>;
  events: SpanEvent[];
}

/**
 * Span event
 */
export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, any>;
}

/**
 * Trace context
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

/**
 * Tracing configuration
 */
export interface TracingConfig {
  serviceName: string;
  enabled: boolean;
  sampleRate: number; // 0.0 to 1.0
}

/**
 * Default tracing configuration
 */
const DEFAULT_TRACING_CONFIG: TracingConfig = {
  serviceName: 'vlo-service',
  enabled: true,
  sampleRate: 1.0, // Sample 100% of traces in development
};

/**
 * Tracer class for distributed tracing
 */
export class Tracer {
  private config: TracingConfig;
  private activeSpans: Map<string, Span> = new Map();
  private completedSpans: Span[] = [];

  constructor(config: Partial<TracingConfig> = {}) {
    this.config = { ...DEFAULT_TRACING_CONFIG, ...config };
  }

  /**
   * Start a new span
   */
  startSpan(
    name: string,
    parentSpanId?: string,
    attributes?: Record<string, any>
  ): Span {
    if (!this.config.enabled || !this.shouldSample()) {
      // Return a no-op span
      return this.createNoOpSpan(name);
    }

    const span: Span = {
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
      parentSpanId,
      name,
      startTime: Date.now(),
      status: SpanStatus.OK,
      attributes: attributes || {},
      events: [],
    };

    this.activeSpans.set(span.spanId, span);

    logger.debug('Span started', {
      traceId: span.traceId,
      spanId: span.spanId,
      name: span.name,
    });

    return span;
  }

  /**
   * End a span
   */
  endSpan(spanId: string, status: SpanStatus = SpanStatus.OK): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);

    logger.debug('Span ended', {
      traceId: span.traceId,
      spanId: span.spanId,
      name: span.name,
      duration: span.duration,
      status: span.status,
    });

    // In production, send span to tracing backend (e.g., AWS X-Ray, Jaeger)
    this.exportSpan(span);
  }

  /**
   * Add an event to a span
   */
  addSpanEvent(
    spanId: string,
    eventName: string,
    attributes?: Record<string, any>
  ): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return;
    }

    span.events.push({
      name: eventName,
      timestamp: Date.now(),
      attributes,
    });
  }

  /**
   * Set span attributes
   */
  setSpanAttributes(spanId: string, attributes: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return;
    }

    span.attributes = { ...span.attributes, ...attributes };
  }

  /**
   * Record an exception in a span
   */
  recordException(spanId: string, error: Error): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return;
    }

    span.events.push({
      name: 'exception',
      timestamp: Date.now(),
      attributes: {
        'exception.type': error.name,
        'exception.message': error.message,
        'exception.stacktrace': error.stack,
      },
    });

    span.status = SpanStatus.ERROR;
  }

  /**
   * Get trace context from a span
   */
  getTraceContext(spanId: string): TraceContext | null {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return null;
    }

    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
    };
  }

  /**
   * Wrap an async function with tracing
   */
  async trace<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    parentSpanId?: string,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.startSpan(name, parentSpanId, attributes);

    try {
      const result = await fn(span);
      this.endSpan(span.spanId, SpanStatus.OK);
      return result;
    } catch (error) {
      this.recordException(span.spanId, error as Error);
      this.endSpan(span.spanId, SpanStatus.ERROR);
      throw error;
    }
  }

  /**
   * Export span to tracing backend
   */
  private exportSpan(span: Span): void {
    // In production, this would send the span to a tracing backend
    // (e.g., AWS X-Ray, Jaeger, Zipkin, or OpenTelemetry Collector)
    // For now, this is a placeholder
  }

  /**
   * Generate a unique trace ID
   */
  private generateTraceId(): string {
    return this.generateId(32);
  }

  /**
   * Generate a unique span ID
   */
  private generateSpanId(): string {
    return this.generateId(16);
  }

  /**
   * Generate a random hex ID
   */
  private generateId(length: number): string {
    const bytes = Math.ceil(length / 2);
    const randomBytes = Array.from({ length: bytes }, () =>
      Math.floor(Math.random() * 256)
    );
    return randomBytes.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  }

  /**
   * Determine if this trace should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Create a no-op span (when tracing is disabled or not sampled)
   */
  private createNoOpSpan(name: string): Span {
    return {
      traceId: '',
      spanId: '',
      name,
      startTime: Date.now(),
      status: SpanStatus.OK,
      attributes: {},
      events: [],
    };
  }

  /**
   * Get all completed spans (for testing)
   */
  getCompletedSpans(): Span[] {
    return [...this.completedSpans];
  }

  /**
   * Clear completed spans (for testing)
   */
  clearCompletedSpans(): void {
    this.completedSpans = [];
  }

  /**
   * Get active spans (for testing)
   */
  getActiveSpans(): Span[] {
    return Array.from(this.activeSpans.values());
  }
}

/**
 * Global tracer instance
 */
export const tracer = new Tracer();

/**
 * Create a child tracer with custom configuration
 */
export function createTracer(
  serviceName: string,
  config?: Partial<TracingConfig>
): Tracer {
  return new Tracer({ serviceName, ...config });
}

/**
 * Standard span names for VLO system
 */
export const SpanNames = {
  // Session operations
  CREATE_SESSION: 'create_session',
  GET_SESSION: 'get_session',
  
  // Verification operations
  PROCESS_VERIFICATION: 'process_verification',
  AGGREGATE_RESULTS: 'aggregate_results',
  
  // Audio processing
  PROCESS_AUDIO: 'process_audio',
  VALIDATE_AUDIO: 'validate_audio',
  STORE_AUDIO: 'store_audio',
  
  // TTS generation
  GENERATE_CHALLENGE: 'generate_challenge',
  GENERATE_TTS: 'generate_tts',
  
  // STT transcription
  TRANSCRIBE_AUDIO: 'transcribe_audio',
  CALCULATE_SIMILARITY: 'calculate_similarity',
  
  // Synth classification
  CLASSIFY_SYNTH: 'classify_synth',
  
  // Spoof detection
  DETECT_SPOOF: 'detect_spoof',
  
  // External API calls
  CALL_ELEVENLABS_API: 'call_elevenlabs_api',
  CALL_WHISPER_API: 'call_whisper_api',
  
  // Storage operations
  UPLOAD_TO_STORAGE: 'upload_to_storage',
  DOWNLOAD_FROM_STORAGE: 'download_from_storage',
  
  // Database operations
  WRITE_TO_DATABASE: 'write_to_database',
  READ_FROM_DATABASE: 'read_from_database',
};
