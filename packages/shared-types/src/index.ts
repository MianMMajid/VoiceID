// Core data models and types for VoiceLiveness Onboarder

/**
 * Session status enumeration
 */
export enum SessionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

/**
 * Failure reason enumeration
 */
export enum FailureReason {
  SYNTHETIC_VOICE = 'synthetic_voice',
  SPOOF_DETECTED = 'spoof_detected',
  PHRASE_MISMATCH = 'phrase_mismatch',
  POOR_AUDIO = 'poor_audio',
  TIMEOUT = 'timeout'
}

/**
 * Audit event enumeration
 */
export enum AuditEvent {
  SESSION_CREATED = 'session_created',
  AUDIO_SUBMITTED = 'audio_submitted',
  VERIFICATION_COMPLETED = 'verification_completed',
  FRAUD_DETECTED = 'fraud_detected'
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  ipAddress: string;
  userAgent: string;
  consentTimestamp: number;
}

/**
 * STT (Speech-to-Text) result
 */
export interface STTResult {
  transcription: string;
  confidence: number;
  similarity: number;
  matched: boolean;
}

/**
 * Synthetic voice classification result
 */
export interface SynthResult {
  probability: number;
  isSynthetic: boolean;
  modelVersion: string;
}

/**
 * Spoof detection result
 */
export interface SpoofResult {
  score: number;
  eer: number;
  isSpoofed: boolean;
  modelVersion: string;
}

/**
 * Verification checks container
 */
export interface VerificationChecks {
  stt: STTResult;
  synth: SynthResult;
  spoof: SpoofResult;
}

/**
 * Verification result
 */
export interface VerificationResult {
  sessionId: string;
  success: boolean;
  livenessScore: number;
  timestamp: number;
  checks: VerificationChecks;
  reason?: FailureReason;
  processingTimeMs: number;
}

/**
 * Session model
 */
export interface Session {
  id: string;
  userId: string;
  challengePhrase: string;
  challengeAudioUrl: string;
  status: SessionStatus;
  createdAt: number;
  expiresAt: number;
  audioUrl?: string;
  result?: VerificationResult;
  metadata: SessionMetadata;
}

/**
 * Audit log retention information
 */
export interface AuditLogRetention {
  expiresAt: number;
  archived: boolean;
}

/**
 * Audit log metadata
 */
export interface AuditLogMetadata {
  ipAddress: string;
  userAgent: string;
  region: string;
}

/**
 * Audit log model
 */
export interface AuditLog {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: number;
  event: AuditEvent;
  result: VerificationResult;
  metadata: AuditLogMetadata;
  retention: AuditLogRetention;
}

/**
 * Session response for client
 */
export interface SessionResponse {
  sessionId: string;
  challengeText: string;
  challengeAudioUrl: string;
  expiresAt: number;
}

/**
 * Challenge model
 */
export interface Challenge {
  text: string;
  audioUrl: string;
  audioData: Buffer;
}

/**
 * Processed audio information
 */
export interface ProcessedAudio {
  sessionId: string;
  audioUrl: string;
  duration: number;
  sampleRate: number;
  format: string;
}

/**
 * Audio validation result
 */
export interface AudioValidation {
  valid: boolean;
  duration: number;
  sampleRate: number;
  hasClipping: boolean;
  snr: number;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
}

/**
 * Error codes
 */
export const ErrorCodes = {
  INVALID_AUDIO: 'invalid_audio',
  SESSION_EXPIRED: 'session_expired',
  EXTERNAL_API_ERROR: 'external_api_error',
  MODEL_TIMEOUT: 'model_timeout',
  RATE_LIMIT: 'rate_limit_exceeded'
} as const;
