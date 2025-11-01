# Audit Logging System

## Overview

The VoiceLiveness Onboarder audit logging system provides comprehensive, tamper-evident logging for compliance and security investigations. It supports encryption, 90-day retention, and export capabilities in multiple formats.

## Features

- **Tamper-Evident Storage**: SHA-256 hashing ensures log integrity
- **Encryption**: AES-256 encryption for sensitive data at rest
- **90-Day Retention**: Automatic cleanup of expired logs
- **Multiple Export Formats**: JSON and CSV export support
- **Comprehensive Filtering**: Query logs by user, session, event type, and time range
- **Fraud Tracking**: Built-in fraud attempt counter per user

## Usage

### Basic Setup

```typescript
import { InMemoryAuditLogger } from '@vlo/serverless';

// Create audit logger with default configuration
const auditLogger = new InMemoryAuditLogger({
  retentionDays: 90,
  encryptionEnabled: true,
  tamperEvidentEnabled: true
});
```

### Logging Events

```typescript
import { AuditEvent } from '@vlo/shared-types';

// Log session creation
await auditLogger.logEvent(
  sessionId,
  userId,
  AuditEvent.SESSION_CREATED,
  verificationResult,
  {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    region: 'us-east-1'
  }
);

// Log verification completion
await auditLogger.logEvent(
  sessionId,
  userId,
  AuditEvent.VERIFICATION_COMPLETED,
  verificationResult,
  metadata
);

// Log fraud detection
await auditLogger.logEvent(
  sessionId,
  userId,
  AuditEvent.FRAUD_DETECTED,
  verificationResult,
  metadata
);
```

### Querying Logs

```typescript
// Get all logs for a session
const sessionLogs = await auditLogger.getSessionLogs(sessionId);

// Get all logs for a user
const userLogs = await auditLogger.getUserLogs(userId);

// Query with filters
const filteredLogs = await auditLogger.queryLogs({
  userId: 'user-123',
  event: AuditEvent.FRAUD_DETECTED,
  startTime: Date.now() - 86400000, // Last 24 hours
  limit: 100
});
```

### Exporting Logs

```typescript
import { AuditLogExportFormat } from '@vlo/serverless';

// Export as JSON
const jsonExport = await auditLogger.exportLogs(
  { userId: 'user-123' },
  AuditLogExportFormat.JSON
);

// Export as CSV
const csvExport = await auditLogger.exportLogs(
  { userId: 'user-123' },
  AuditLogExportFormat.CSV
);
```

### Fraud Tracking

```typescript
// Increment fraud counter
const fraudCount = await auditLogger.incrementFraudCounter(userId);

// Get fraud count
const count = await auditLogger.getFraudCount(userId);
```

### Maintenance

```typescript
// Clean up expired logs (90+ days old)
const deletedCount = await auditLogger.cleanupExpiredLogs();

// Verify log integrity
const isValid = await auditLogger.verifyIntegrity(auditLogId);
```

## Production Deployment

### CloudWatch Implementation

For production use with AWS CloudWatch Logs:

```typescript
import { CloudWatchAuditLogger } from '@vlo/serverless';

const auditLogger = new CloudWatchAuditLogger(
  'vlo-audit-logs',           // Log group name
  'verification-stream',       // Log stream name
  cloudWatchClient,            // AWS SDK client
  {
    retentionDays: 90,
    encryptionEnabled: true,
    tamperEvidentEnabled: true
  }
);
```

### Terraform Configuration

Configure CloudWatch Logs with retention:

```hcl
resource "aws_cloudwatch_log_group" "audit_logs" {
  name              = "vlo-audit-logs"
  retention_in_days = 90
  
  kms_key_id = aws_kms_key.audit_logs.arn
  
  tags = {
    Environment = "production"
    Purpose     = "audit-logging"
  }
}

resource "aws_kms_key" "audit_logs" {
  description             = "KMS key for audit log encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
}
```

## Event Types

The system logs four types of audit events:

1. **SESSION_CREATED**: When a new verification session is initiated
2. **AUDIO_SUBMITTED**: When user audio is submitted for verification
3. **VERIFICATION_COMPLETED**: When verification process completes (success or failure)
4. **FRAUD_DETECTED**: When synthetic voice or spoof is detected

## Data Model

Each audit log contains:

- **id**: Unique identifier
- **sessionId**: Associated session ID
- **userId**: User identifier
- **timestamp**: Event timestamp
- **event**: Event type
- **result**: Complete verification result with all checks
- **metadata**: IP address, user agent, region
- **retention**: Expiry timestamp and archive status

## Compliance

The audit logging system supports:

- **GDPR**: Right to deletion, data export
- **CCPA**: Data access and deletion
- **SOC 2**: Tamper-evident logging, encryption at rest
- **90-Day Retention**: Configurable retention period

## Security

- **Encryption**: AES-256-CBC for data at rest
- **Integrity**: SHA-256 hashing for tamper detection
- **Access Control**: Implement IAM policies for log access
- **Immutability**: Logs cannot be modified after creation

## Performance

- **In-Memory**: Fast for development and testing
- **CloudWatch**: Scalable for production workloads
- **Batch Operations**: Cleanup runs periodically
- **Indexed Queries**: Efficient filtering by user/session/event

## Testing

Run the audit logger tests:

```bash
npm test -- audit-logger.test.ts
```

All 23 tests cover:
- Event logging
- Query and filtering
- Export (JSON/CSV)
- Retention and cleanup
- Fraud tracking
- Integrity verification
