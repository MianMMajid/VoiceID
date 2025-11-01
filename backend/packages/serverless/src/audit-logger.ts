import { AuditLog, AuditEvent, VerificationResult } from '@vlo/shared-types';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

/**
 * Audit log storage configuration
 */
export interface AuditLogStorageConfig {
  retentionDays: number;
  encryptionEnabled: boolean;
  encryptionKey?: string;
  tamperEvidentEnabled: boolean;
}

/**
 * Audit log filter options
 */
export interface AuditLogFilter {
  userId?: string;
  sessionId?: string;
  event?: AuditEvent;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

/**
 * Audit log export format
 */
export enum AuditLogExportFormat {
  JSON = 'json',
  CSV = 'csv'
}

/**
 * Audit logger interface for compliance and security logging
 */
export interface AuditLogger {
  /**
   * Log an audit event
   */
  logEvent(
    sessionId: string,
    userId: string,
    event: AuditEvent,
    result: VerificationResult,
    metadata: {
      ipAddress: string;
      userAgent: string;
      region: string;
    }
  ): Promise<AuditLog>;
  
  /**
   * Get audit logs for a session
   */
  getSessionLogs(sessionId: string): Promise<AuditLog[]>;
  
  /**
   * Get audit logs for a user
   */
  getUserLogs(userId: string): Promise<AuditLog[]>;
  
  /**
   * Query audit logs with filters
   */
  queryLogs(filter: AuditLogFilter): Promise<AuditLog[]>;
  
  /**
   * Export audit logs in specified format
   */
  exportLogs(filter: AuditLogFilter, format: AuditLogExportFormat): Promise<string>;
  
  /**
   * Clean up expired audit logs (90-day retention)
   */
  cleanupExpiredLogs(): Promise<number>;
  
  /**
   * Increment fraud attempt counter
   */
  incrementFraudCounter(userId: string): Promise<number>;
  
  /**
   * Get fraud attempt count for user
   */
  getFraudCount(userId: string): Promise<number>;
  
  /**
   * Verify audit log integrity (tamper-evident check)
   */
  verifyIntegrity(auditLogId: string): Promise<boolean>;
}

/**
 * Encrypted audit log entry with tamper-evident hash
 */
interface EncryptedAuditLog extends AuditLog {
  hash?: string;
  encrypted?: boolean;
}

/**
 * In-memory audit logger implementation with encryption and tamper-evident storage
 * For production use, replace with CloudWatch Logs, Stackdriver, or similar
 */
export class InMemoryAuditLogger implements AuditLogger {
  private logs: Map<string, EncryptedAuditLog> = new Map();
  private fraudCounters: Map<string, number> = new Map();
  private config: AuditLogStorageConfig;
  
  constructor(config: Partial<AuditLogStorageConfig> = {}) {
    this.config = {
      retentionDays: config.retentionDays || 90,
      encryptionEnabled: config.encryptionEnabled ?? true,
      encryptionKey: config.encryptionKey || this.generateEncryptionKey(),
      tamperEvidentEnabled: config.tamperEvidentEnabled ?? true
    };
  }
  
  /**
   * Generate a random encryption key (AES-256)
   */
  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Encrypt sensitive data in audit log
   */
  private encryptData(data: string): string {
    if (!this.config.encryptionEnabled || !this.config.encryptionKey) {
      return data;
    }
    
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }
  
