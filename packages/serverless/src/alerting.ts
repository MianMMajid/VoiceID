/**
 * Alerting System
 * Provides alert management for SLA violations, error spikes, and fraud detection
 */

import { logger } from './logger';
import { metrics, MetricNames } from './metrics';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Alert types
 */
export enum AlertType {
  SLA_VIOLATION = 'sla_violation',
  ERROR_RATE_SPIKE = 'error_rate_spike',
  FRAUD_PATTERN = 'fraud_pattern',
  SERVICE_DEGRADATION = 'service_degradation',
  TIMEOUT_SPIKE = 'timeout_spike',
  EXTERNAL_API_FAILURE = 'external_api_failure',
}

/**
 * Alert data structure
 */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: number;
}

/**
 * Alert rule configuration
 */
export interface AlertRule {
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  threshold: number;
  windowMs: number;
  cooldownMs: number;
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  rules: AlertRule[];
  notificationChannels: NotificationChannel[];
}

/**
 * Notification channel types
 */
export enum NotificationChannelType {
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  PAGERDUTY = 'pagerduty',
  WEBHOOK = 'webhook',
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  type: NotificationChannelType;
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Default alert rules
 */
const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    type: AlertType.SLA_VIOLATION,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    threshold: 10000, // 10 seconds
    windowMs: 60000, // 1 minute window
    cooldownMs: 300000, // 5 minute cooldown
  },
  {
    type: AlertType.ERROR_RATE_SPIKE,
    severity: AlertSeverity.WARNING,
    enabled: true,
    threshold: 0.05, // 5% error rate
    windowMs: 300000, // 5 minute window
    cooldownMs: 600000, // 10 minute cooldown
  },
  {
    type: AlertType.FRAUD_PATTERN,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    threshold: 10, // 10 fraud attempts
    windowMs: 600000, // 10 minute window
    cooldownMs: 1800000, // 30 minute cooldown
  },
  {
    type: AlertType.TIMEOUT_SPIKE,
    severity: AlertSeverity.WARNING,
    enabled: true,
    threshold: 0.1, // 10% timeout rate
    windowMs: 300000, // 5 minute window
    cooldownMs: 600000, // 10 minute cooldown
  },
];

/**
 * Alert manager class
 */
export class AlertManager {
  private config: AlertingConfig;
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private lastAlertTime: Map<AlertType, number> = new Map();
  private metricsWindow: Map<string, { timestamp: number; value: number }[]> = new Map();

  constructor(config: Partial<AlertingConfig> = {}) {
    this.config = {
      enabled: true,
      rules: DEFAULT_ALERT_RULES,
      notificationChannels: [],
      ...config,
    };
  }

  /**
   * Check for SLA violations (>10s latency)
   */
  checkSLAViolation(latencyMs: number, sessionId: string): void {
    const rule = this.getRule(AlertType.SLA_VIOLATION);
    if (!rule || !rule.enabled) return;

    if (latencyMs > rule.threshold) {
      this.createAlert(
        AlertType.SLA_VIOLATION,
        rule.severity,
        `Verification latency exceeded SLA: ${latencyMs}ms (threshold: ${rule.threshold}ms)`,
        {
          latencyMs,
          sessionId,
          threshold: rule.threshold,
        }
      );

      // Record metric
      metrics.counter(MetricNames.TIMEOUT_OCCURRED, 1, {
        type: 'sla_violation',
        sessionId,
      });
    }
  }

  /**
   * Check for error rate spikes
   */
  checkErrorRateSpike(errorCount: number, totalCount: number): void {
    const rule = this.getRule(AlertType.ERROR_RATE_SPIKE);
    if (!rule || !rule.enabled) return;

    const errorRate = totalCount > 0 ? errorCount / totalCount : 0;

    if (errorRate > rule.threshold) {
      this.createAlert(
        AlertType.ERROR_RATE_SPIKE,
        rule.severity,
        `Error rate spike detected: ${(errorRate * 100).toFixed(2)}% (threshold: ${(rule.threshold * 100).toFixed(2)}%)`,
        {
          errorCount,
          totalCount,
          errorRate,
          threshold: rule.threshold,
        }
      );
    }
  }

  /**
   * Check for fraud patterns
   */
  checkFraudPattern(
    fraudType: 'synthetic' | 'spoof',
    userId: string,
    metadata?: Record<string, any>
  ): void {
    const rule = this.getRule(AlertType.FRAUD_PATTERN);
    if (!rule || !rule.enabled) return;

    // Track fraud attempts in time window
    const key = `fraud_${fraudType}_${userId}`;
    this.addToMetricsWindow(key, 1, rule.windowMs);

    const fraudCount = this.getMetricsWindowSum(key);

    if (fraudCount >= rule.threshold) {
      this.createAlert(
        AlertType.FRAUD_PATTERN,
        rule.severity,
        `Fraud pattern detected: ${fraudCount} ${fraudType} attempts from user ${userId}`,
        {
          fraudType,
          userId,
          fraudCount,
          threshold: rule.threshold,
          ...metadata,
        }
      );

      // Record metric
      metrics.counter(MetricNames.ERROR_OCCURRED, 1, {
        type: 'fraud_pattern',
        fraudType,
      });
    }
  }

