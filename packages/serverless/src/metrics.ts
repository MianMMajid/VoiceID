/**
 * Metrics Collection System
 * Provides performance metrics, counters, and gauges for monitoring
 */

import { logger } from './logger';

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
}

/**
 * Metric data structure
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  serviceName: string;
  environment: string;
  enableConsole: boolean;
  enableCloudWatch: boolean;
  flushIntervalMs: number;
}

/**
 * Default metrics configuration
 */
const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  serviceName: 'vlo-service',
  environment: process.env.NODE_ENV || 'development',
  enableConsole: true,
  enableCloudWatch: false,
  flushIntervalMs: 60000, // Flush every 60 seconds
};

/**
 * Metrics collector class
 */
export class MetricsCollector {
  private config: MetricsConfig;
  private metrics: Metric[] = [];
  private flushInterval?: NodeJS.Timeout;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...DEFAULT_METRICS_CONFIG, ...config };
    this.startFlushInterval();
  }

  /**
   * Record a counter metric (incremental value)
   */
  counter(
    name: string,
    value: number = 1,
    tags?: Record<string, string>
  ): void {
    this.record({
      name,
      type: MetricType.COUNTER,
      value,
      unit: 'count',
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Record a gauge metric (point-in-time value)
   */
  gauge(
    name: string,
    value: number,
    unit: string = 'value',
    tags?: Record<string, string>
  ): void {
    this.record({
      name,
      type: MetricType.GAUGE,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Record a histogram metric (distribution of values)
   */
  histogram(
    name: string,
    value: number,
    unit: string = 'value',
    tags?: Record<string, string>
  ): void {
    this.record({
      name,
      type: MetricType.HISTOGRAM,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Record execution time of an async function
   */
  async timer<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.histogram(name, duration, 'milliseconds', tags);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.histogram(name, duration, 'milliseconds', {
        ...tags,
        error: 'true',
      });
      throw error;
    }
  }

  /**
   * Record a metric
   */
  private record(metric: Metric): void {
    this.metrics.push(metric);

    // Log metric if console is enabled
    if (this.config.enableConsole) {
      logger.debug('Metric recorded', {
        metric: metric.name,
        type: metric.type,
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
      });
    }
  }

  /**
   * Flush metrics to monitoring service
   */
  flush(): void {
    if (this.metrics.length === 0) {
      return;
    }

    const metricsToFlush = [...this.metrics];
    this.metrics = [];

    // Send to CloudWatch if enabled
    if (this.config.enableCloudWatch) {
      this.sendToCloudWatch(metricsToFlush);
    }

    // Log metrics summary
    if (this.config.enableConsole) {
      logger.info('Metrics flushed', {
        count: metricsToFlush.length,
        service: this.config.serviceName,
      });
    }
  }

  /**
   * Send metrics to CloudWatch (placeholder)
   */
  private sendToCloudWatch(metrics: Metric[]): void {
    // In production, this would use AWS SDK to send metrics to CloudWatch
    // For now, this is a placeholder
  }

  /**
   * Start automatic flush interval
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Stop automatic flush interval
   */
  stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = undefined;
    }
  }

  /**
   * Get current metrics (for testing)
   */
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics (for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Global metrics collector instance
 */
export const metrics = new MetricsCollector();

/**
 * Standard metric names for VLO system
 */
export const MetricNames = {
  // Session metrics
  SESSION_CREATED: 'vlo.session.created',
  SESSION_EXPIRED: 'vlo.session.expired',
  
  // Verification metrics
  VERIFICATION_STARTED: 'vlo.verification.started',
  VERIFICATION_COMPLETED: 'vlo.verification.completed',
  VERIFICATION_FAILED: 'vlo.verification.failed',
  VERIFICATION_DURATION: 'vlo.verification.duration',
  
  // Processing metrics
  AUDIO_PROCESSED: 'vlo.audio.processed',
  AUDIO_PROCESSING_DURATION: 'vlo.audio.processing.duration',
  
  // STT metrics
  STT_TRANSCRIPTION_DURATION: 'vlo.stt.transcription.duration',
  STT_SIMILARITY_SCORE: 'vlo.stt.similarity.score',
  
  // Synth classification metrics
  SYNTH_CLASSIFICATION_DURATION: 'vlo.synth.classification.duration',
  SYNTH_PROBABILITY_SCORE: 'vlo.synth.probability.score',
  SYNTH_DETECTED: 'vlo.synth.detected',
  
  // Spoof detection metrics
  SPOOF_DETECTION_DURATION: 'vlo.spoof.detection.duration',
  SPOOF_EER_SCORE: 'vlo.spoof.eer.score',
  SPOOF_DETECTED: 'vlo.spoof.detected',
  
  // Error metrics
  ERROR_OCCURRED: 'vlo.error.occurred',
  TIMEOUT_OCCURRED: 'vlo.timeout.occurred',
  RETRY_ATTEMPTED: 'vlo.retry.attempted',
  
  // External API metrics
  EXTERNAL_API_CALL: 'vlo.external.api.call',
  EXTERNAL_API_DURATION: 'vlo.external.api.duration',
  EXTERNAL_API_ERROR: 'vlo.external.api.error',
  
  // Storage metrics
  STORAGE_OPERATION: 'vlo.storage.operation',
  STORAGE_DURATION: 'vlo.storage.duration',
  
  // Function metrics
  FUNCTION_INVOCATION: 'vlo.function.invocation',
  FUNCTION_DURATION: 'vlo.function.duration',
  FUNCTION_MEMORY_USED: 'vlo.function.memory.used',
  COLD_START: 'vlo.function.cold_start',
};

/**
 * Create a child metrics collector with additional tags
 */
export function createMetricsCollector(
  serviceName: string,
  defaultTags?: Record<string, string>
): MetricsCollector {
  const collector = new MetricsCollector({ serviceName });
  return collector;
}
