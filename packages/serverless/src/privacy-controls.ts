/**
 * Privacy Controls Service
 * Implements GDPR compliance, data anonymization, and consent management
 */

export interface ConsentRecord {
  userId: string;
  sessionId: string;
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  consentType: 'voice_biometric' | 'data_processing' | 'data_storage';
  granted: boolean;
  version: string; // Version of terms/privacy policy
}

export interface DataExportRequest {
  userId: string;
  requestedAt: number;
  format: 'json' | 'csv';
  includeAudio: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: number;
}

export interface DeletionRequest {
  userId: string;
  requestedAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  deletedAt?: number;
  retentionOverride?: boolean; // Override retention period for legal hold
}

export interface AnonymizationConfig {
  retentionDays: number;
  anonymizeFields: string[];
  deleteAudio: boolean;
  keepAggregateStats: boolean;
}

export interface PrivacyStore {
  // Consent management
  storeConsent(consent: ConsentRecord): Promise<void>;
  getConsent(userId: string, consentType: string): Promise<ConsentRecord | null>;
  getAllConsents(userId: string): Promise<ConsentRecord[]>;
  
  // Data export
  createExportRequest(request: DataExportRequest): Promise<string>;
  getExportRequest(requestId: string): Promise<DataExportRequest | null>;
  updateExportRequest(requestId: string, updates: Partial<DataExportRequest>): Promise<void>;
  
  // Data deletion
  createDeletionRequest(request: DeletionRequest): Promise<string>;
  getDeletionRequest(requestId: string): Promise<DeletionRequest | null>;
  updateDeletionRequest(requestId: string, updates: Partial<DeletionRequest>): Promise<void>;
  
  // User data queries
  getUserSessions(userId: string): Promise<any[]>;
  getUserAuditLogs(userId: string): Promise<any[]>;
  getUserVerificationResults(userId: string): Promise<any[]>;
}

/**
 * Privacy controls service
 */
export class PrivacyControlsService {
  private store: PrivacyStore;
  private config: AnonymizationConfig;
  
  constructor(store: PrivacyStore, config: AnonymizationConfig) {
    this.store = store;
    this.config = config;
  }
  
  /**
   * Record user consent
   */
  async recordConsent(
    userId: string,
    sessionId: string,
    consentType: 'voice_biometric' | 'data_processing' | 'data_storage',
    granted: boolean,
    ipAddress: string,
    userAgent: string,
    policyVersion: string
  ): Promise<void> {
    const consent: ConsentRecord = {
      userId,
      sessionId,
      timestamp: Date.now(),
      ipAddress,
      userAgent,
      consentType,
      granted,
      version: policyVersion
    };
    
    await this.store.storeConsent(consent);
  }
  
  /**
   * Check if user has granted consent
   */
  async hasConsent(userId: string, consentType: string): Promise<boolean> {
    const consent = await this.store.getConsent(userId, consentType);
    return consent !== null && consent.granted;
  }
  
  /**
   * Get all consents for a user
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    return this.store.getAllConsents(userId);
  }
  
  /**
   * Request data export (GDPR Article 20 - Right to data portability)
   */
  async requestDataExport(
    userId: string,
    format: 'json' | 'csv' = 'json',
    includeAudio: boolean = false
  ): Promise<string> {
    const request: DataExportRequest = {
      userId,
      requestedAt: Date.now(),
      format,
      includeAudio,
      status: 'pending'
    };
    
    const requestId = await this.store.createExportRequest(request);
    
    // Trigger async export processing
    this.processDataExport(requestId).catch(error => {
      console.error('Data export processing error:', error);
    });
    
    return requestId;
  }
  
  /**
   * Process data export request
   */
  private async processDataExport(requestId: string): Promise<void> {
    try {
      const request = await this.store.getExportRequest(requestId);
      if (!request) {
        throw new Error('Export request not found');
      }
      
      await this.store.updateExportRequest(requestId, { status: 'processing' });
      
      // Gather all user data
      const sessions = await this.store.getUserSessions(request.userId);
      const auditLogs = await this.store.getUserAuditLogs(request.userId);
      const verificationResults = await this.store.getUserVerificationResults(request.userId);
      const consents = await this.getUserConsents(request.userId);
      
      const exportData = {
        userId: request.userId,
        exportedAt: Date.now(),
        sessions,
        auditLogs,
        verificationResults,
        consents
      };
      
      // Generate export file
      let exportContent: string;
      if (request.format === 'json') {
        exportContent = JSON.stringify(exportData, null, 2);
      } else {
        exportContent = this.convertToCSV(exportData);
      }
      
      // Store export file (implementation depends on storage service)
      const downloadUrl = await this.storeExportFile(requestId, exportContent, request.format);
      
      // Set expiry for download URL (7 days)
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      
      await this.store.updateExportRequest(requestId, {
        status: 'completed',
        downloadUrl,
        expiresAt
      });
    } catch (error) {
      console.error('Data export error:', error);
      await this.store.updateExportRequest(requestId, { status: 'failed' });
    }
  }
  