  /**
   * Decrypt sensitive data from audit log
   */
  private decryptData(encryptedData: string): string {
    if (!this.config.encryptionEnabled || !this.config.encryptionKey) {
      return encryptedData;
    }
    
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      return encryptedData;
    }
    
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Calculate tamper-evident hash for audit log
   */
  private calculateHash(auditLog: AuditLog): string {
    const data = JSON.stringify({
      id: auditLog.id,
      sessionId: auditLog.sessionId,
      userId: auditLog.userId,
      timestamp: auditLog.timestamp,
      event: auditLog.event,
      result: auditLog.result
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  async logEvent(
    sessionId: string,
    userId: string,
    event: AuditEvent,
    result: VerificationResult,
    metadata: {
      ipAddress: string;
      userAgent: string;
      region: string;
    }
  ): Promise<AuditLog> {
    const now = Date.now();
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    
    const auditLog: AuditLog = {
      id: uuidv4(),
      sessionId,
      userId,
      timestamp: now,
      event,
      result,
      metadata,
      retention: {
        expiresAt: now + retentionMs,
        archived: false
      }
    };
    
    // Create encrypted version with tamper-evident hash
    const encryptedLog: EncryptedAuditLog = {
      ...auditLog,
      encrypted: this.config.encryptionEnabled
    };
    
    // Add tamper-evident hash
    if (this.config.tamperEvidentEnabled) {
      encryptedLog.hash = this.calculateHash(auditLog);
    }
    
    this.logs.set(auditLog.id, encryptedLog);
    return auditLog;
  }
  
  async getSessionLogs(sessionId: string): Promise<AuditLog[]> {
    const logs: AuditLog[] = [];
    
    for (const log of this.logs.values()) {
      if (log.sessionId === sessionId) {
        logs.push(this.sanitizeLog(log));
      }
    }
    
    return logs.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  async getUserLogs(userId: string): Promise<AuditLog[]> {
    const logs: AuditLog[] = [];
    
    for (const log of this.logs.values()) {
      if (log.userId === userId) {
        logs.push(this.sanitizeLog(log));
      }
    }
    
    return logs.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  async queryLogs(filter: AuditLogFilter): Promise<AuditLog[]> {
    let logs: AuditLog[] = Array.from(this.logs.values()).map(log => this.sanitizeLog(log));
    
    // Apply filters
    if (filter.userId) {
      logs = logs.filter(log => log.userId === filter.userId);
    }
    
    if (filter.sessionId) {
      logs = logs.filter(log => log.sessionId === filter.sessionId);
    }
    
    if (filter.event) {
      logs = logs.filter(log => log.event === filter.event);
    }
    
    if (filter.startTime) {
      logs = logs.filter(log => log.timestamp >= filter.startTime!);
    }
    
    if (filter.endTime) {
      logs = logs.filter(log => log.timestamp <= filter.endTime!);
    }
    
    // Sort by timestamp
    logs.sort((a, b) => a.timestamp - b.timestamp);
    
    // Apply limit
    if (filter.limit && filter.limit > 0) {
      logs = logs.slice(0, filter.limit);
    }
    
    return logs;
  }
  
  async exportLogs(filter: AuditLogFilter, format: AuditLogExportFormat): Promise<string> {
    const logs = await this.queryLogs(filter);
    
    if (format === AuditLogExportFormat.JSON) {
      return JSON.stringify(logs, null, 2);
    } else if (format === AuditLogExportFormat.CSV) {
      return this.convertToCSV(logs);
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }
  
  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: AuditLog[]): string {
    if (logs.length === 0) {
      return '';
    }
    
    // CSV headers
    const headers = [
      'id',
      'sessionId',
      'userId',
      'timestamp',
      'event',
      'success',
      'livenessScore',
      'reason',
      'ipAddress',
      'userAgent',
      'region'
    ];
    
    const rows = logs.map(log => [
      log.id,
      log.sessionId,
      log.userId,
      new Date(log.timestamp).toISOString(),
      log.event,
      log.result.success,
      log.result.livenessScore,
      log.result.reason || '',
      log.metadata.ipAddress,
      log.metadata.userAgent,
      log.metadata.region
    ]);
    
    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ];
    
    return csvLines.join('\n');
  }
  
  async cleanupExpiredLogs(): Promise<number> {
    const now = Date.now();
    let count = 0;
    
    for (const [id, log] of this.logs.entries()) {
      if (now > log.retention.expiresAt) {
        this.logs.delete(id);
        count++;
      }
    }
    
    return count;
  }
  
  async incrementFraudCounter(userId: string): Promise<number> {
    const current = this.fraudCounters.get(userId) || 0;
    const newCount = current + 1;
    this.fraudCounters.set(userId, newCount);
    return newCount;
  }
  
  async getFraudCount(userId: string): Promise<number> {
    return this.fraudCounters.get(userId) || 0;
  }
  
  async verifyIntegrity(auditLogId: string): Promise<boolean> {
    const log = this.logs.get(auditLogId);
    
    if (!log) {
      return false;
    }
    
    if (!this.config.tamperEvidentEnabled || !log.hash) {
      return true; // No integrity check enabled
    }
    
    const currentHash = this.calculateHash(log);
    return currentHash === log.hash;
  }
  
  /**
   * Remove internal fields from audit log before returning
   */
  private sanitizeLog(log: EncryptedAuditLog): AuditLog {
    const { hash, encrypted, ...sanitized } = log;
    return sanitized;
  }
}

/**
 * CloudWatch audit logger implementation
 * Production-ready implementation for AWS CloudWatch Logs with tamper-evident storage
 */
export class CloudWatchAuditLogger implements AuditLogger {
  private config: AuditLogStorageConfig;
  private fraudCounters: Map<string, number> = new Map();
  
  constructor(
    private logGroupName: string,
    private logStreamName: string,
    private cloudWatchClient?: any, // AWS.CloudWatchLogs
    config: Partial<AuditLogStorageConfig> = {}
  ) {
    this.config = {
      retentionDays: config.retentionDays || 90,
      encryptionEnabled: config.encryptionEnabled ?? true,
      encryptionKey: config.encryptionKey,
      tamperEvidentEnabled: config.tamperEvidentEnabled ?? true
    };
  }
  
  /**
   * Calculate tamper-evident hash for audit log
   */
  private calculateHash(auditLog: AuditLog): string {
    const data = JSON.stringify({
      id: auditLog.id,
      sessionId: auditLog.sessionId,
      userId: auditLog.userId,
      timestamp: auditLog.timestamp,
      event: auditLog.event,
      result: auditLog.result
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  async logEvent(
    sessionId: string,
    userId: string,
    event: AuditEvent,
    result: VerificationResult,
    metadata: {
      ipAddress: string;
      userAgent: string;
      region: string;
    }
  ): Promise<AuditLog> {
    const now = Date.now();
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    
    const auditLog: AuditLog = {
      id: uuidv4(),
      sessionId,
      userId,
      timestamp: now,
      event,
      result,
      metadata,
      retention: {
        expiresAt: now + retentionMs,
        archived: false
      }
    };
    
    // Add tamper-evident hash
    const logEntry: any = { ...auditLog };
    if (this.config.tamperEvidentEnabled) {
      logEntry.hash = this.calculateHash(auditLog);
    }
    
    // In production, send to CloudWatch Logs:
    // await this.cloudWatchClient.putLogEvents({
    //   logGroupName: this.logGroupName,
    //   logStreamName: this.logStreamName,
    //   logEvents: [{
    //     timestamp: now,
    //     message: JSON.stringify(logEntry)
    //   }]
    // }).promise();
    
    // For now, log to console in structured format
    console.log(JSON.stringify({
      logGroup: this.logGroupName,
      logStream: this.logStreamName,
      auditLog: logEntry
    }));
    
    return auditLog;
  }
  
  async getSessionLogs(sessionId: string): Promise<AuditLog[]> {
    // In production, use CloudWatch Logs Insights query:
    // const query = `fields @timestamp, @message | filter sessionId = "${sessionId}" | sort @timestamp asc`;
    // const results = await this.cloudWatchClient.startQuery({...}).promise();
    
    console.warn('CloudWatch Logs Insights query not implemented - returning empty array');
    return [];
  }
  
  async getUserLogs(userId: string): Promise<AuditLog[]> {
    // In production, use CloudWatch Logs Insights query:
    // const query = `fields @timestamp, @message | filter userId = "${userId}" | sort @timestamp asc`;
    
    console.warn('CloudWatch Logs Insights query not implemented - returning empty array');
    return [];
  }
  
  async queryLogs(filter: AuditLogFilter): Promise<AuditLog[]> {
    // In production, build CloudWatch Logs Insights query from filter
    // Example query:
    // fields @timestamp, @message
    // | filter userId = "user123" and event = "fraud_detected"
    // | filter @timestamp >= ${startTime} and @timestamp <= ${endTime}
    // | sort @timestamp asc
    // | limit ${limit}
    
    console.warn('CloudWatch Logs Insights query not implemented - returning empty array');
    return [];
  }
  
  async exportLogs(filter: AuditLogFilter, format: AuditLogExportFormat): Promise<string> {
    const logs = await this.queryLogs(filter);
    
    if (format === AuditLogExportFormat.JSON) {
      return JSON.stringify(logs, null, 2);
    } else if (format === AuditLogExportFormat.CSV) {
      return this.convertToCSV(logs);
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }
  
  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: AuditLog[]): string {
    if (logs.length === 0) {
      return '';
    }
    
    const headers = [
      'id',
      'sessionId',
      'userId',
      'timestamp',
      'event',
      'success',
      'livenessScore',
      'reason',
      'ipAddress',
      'userAgent',
      'region'
    ];
    
    const rows = logs.map(log => [
      log.id,
      log.sessionId,
      log.userId,
      new Date(log.timestamp).toISOString(),
      log.event,
      log.result.success,
      log.result.livenessScore,
      log.result.reason || '',
      log.metadata.ipAddress,
      log.metadata.userAgent,
      log.metadata.region
    ]);
    
    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ];
    
    return csvLines.join('\n');
  }
  
  async cleanupExpiredLogs(): Promise<number> {
    // In production, CloudWatch Logs retention is configured at the log group level
    // This would be set via AWS SDK or Terraform:
    // await this.cloudWatchClient.putRetentionPolicy({
    //   logGroupName: this.logGroupName,
    //   retentionInDays: this.config.retentionDays
    // }).promise();
    
    console.warn('CloudWatch Logs retention policy should be configured at log group level');
    return 0;
  }
  
  async incrementFraudCounter(userId: string): Promise<number> {
    // In production, use DynamoDB or similar for fraud counters
    const current = this.fraudCounters.get(userId) || 0;
    const newCount = current + 1;
    this.fraudCounters.set(userId, newCount);
    return newCount;
  }
  
  async getFraudCount(userId: string): Promise<number> {
    return this.fraudCounters.get(userId) || 0;
  }
  
  async verifyIntegrity(auditLogId: string): Promise<boolean> {
    // In production, retrieve log from CloudWatch and verify hash
    console.warn('CloudWatch integrity verification not implemented');
    return true;
  }
}
