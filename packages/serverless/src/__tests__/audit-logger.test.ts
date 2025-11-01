import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryAuditLogger,
  CloudWatchAuditLogger,
  AuditLogExportFormat
} from '../audit-logger';
import {
  AuditEvent,
  VerificationResult,
  FailureReason
} from '@vlo/shared-types';

describe('InMemoryAuditLogger', () => {
  let auditLogger: InMemoryAuditLogger;
  
  beforeEach(() => {
    auditLogger = new InMemoryAuditLogger({
      retentionDays: 90,
      encryptionEnabled: true,
      tamperEvidentEnabled: true
    });
  });
  
  const createMockResult = (success: boolean = true): VerificationResult => ({
    sessionId: 'session-123',
    success,
    livenessScore: success ? 95 : 45,
    timestamp: Date.now(),
    checks: {
      stt: {
        transcription: 'test phrase',
        confidence: 0.95,
        similarity: 0.92,
        matched: true
      },
      synth: {
        probability: 0.02,
        isSynthetic: false,
        modelVersion: 'v1.0'
      },
      spoof: {
        score: 0.98,
        eer: 0.005,
        isSpoofed: false,
        modelVersion: 'v1.0'
      }
    },
    reason: success ? undefined : FailureReason.PHRASE_MISMATCH,
    processingTimeMs: 5000
  });
  
  describe('logEvent', () => {
    it('should log session creation event', async () => {
      const result = createMockResult();
      
      const auditLog = await auditLogger.logEvent(
        'session-123',
        'user-456',
        AuditEvent.SESSION_CREATED,
        result,
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          region: 'us-east-1'
        }
      );
      
      expect(auditLog.id).toBeDefined();
      expect(auditLog.sessionId).toBe('session-123');
      expect(auditLog.userId).toBe('user-456');
      expect(auditLog.event).toBe(AuditEvent.SESSION_CREATED);
      expect(auditLog.metadata.ipAddress).toBe('192.168.1.1');
      expect(auditLog.retention.expiresAt).toBeGreaterThan(Date.now());
    });
    
    it('should log verification completed event', async () => {
      const result = createMockResult();
      
      const auditLog = await auditLogger.logEvent(
        'session-123',
        'user-456',
        AuditEvent.VERIFICATION_COMPLETED,
        result,
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          region: 'us-east-1'
        }
      );
      
      expect(auditLog.event).toBe(AuditEvent.VERIFICATION_COMPLETED);
      expect(auditLog.result.success).toBe(true);
      expect(auditLog.result.livenessScore).toBe(95);
    });
    
    it('should log fraud detection event', async () => {
      const result = createMockResult(false);
      result.reason = FailureReason.SYNTHETIC_VOICE;
      
      const auditLog = await auditLogger.logEvent(
        'session-123',
        'user-456',
        AuditEvent.FRAUD_DETECTED,
        result,
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          region: 'us-east-1'
        }
      );
      
      expect(auditLog.event).toBe(AuditEvent.FRAUD_DETECTED);
      expect(auditLog.result.success).toBe(false);
      expect(auditLog.result.reason).toBe(FailureReason.SYNTHETIC_VOICE);
    });
    
    it('should set 90-day retention by default', async () => {
      const result = createMockResult();
      const now = Date.now();
      
      const auditLog = await auditLogger.logEvent(
        'session-123',
        'user-456',
        AuditEvent.SESSION_CREATED,
        result,
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          region: 'us-east-1'
        }
      );
      
      const expectedExpiry = now + (90 * 24 * 60 * 60 * 1000);
      expect(auditLog.retention.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(auditLog.retention.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
    });
  });
  
  describe('getSessionLogs', () => {
    it('should retrieve all logs for a session', async () => {
      const result = createMockResult();
      
      await auditLogger.logEvent('session-123', 'user-456', AuditEvent.SESSION_CREATED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      await auditLogger.logEvent('session-123', 'user-456', AuditEvent.AUDIO_SUBMITTED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      await auditLogger.logEvent('session-456', 'user-456', AuditEvent.SESSION_CREATED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      const logs = await auditLogger.getSessionLogs('session-123');
      
      expect(logs).toHaveLength(2);
      expect(logs[0].event).toBe(AuditEvent.SESSION_CREATED);
      expect(logs[1].event).toBe(AuditEvent.AUDIO_SUBMITTED);
    });
    
    it('should return empty array for non-existent session', async () => {
      const logs = await auditLogger.getSessionLogs('non-existent');
      expect(logs).toHaveLength(0);
    });
  });
  
  describe('getUserLogs', () => {
    it('should retrieve all logs for a user', async () => {
      const result = createMockResult();
      
      await auditLogger.logEvent('session-123', 'user-456', AuditEvent.SESSION_CREATED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      await auditLogger.logEvent('session-789', 'user-456', AuditEvent.SESSION_CREATED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      await auditLogger.logEvent('session-999', 'user-999', AuditEvent.SESSION_CREATED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      const logs = await auditLogger.getUserLogs('user-456');
      
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.userId === 'user-456')).toBe(true);
    });
  });
  
  describe('queryLogs', () => {
    beforeEach(async () => {
      const result = createMockResult();
      
      // Create test logs
      await auditLogger.logEvent('session-1', 'user-1', AuditEvent.SESSION_CREATED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      await auditLogger.logEvent('session-1', 'user-1', AuditEvent.VERIFICATION_COMPLETED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      await auditLogger.logEvent('session-2', 'user-2', AuditEvent.FRAUD_DETECTED, result, {
        ipAddress: '192.168.1.2',
        userAgent: 'Chrome/90.0',
        region: 'us-west-2'
      });
    });
    
    it('should filter logs by userId', async () => {
      const logs = await auditLogger.queryLogs({ userId: 'user-1' });
      
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.userId === 'user-1')).toBe(true);
    });
    
    it('should filter logs by sessionId', async () => {
      const logs = await auditLogger.queryLogs({ sessionId: 'session-1' });
      
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.sessionId === 'session-1')).toBe(true);
    });
    
    it('should filter logs by event type', async () => {
      const logs = await auditLogger.queryLogs({ event: AuditEvent.FRAUD_DETECTED });
      
      expect(logs).toHaveLength(1);
      expect(logs[0].event).toBe(AuditEvent.FRAUD_DETECTED);
    });
    
    it('should filter logs by time range', async () => {
      const now = Date.now();
      const logs = await auditLogger.queryLogs({
        startTime: now - 10000,
        endTime: now + 10000
      });
      
      expect(logs.length).toBeGreaterThan(0);
    });
    
    it('should limit number of results', async () => {
      const logs = await auditLogger.queryLogs({ limit: 2 });
      
      expect(logs).toHaveLength(2);
    });
    
    it('should combine multiple filters', async () => {
      const logs = await auditLogger.queryLogs({
        userId: 'user-1',
        event: AuditEvent.SESSION_CREATED,
        limit: 1
      });
      
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('user-1');
      expect(logs[0].event).toBe(AuditEvent.SESSION_CREATED);
    });
  });
  
  describe('exportLogs', () => {
    beforeEach(async () => {
      const result = createMockResult();
      
      await auditLogger.logEvent('session-1', 'user-1', AuditEvent.SESSION_CREATED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      await auditLogger.logEvent('session-1', 'user-1', AuditEvent.VERIFICATION_COMPLETED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
    });
    
    it('should export logs in JSON format', async () => {
      const exported = await auditLogger.exportLogs(
        { userId: 'user-1' },
        AuditLogExportFormat.JSON
      );
      
      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });
    
    it('should export logs in CSV format', async () => {
      const exported = await auditLogger.exportLogs(
        { userId: 'user-1' },
        AuditLogExportFormat.CSV
      );
      
      expect(exported).toBeDefined();
      expect(exported).toContain('id,sessionId,userId');
      expect(exported).toContain('session-1');
      expect(exported).toContain('user-1');
      
      const lines = exported.split('\n');
      expect(lines.length).toBeGreaterThan(2); // Header + 2 data rows
    });
  });
  
  describe('cleanupExpiredLogs', () => {
    it('should remove expired logs', async () => {
      const result = createMockResult();
      
      // Create logger with very short retention for testing
      const shortRetentionLogger = new InMemoryAuditLogger({
        retentionDays: -1 // Negative value to ensure immediate expiry
      });
      
      await shortRetentionLogger.logEvent('session-1', 'user-1', AuditEvent.SESSION_CREATED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      const count = await shortRetentionLogger.cleanupExpiredLogs();
      
      expect(count).toBe(1);
      
      const logs = await shortRetentionLogger.getUserLogs('user-1');
      expect(logs).toHaveLength(0);
    });
    
    it('should not remove non-expired logs', async () => {
      const result = createMockResult();
      
      await auditLogger.logEvent('session-1', 'user-1', AuditEvent.SESSION_CREATED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      const count = await auditLogger.cleanupExpiredLogs();
      
      expect(count).toBe(0);
      
      const logs = await auditLogger.getUserLogs('user-1');
      expect(logs).toHaveLength(1);
    });
  });
  
  describe('fraud counter', () => {
    it('should increment fraud counter', async () => {
      const count1 = await auditLogger.incrementFraudCounter('user-1');
      expect(count1).toBe(1);
      
      const count2 = await auditLogger.incrementFraudCounter('user-1');
      expect(count2).toBe(2);
      
      const count3 = await auditLogger.incrementFraudCounter('user-1');
      expect(count3).toBe(3);
    });
    
    it('should get fraud count', async () => {
      await auditLogger.incrementFraudCounter('user-1');
      await auditLogger.incrementFraudCounter('user-1');
      
      const count = await auditLogger.getFraudCount('user-1');
      expect(count).toBe(2);
    });
    
    it('should return 0 for user with no fraud attempts', async () => {
      const count = await auditLogger.getFraudCount('user-999');
      expect(count).toBe(0);
    });
  });
  
  describe('verifyIntegrity', () => {
    it('should verify integrity of audit log', async () => {
      const result = createMockResult();
      
      const auditLog = await auditLogger.logEvent('session-1', 'user-1', AuditEvent.SESSION_CREATED, result, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        region: 'us-east-1'
      });
      
      const isValid = await auditLogger.verifyIntegrity(auditLog.id);
      expect(isValid).toBe(true);
    });
    
    it('should return false for non-existent log', async () => {
      const isValid = await auditLogger.verifyIntegrity('non-existent');
      expect(isValid).toBe(false);
    });
  });
});

describe('CloudWatchAuditLogger', () => {
  let auditLogger: CloudWatchAuditLogger;
  
  beforeEach(() => {
    auditLogger = new CloudWatchAuditLogger(
      'vlo-audit-logs',
      'verification-stream'
    );
  });
  
  const createMockResult = (): VerificationResult => ({
    sessionId: 'session-123',
    success: true,
    livenessScore: 95,
    timestamp: Date.now(),
    checks: {
      stt: {
        transcription: 'test phrase',
        confidence: 0.95,
        similarity: 0.92,
        matched: true
      },
      synth: {
        probability: 0.02,
        isSynthetic: false,
        modelVersion: 'v1.0'
      },
      spoof: {
        score: 0.98,
        eer: 0.005,
        isSpoofed: false,
        modelVersion: 'v1.0'
      }
    },
    processingTimeMs: 5000
  });
  
  describe('logEvent', () => {
    it('should create audit log structure', async () => {
      const result = createMockResult();
      
      const auditLog = await auditLogger.logEvent(
        'session-123',
        'user-456',
        AuditEvent.SESSION_CREATED,
        result,
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          region: 'us-east-1'
        }
      );
      
      expect(auditLog.id).toBeDefined();
      expect(auditLog.sessionId).toBe('session-123');
      expect(auditLog.userId).toBe('user-456');
      expect(auditLog.event).toBe(AuditEvent.SESSION_CREATED);
    });
  });
});
