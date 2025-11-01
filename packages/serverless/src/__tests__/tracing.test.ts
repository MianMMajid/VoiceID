import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Tracer, SpanStatus, SpanNames } from '../tracing';

describe('Tracer', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer({ enabled: true, sampleRate: 1.0 });
  });

  afterEach(() => {
    tracer.clearCompletedSpans();
  });

  it('should start and end a span', () => {
    const span = tracer.startSpan('test.operation');
    expect(span.name).toBe('test.operation');
    expect(span.traceId).toBeTruthy();
    expect(span.spanId).toBeTruthy();
    expect(span.startTime).toBeGreaterThan(0);

    tracer.endSpan(span.spanId);

    const completedSpans = tracer.getCompletedSpans();
    expect(completedSpans).toHaveLength(1);
    expect(completedSpans[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('should create child spans with parent', () => {
    const parentSpan = tracer.startSpan('parent.operation');
    const childSpan = tracer.startSpan('child.operation', parentSpan.spanId);

    expect(childSpan.parentSpanId).toBe(parentSpan.spanId);

    tracer.endSpan(childSpan.spanId);
    tracer.endSpan(parentSpan.spanId);
  });

  it('should add events to span', () => {
    const span = tracer.startSpan('test.operation');
    tracer.addSpanEvent(span.spanId, 'test.event', { key: 'value' });

    const activeSpans = tracer.getActiveSpans();
    expect(activeSpans[0].events).toHaveLength(1);
    expect(activeSpans[0].events[0].name).toBe('test.event');
    expect(activeSpans[0].events[0].attributes?.key).toBe('value');

    tracer.endSpan(span.spanId);
  });

  it('should set span attributes', () => {
    const span = tracer.startSpan('test.operation', undefined, { initial: 'value' });
    tracer.setSpanAttributes(span.spanId, { additional: 'attribute' });

    const activeSpans = tracer.getActiveSpans();
    expect(activeSpans[0].attributes.initial).toBe('value');
    expect(activeSpans[0].attributes.additional).toBe('attribute');

    tracer.endSpan(span.spanId);
  });

  it('should record exceptions', () => {
    const span = tracer.startSpan('test.operation');
    const error = new Error('Test error');
    tracer.recordException(span.spanId, error);

    const activeSpans = tracer.getActiveSpans();
    expect(activeSpans[0].status).toBe(SpanStatus.ERROR);
    expect(activeSpans[0].events).toHaveLength(1);
    expect(activeSpans[0].events[0].name).toBe('exception');

    tracer.endSpan(span.spanId);
  });

  it('should get trace context', () => {
    const span = tracer.startSpan('test.operation');
    const context = tracer.getTraceContext(span.spanId);

    expect(context).toBeTruthy();
    expect(context?.traceId).toBe(span.traceId);
    expect(context?.spanId).toBe(span.spanId);

    tracer.endSpan(span.spanId);
  });

  it('should trace async function', async () => {
    const result = await tracer.trace(
      'test.operation',
      async (span) => {
        expect(span.name).toBe('test.operation');
        return 'success';
      }
    );

    expect(result).toBe('success');
    const completedSpans = tracer.getCompletedSpans();
    expect(completedSpans).toHaveLength(1);
    expect(completedSpans[0].status).toBe(SpanStatus.OK);
  });

  it('should trace async function with error', async () => {
    await expect(
      tracer.trace('test.operation', async () => {
        throw new Error('Test error');
      })
    ).rejects.toThrow('Test error');

    const completedSpans = tracer.getCompletedSpans();
    expect(completedSpans).toHaveLength(1);
    expect(completedSpans[0].status).toBe(SpanStatus.ERROR);
    expect(completedSpans[0].events).toHaveLength(1);
    expect(completedSpans[0].events[0].name).toBe('exception');
  });

  it('should not create spans when disabled', () => {
    const disabledTracer = new Tracer({ enabled: false });
    const span = disabledTracer.startSpan('test.operation');

    expect(span.traceId).toBe('');
    expect(span.spanId).toBe('');

    disabledTracer.endSpan(span.spanId);

    expect(disabledTracer.getCompletedSpans()).toHaveLength(0);
  });

  it('should respect sample rate', () => {
    const sampledTracer = new Tracer({ enabled: true, sampleRate: 0.0 });
    const span = sampledTracer.startSpan('test.operation');

    expect(span.traceId).toBe('');
    expect(span.spanId).toBe('');
  });
});

describe('SpanNames', () => {
  it('should have standard span names', () => {
    expect(SpanNames.CREATE_SESSION).toBe('create_session');
    expect(SpanNames.PROCESS_VERIFICATION).toBe('process_verification');
    expect(SpanNames.TRANSCRIBE_AUDIO).toBe('transcribe_audio');
    expect(SpanNames.CLASSIFY_SYNTH).toBe('classify_synth');
    expect(SpanNames.DETECT_SPOOF).toBe('detect_spoof');
  });
});
