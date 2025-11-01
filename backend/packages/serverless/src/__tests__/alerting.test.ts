import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AlertManager,
  AlertType,
  AlertSeverity,
  createAlertManager,
} from '../alerting';

describe('AlertManager', () => {
  let alertManager: AlertManager;

  beforeEach(() => {
    alertManager = new AlertManager({ enabled: true });
  });

  afterEach(() => {
    alertManager.clearHistory();
  });

  it('should create SLA violation alert', () => {
    alertManager.checkSLAViolation(12000, 'session-123');

    const alerts = alertManager.getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe(AlertType.SLA_VIOLATION);
    expect(alerts[0].severity).toBe(AlertSeverity.CRITICAL);
    expect(alerts[0].metadata.latencyMs).toBe(12000);
    expect(alerts[0].metadata.sessionId).toBe('session-123');
  });

  it('should not create SLA violation alert below threshold', () => {
    alertManager.checkSLAViolation(8000, 'session-123');

    const alerts = alertManager.getActiveAlerts();
    expect(alerts).toHaveLength(0);
  });

  it('should create error rate spike alert', () => {
    alertManager.checkErrorRateSpike(10, 100); // 10% error rate

    const alerts = alertManager.getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe(AlertType.ERROR_RATE_SPIKE);
    expect(alerts[0].metadata.errorRate).toBeCloseTo(0.1);
  });

  it('should not create error rate spike alert below threshold', () => {
    alertManager.checkErrorRateSpike(3, 100); // 3% error rate

    const alerts = alertManager.getActiveAlerts();
    expect(alerts).toHaveLength(0);
  });

  it('should create fraud pattern alert', () => {
    const userId = 'user-123';

    // Simulate multiple fraud attempts
    for (let i = 0; i < 10; i++) {
      alertManager.checkFraudPattern('synthetic', userId);
    }

    const alerts = alertManager.getActiveAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].type).toBe(AlertType.FRAUD_PATTERN);
    expect(alerts[0].metadata.fraudType).toBe('synthetic');
    expect(alerts[0].metadata.userId).toBe(userId);
  });

  it('should create timeout spike alert', () => {
    alertManager.checkTimeoutSpike(15, 100); // 15% timeout rate

    const alerts = alertManager.getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe(AlertType.TIMEOUT_SPIKE);
    expect(alerts[0].metadata.timeoutRate).toBeCloseTo(0.15);
  });

  it('should create external API failure alert', () => {
    alertManager.checkExternalAPIFailure('ElevenLabs', 25, 100); // 25% failure rate

    const alerts = alertManager.getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe(AlertType.EXTERNAL_API_FAILURE);
    expect(alerts[0].metadata.apiName).toBe('ElevenLabs');
  });

  it('should resolve alerts', () => {
    alertManager.checkSLAViolation(12000, 'session-123');

    const activeAlerts = alertManager.getActiveAlerts();
    expect(activeAlerts).toHaveLength(1);

    const alertId = activeAlerts[0].id;
    alertManager.resolveAlert(alertId);

    const remainingAlerts = alertManager.getActiveAlerts();
    expect(remainingAlerts).toHaveLength(0);

    const history = alertManager.getAlertHistory();
    expect(history[0].resolved).toBe(true);
    expect(history[0].resolvedAt).toBeDefined();
  });

  it('should respect cooldown period', () => {
    vi.useFakeTimers();

    // Create first alert
    alertManager.checkSLAViolation(12000, 'session-1');
    expect(alertManager.getActiveAlerts()).toHaveLength(1);

    // Try to create another alert immediately (should be suppressed)
    alertManager.checkSLAViolation(13000, 'session-2');
    expect(alertManager.getActiveAlerts()).toHaveLength(1);

    // Advance time past cooldown (5 minutes)
    vi.advanceTimersByTime(301000);

    // Now alert should be created
    alertManager.checkSLAViolation(14000, 'session-3');
    expect(alertManager.getActiveAlerts()).toHaveLength(2);

    vi.restoreAllMocks();
  });

  it('should track alert history', () => {
    alertManager.checkSLAViolation(12000, 'session-1');
    alertManager.checkErrorRateSpike(10, 100);
    alertManager.checkTimeoutSpike(15, 100);

    const history = alertManager.getAlertHistory();
    expect(history).toHaveLength(3);
    expect(history[0].type).toBe(AlertType.SLA_VIOLATION);
    expect(history[1].type).toBe(AlertType.ERROR_RATE_SPIKE);
    expect(history[2].type).toBe(AlertType.TIMEOUT_SPIKE);
  });

  it('should limit alert history', () => {
    // Create many alerts
    for (let i = 0; i < 150; i++) {
      alertManager.checkSLAViolation(12000, `session-${i}`);
      vi.advanceTimersByTime(301000); // Advance past cooldown
    }

    const history = alertManager.getAlertHistory(50);
    expect(history.length).toBeLessThanOrEqual(50);
  });

  it('should create alert manager with custom config', () => {
    const customManager = createAlertManager({
      enabled: true,
      rules: [
        {
          type: AlertType.SLA_VIOLATION,
          severity: AlertSeverity.WARNING,
          enabled: true,
          threshold: 5000,
          windowMs: 60000,
          cooldownMs: 60000,
        },
      ],
    });

    customManager.checkSLAViolation(6000, 'session-123');

    const alerts = customManager.getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe(AlertSeverity.WARNING);
  });

  it('should handle zero total count gracefully', () => {
    alertManager.checkErrorRateSpike(0, 0);
    alertManager.checkTimeoutSpike(0, 0);

    const alerts = alertManager.getActiveAlerts();
    expect(alerts).toHaveLength(0);
  });
});