  /**
   * Request data deletion (GDPR Article 17 - Right to erasure)
   */
  async requestDataDeletion(userId: string): Promise<string> {
    const request: DeletionRequest = {
      userId,
      requestedAt: Date.now(),
      status: 'pending'
    };
    
    const requestId = await this.store.createDeletionRequest(request);
    
    // Trigger async deletion processing
    this.processDataDeletion(requestId).catch(error => {
      console.error('Data deletion processing error:', error);
    });
    
    return requestId;
  }
  
  /**
   * Process data deletion request
   */
  private async processDataDeletion(requestId: string): Promise<void> {
    try {
      const request = await this.store.getDeletionRequest(requestId);
      if (!request) {
        throw new Error('Deletion request not found');
      }
      
      await this.store.updateDeletionRequest(requestId, { status: 'processing' });
      
      // Delete user data
      await this.deleteUserData(request.userId);
      
      await this.store.updateDeletionRequest(requestId, {
        status: 'completed',
        deletedAt: Date.now()
      });
    } catch (error) {
      console.error('Data deletion error:', error);
      await this.store.updateDeletionRequest(requestId, { status: 'failed' });
    }
  }
  
  /**
   * Delete all user data
   */
  private async deleteUserData(userId: string): Promise<void> {
    // This is a placeholder - actual implementation would delete from all storage systems
    console.log(`Deleting all data for user ${userId}`);
    
    // Delete sessions
    // Delete audit logs
    // Delete verification results
    // Delete audio files
    // Delete consents
    // Anonymize any remaining references
  }
  
  /**
   * Anonymize data after retention period
   */
  async anonymizeExpiredData(): Promise<void> {
    const cutoffDate = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    
    // Get all sessions older than retention period
    // This is a placeholder - actual implementation would query storage
    console.log(`Anonymizing data older than ${new Date(cutoffDate).toISOString()}`);
    
    // Anonymize PII fields
    // Delete audio files if configured
    // Keep aggregate statistics if configured
  }
  
  /**
   * Anonymize a single record
   */
  anonymizeRecord(record: any): any {
    const anonymized = { ...record };
    
    for (const field of this.config.anonymizeFields) {
      if (field in anonymized) {
        anonymized[field] = this.anonymizeValue(anonymized[field], field);
      }
    }
    
    return anonymized;
  }
  
  /**
   * Anonymize a value based on field type
   */
  private anonymizeValue(value: any, field: string): any {
    if (field === 'ipAddress') {
      return this.anonymizeIP(value);
    } else if (field === 'userId') {
      return this.hashValue(value);
    } else if (field === 'userAgent') {
      return '[ANONYMIZED]';
    } else {
      return '[REDACTED]';
    }
  }
  
  /**
   * Anonymize IP address (keep first 2 octets for IPv4, first 48 bits for IPv6)
   */
  private anonymizeIP(ip: string): string {
    if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      return `${parts.slice(0, 3).join(':')}::`;
    } else {
      // IPv4
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.0.0`;
    }
  }
  
  /**
   * Hash a value for anonymization
   */
  private hashValue(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `anon_${Math.abs(hash).toString(36)}`;
  }
  
  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simple CSV conversion - would need more sophisticated implementation
    const lines: string[] = [];
    
    // Add sessions
    if (data.sessions && data.sessions.length > 0) {
      lines.push('Sessions');
      lines.push(Object.keys(data.sessions[0]).join(','));
      for (const session of data.sessions) {
        lines.push(Object.values(session).join(','));
      }
      lines.push('');
    }
    
    // Add audit logs
    if (data.auditLogs && data.auditLogs.length > 0) {
      lines.push('Audit Logs');
      lines.push(Object.keys(data.auditLogs[0]).join(','));
      for (const log of data.auditLogs) {
        lines.push(Object.values(log).join(','));
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Store export file (placeholder - actual implementation depends on storage service)
   */
  private async storeExportFile(requestId: string, content: string, format: string): Promise<string> {
    // This would upload to S3/GCS and return a signed URL
    return `https://storage.example.com/exports/${requestId}.${format}`;
  }
  