  /**
   * Check for timeout spikes
   */
  checkTimeoutSpike(timeoutCount: number, totalCount: number): void {
    const rule = this.getRule(AlertType.TIMEOUT_SPIKE);
    if (!rule || !rule.enabled) return;

    const timeoutRate = totalCount > 0 ? timeoutCount / totalCount : 0;

    if (timeoutRate > rule.threshold) {
      this.createAlert(
        AlertType.TIMEOUT_SPIKE,
        rule.severity,
        `Timeout rate spike detected: ${(timeoutRate * 100).toFixed(2)}% (threshold: ${(rule.threshold * 100).toFixed(2)}%)`,
        {
          timeoutCount,
          totalCount,
          timeoutRate,
          threshold: rule.threshold,
        }
      );
    }
  }

  /**
   * Check for external API failures
   */
  checkExternalAPIFailure(
    apiName: string,
    failureCount: number,
    totalCount: number
  ): void {
    const failureRate = totalCount > 0 ? failureCount / totalCount : 0;

    if (failureRate > 0.2) {
      // 20% failure rate
      this.createAlert(
        AlertType.EXTERNAL_API_FAILURE,
        AlertSeverity.CRITICAL,
        `External API ${apiName} experiencing high failure rate: ${(failureRate * 100).toFixed(2)}%`,
        {
          apiName,
          failureCount,
          totalCount,
          failureRate,
        }
      );
    }
  }

  /**
   * Create an alert
   */
  private createAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    metadata: Record<string, any>
  ): void {
    // Check cooldown period
    const rule = this.getRule(type);
    if (rule && !this.canCreateAlert(type, rule.cooldownMs)) {
      logger.debug('Alert suppressed due to cooldown', { type, message });
      return;
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity,
      message,
      timestamp: Date.now(),
      metadata,
      resolved: false,
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.lastAlertTime.set(type, Date.now());

    // Log alert
    logger.warn('Alert created', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      metadata: alert.metadata,
    });

    // Send notifications
    this.sendNotifications(alert);

    // Record metric
    metrics.counter('vlo.alert.created', 1, {
      type: alert.type,
      severity: alert.severity,
    });
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    this.activeAlerts.delete(alertId);

    logger.info('Alert resolved', {
      alertId: alert.id,
      type: alert.type,
      duration: alert.resolvedAt - alert.timestamp,
    });

    metrics.counter('vlo.alert.resolved', 1, {
      type: alert.type,
    });
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Send notifications for an alert
   */
  private sendNotifications(alert: Alert): void {
    for (const channel of this.config.notificationChannels) {
      if (!channel.enabled) continue;

      try {
        this.sendNotification(channel, alert);
      } catch (error) {
        logger.error('Failed to send alert notification', error as Error, {
          channel: channel.type,
          alertId: alert.id,
        });
      }
    }
  }

  /**
   * Send notification to a specific channel
   */
  private sendNotification(channel: NotificationChannel, alert: Alert): void {
    // In production, this would integrate with actual notification services
    // For now, just log the notification
    logger.info('Alert notification sent', {
      channel: channel.type,
      alertId: alert.id,
      severity: alert.severity,
      message: alert.message,
    });

    // Placeholder for actual implementations:
    // - Email: Use AWS SES, SendGrid, etc.
    // - SMS: Use Twilio, AWS SNS, etc.
    // - Slack: Use Slack Webhook API
    // - PagerDuty: Use PagerDuty Events API
    // - Webhook: HTTP POST to configured endpoint
  }

  /**
   * Get alert rule by type
   */
  private getRule(type: AlertType): AlertRule | undefined {
    return this.config.rules.find(rule => rule.type === type);
  }

  /**
   * Check if alert can be created (cooldown check)
   */
  private canCreateAlert(type: AlertType, cooldownMs: number): boolean {
    const lastTime = this.lastAlertTime.get(type);
    if (!lastTime) return true;

    return Date.now() - lastTime >= cooldownMs;
  }

  /**
   * Add value to metrics window
   */
  private addToMetricsWindow(key: string, value: number, windowMs: number): void {
    if (!this.metricsWindow.has(key)) {
      this.metricsWindow.set(key, []);
    }

    const window = this.metricsWindow.get(key)!;
    const now = Date.now();

    // Add new value
    window.push({ timestamp: now, value });

    // Remove old values outside window
    const cutoff = now - windowMs;
    const filtered = window.filter(item => item.timestamp >= cutoff);
    this.metricsWindow.set(key, filtered);
  }

  /**
   * Get sum of values in metrics window
   */
  private getMetricsWindowSum(key: string): number {
    const window = this.metricsWindow.get(key);
    if (!window) return 0;

    return window.reduce((sum, item) => sum + item.value, 0);
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear alert history (for testing)
   */
  clearHistory(): void {
    this.alertHistory = [];
    this.activeAlerts.clear();
    this.lastAlertTime.clear();
    this.metricsWindow.clear();
  }
}

/**
 * Global alert manager instance
 */
export const alertManager = new AlertManager();

/**
 * Create a child alert manager with custom configuration
 */
export function createAlertManager(config: Partial<AlertingConfig>): AlertManager {
  return new AlertManager(config);
}
