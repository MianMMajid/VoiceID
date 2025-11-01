import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetricsCollector, MetricType, MetricNames } from '../metrics';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({ enableConsole: false });
  });

  afterEach(() => {
    collector.stopFlushInterval();
    collector.clearMetrics();
  });

  it('should record counter metrics', () => {
    collector.counter('test.counter', 5, { tag: 'value' });

    const metrics = collector.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test.counter');
    expect(metrics[0].type).toBe(MetricType.COUNTER);
    expect(metrics[0].value).toBe(5);
    expect(metrics[0].tags?.tag).toBe('value');
  });

  it('should record gauge metrics', () => {
    collector.gauge('test.gauge', 42, 'bytes');

    const metrics = collector.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].type).toBe(MetricType.GAUGE);
    expect(metrics[0].value).toBe(42);
    expect(metrics[0].unit).toBe('bytes');
  });

  it('should record histogram metrics', () => {
    collector.histogram('test.histogram', 100, 'milliseconds');

    const metrics = collector.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].type).toBe(MetricType.HISTOGRAM);
    expect(metrics[0].value).toBe(100);
  });

  it('should time async function execution', async () => {
    const asyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'result';
    };

    const result = await collector.timer('test.timer', asyncFn);

    expect(result).toBe('result');
    const metrics = collector.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test.timer');
    expect(metrics[0].unit).toBe('milliseconds');
    expect(metrics[0].value).toBeGreaterThan(0);
  });

  it('should record timer metric even on error', async () => {
    const asyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      throw new Error('Test error');
    };

    await expect(collector.timer('test.timer', asyncFn)).rejects.toThrow('Test error');

    const metrics = collector.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].tags?.error).toBe('true');
  });

  it('should flush metrics', () => {
    collector.counter('test.counter', 1);
    collector.gauge('test.gauge', 10);

    expect(collector.getMetrics()).toHaveLength(2);

    collector.flush();

    expect(collector.getMetrics()).toHaveLength(0);
  });

  it('should clear metrics', () => {
    collector.counter('test.counter', 1);
    collector.gauge('test.gauge', 10);

    expect(collector.getMetrics()).toHaveLength(2);

    collector.clearMetrics();

    expect(collector.getMetrics()).toHaveLength(0);
  });
});

describe('MetricNames', () => {
  it('should have standard metric names', () => {
    expect(MetricNames.SESSION_CREATED).toBe('vlo.session.created');
    expect(MetricNames.VERIFICATION_COMPLETED).toBe('vlo.verification.completed');
    expect(MetricNames.STT_TRANSCRIPTION_DURATION).toBe('vlo.stt.transcription.duration');
    expect(MetricNames.SYNTH_DETECTED).toBe('vlo.synth.detected');
    expect(MetricNames.SPOOF_DETECTED).toBe('vlo.spoof.detected');
  });
});