  /**
   * Check if data should be retained (legal hold, active investigation, etc.)
   */
  async shouldRetainData(userId: string): Promise<boolean> {
    // Check for legal holds, active investigations, etc.
    // This is a placeholder
    return false;
  }
  
  /**
   * Get privacy compliance status for a user
   */
  async getPrivacyStatus(userId: string): Promise<{
    hasConsent: boolean;
    dataRetentionDays: number;
    canRequestExport: boolean;
    canRequestDeletion: boolean;
    pendingRequests: {
      exports: number;
      deletions: number;
    };
  }> {
    const hasVoiceConsent = await this.hasConsent(userId, 'voice_biometric');
    const hasDataConsent = await this.hasConsent(userId, 'data_processing');
    
    return {
      hasConsent: hasVoiceConsent && hasDataConsent,
      dataRetentionDays: this.config.retentionDays,
      canRequestExport: true,
      canRequestDeletion: true,
      pendingRequests: {
        exports: 0, // Would query actual pending requests
        deletions: 0
      }
    };
  }
}

/**
 * In-memory privacy store (for development/testing)
 */
export class InMemoryPrivacyStore implements PrivacyStore {
  private consents: Map<string, ConsentRecord[]> = new Map();
  private exportRequests: Map<string, DataExportRequest> = new Map();
  private deletionRequests: Map<string, DeletionRequest> = new Map();
  private sessions: Map<string, any[]> = new Map();
  private auditLogs: Map<string, any[]> = new Map();
  private verificationResults: Map<string, any[]> = new Map();
  
  async storeConsent(consent: ConsentRecord): Promise<void> {
    const userConsents = this.consents.get(consent.userId) || [];
    userConsents.push(consent);
    this.consents.set(consent.userId, userConsents);
  }
  
  async getConsent(userId: string, consentType: string): Promise<ConsentRecord | null> {
    const userConsents = this.consents.get(userId) || [];
    const consent = userConsents
      .filter(c => c.consentType === consentType)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    return consent || null;
  }
  
  async getAllConsents(userId: string): Promise<ConsentRecord[]> {
    return this.consents.get(userId) || [];
  }
  
  async createExportRequest(request: DataExportRequest): Promise<string> {
    const requestId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.exportRequests.set(requestId, request);
    return requestId;
  }
  
  async getExportRequest(requestId: string): Promise<DataExportRequest | null> {
    return this.exportRequests.get(requestId) || null;
  }
  
  async updateExportRequest(requestId: string, updates: Partial<DataExportRequest>): Promise<void> {
    const request = this.exportRequests.get(requestId);
    if (request) {
      this.exportRequests.set(requestId, { ...request, ...updates });
    }
  }
  
  async createDeletionRequest(request: DeletionRequest): Promise<string> {
    const requestId = `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.deletionRequests.set(requestId, request);
    return requestId;
  }
  
  async getDeletionRequest(requestId: string): Promise<DeletionRequest | null> {
    return this.deletionRequests.get(requestId) || null;
  }
  
  async updateDeletionRequest(requestId: string, updates: Partial<DeletionRequest>): Promise<void> {
    const request = this.deletionRequests.get(requestId);
    if (request) {
      this.deletionRequests.set(requestId, { ...request, ...updates });
    }
  }
  
  async getUserSessions(userId: string): Promise<any[]> {
    return this.sessions.get(userId) || [];
  }
  
  async getUserAuditLogs(userId: string): Promise<any[]> {
    return this.auditLogs.get(userId) || [];
  }
  
  async getUserVerificationResults(userId: string): Promise<any[]> {
    return this.verificationResults.get(userId) || [];
  }
}

/**
 * Consent banner configuration for client-side
 */
export interface ConsentBannerConfig {
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  requiredConsents: string[];
  optionalConsents: string[];
  policyVersion: string;
}

/**
 * Generate consent banner configuration
 */
export function getConsentBannerConfig(): ConsentBannerConfig {
  return {
    privacyPolicyUrl: '/privacy-policy',
    termsOfServiceUrl: '/terms-of-service',
    requiredConsents: ['voice_biometric', 'data_processing'],
    optionalConsents: ['data_storage'],
    policyVersion: '1.0.0'
  };
}
