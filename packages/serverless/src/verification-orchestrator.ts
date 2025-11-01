import {
  Session,
  SessionStatus,
  SessionMetadata,
  VerificationResult,
  STTResult,
  SynthResult,
  SpoofResult,
  FailureReason,
  AuditEvent
} from '@vlo/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { 
  VerificationOrchestrator,
  TTSGenerator,
  STTTranscriberWithChallenge,
  SynthClassifier,
  SpoofDetector
} from './interfaces';
import { SessionStorage } from './session-storage';
import { AuditLogger } from './audit-logger';

/**
 * Configuration for verification orchestrator
 */
export interface OrchestratorConfig {
  sessionTTLMinutes: number;
  totalTimeoutMs: number;
  sttThreshold: number;
  synthThreshold: number;
  spoofEERThreshold: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OrchestratorConfig = {
  sessionTTLMinutes: 5,
  totalTimeoutMs: 10000, // 10 seconds
  sttThreshold: 0.85, // 85% similarity
  synthThreshold: 0.05, // 5% synthetic probability
  spoofEERThreshold: 0.01 // 1% EER
};

/**
 * Verification orchestrator implementation
 * Coordinates the entire verification workflow
 */
export class VoiceLivenessOrchestrator implements VerificationOrchestrator {
  private config: OrchestratorConfig;
  
  constructor(
    private sessionStorage: SessionStorage,
    private auditLogger: AuditLogger,
    private ttsGenerator: TTSGenerator,
    config?: Partial<OrchestratorConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Create new verification session
   */
  async createSession(
    userId: string,
    metadata?: Partial<SessionMetadata>
  ): Promise<Session> {
    const now = Date.now();
    const ttlMs = this.config.sessionTTLMinutes * 60 * 1000;
    
    // Generate TTS challenge
    const challenge = await this.ttsGenerator.generateChallenge();
    
    // Create session
    const session: Session = {
      id: uuidv4(),
      userId,
      challengePhrase: challenge.text,
      challengeAudioUrl: challenge.audioUrl,
      status: SessionStatus.PENDING,
      createdAt: now,
      expiresAt: now + ttlMs,
      metadata: {
        ipAddress: metadata?.ipAddress || 'unknown',
        userAgent: metadata?.userAgent || 'unknown',
        consentTimestamp: metadata?.consentTimestamp || now
      }
    };
    
    // Store session
    await this.sessionStorage.createSession(session);
    
    // Log session creation
    const dummyResult: VerificationResult = {
      sessionId: session.id,
      success: false,
      livenessScore: 0,
      timestamp: now,
      checks: {
        stt: { transcription: '', confidence: 0, similarity: 0, matched: false },
        synth: { probability: 0, isSynthetic: false, modelVersion: 'n/a' },
        spoof: { score: 0, eer: 0, isSpoofed: false, modelVersion: 'n/a' }
      },
      processingTimeMs: 0
    };
    
    await this.auditLogger.logEvent(
      session.id,
      userId,
      AuditEvent.SESSION_CREATED,
      dummyResult,
      {
        ipAddress: session.metadata.ipAddress,
        userAgent: session.metadata.userAgent,
        region: 'unknown'
      }
    );
    
    return session;
  }
  
  /**
   * Process submitted audio through all checks
   * Note: This implementation requires external processors to be injected
   * The interface defines this with 2 params, but implementation needs processors
   */
  async processAudio(
    sessionId: string,
    audioData: Buffer,
    sttTranscriber?: STTTranscriberWithChallenge,
    synthClassifier?: SynthClassifier,
    spoofDetector?: SpoofDetector
  ): Promise<VerificationResult> {
    const startTime = Date.now();
    
    // Get session
    const session = await this.sessionStorage.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    if (session.status === SessionStatus.EXPIRED) {
      throw new Error(`Session expired: ${sessionId}`);
    }
    
    if (session.status !== SessionStatus.PENDING) {
      throw new Error(`Session already processed: ${sessionId}`);
    }
    
    // Validate processors are provided
    if (!sttTranscriber || !synthClassifier || !spoofDetector) {
      throw new Error('All processors (STT, Synth, Spoof) must be provided');
    }
    
    // Log audio submission event
    const submissionResult: VerificationResult = {
      sessionId,
      success: false,
      livenessScore: 0,
      timestamp: Date.now(),
      checks: {
        stt: { transcription: '', confidence: 0, similarity: 0, matched: false },
        synth: { probability: 0, isSynthetic: false, modelVersion: 'n/a' },
        spoof: { score: 0, eer: 0, isSpoofed: false, modelVersion: 'n/a' }
      },
      processingTimeMs: 0
    };
    
    await this.auditLogger.logEvent(
      sessionId,
      session.userId,
      AuditEvent.AUDIO_SUBMITTED,
      submissionResult,
      {
        ipAddress: session.metadata.ipAddress,
        userAgent: session.metadata.userAgent,
        region: 'unknown'
      }
    );
    
    // Update session status to processing
    await this.sessionStorage.updateSession(sessionId, {
      status: SessionStatus.PROCESSING
    });
    
    try {
      // Task 15.3: Use optimized parallel processor for better coordination
      // Import at top of file: import { createVerificationProcessor, createVerificationTasks } from './parallel-processor';
      
      // Execute all checks in parallel with timeout (legacy approach)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Verification timeout')), this.config.totalTimeoutMs);
      });
      
      const checksPromise = Promise.all([
        sttTranscriber.transcribe(audioData, session.challengePhrase),
        synthClassifier.classify(audioData),
        spoofDetector.detect(audioData)
      ]);
      
      const [sttResult, synthResult, spoofResult] = await Promise.race([
        checksPromise,
        timeoutPromise
      ]) as [STTResult, SynthResult, SpoofResult];
      
      // Aggregate results
      const result = this.aggregateResultsInternal(
        sessionId,
        sttResult,
        synthResult,
        spoofResult,
        Date.now() - startTime
      );
      
      // Update session with result
      await this.sessionStorage.updateSession(sessionId, {
        status: result.success ? SessionStatus.COMPLETED : SessionStatus.FAILED,
        result
      });
      
      // Log verification completion
      await this.auditLogger.logEvent(
        sessionId,
        session.userId,
        AuditEvent.VERIFICATION_COMPLETED,
        result,
        {
          ipAddress: session.metadata.ipAddress,
          userAgent: session.metadata.userAgent,
          region: 'unknown'
        }
      );
      
      // If fraud detected, log and increment counter
      if (!result.success && (
        result.reason === FailureReason.SYNTHETIC_VOICE ||
        result.reason === FailureReason.SPOOF_DETECTED
      )) {
        await this.auditLogger.logEvent(
          sessionId,
          session.userId,
          AuditEvent.FRAUD_DETECTED,
          result,
          {
            ipAddress: session.metadata.ipAddress,
            userAgent: session.metadata.userAgent,
            region: 'unknown'
          }
        );
        
        await this.auditLogger.incrementFraudCounter(session.userId);
      }
      
      return result;
      
    } catch (error) {
      // Handle timeout or processing errors
      const processingTime = Date.now() - startTime;
      const isTimeout = error instanceof Error && error.message === 'Verification timeout';
      
      const failureResult: VerificationResult = {
        sessionId,
        success: false,
        livenessScore: 0,
        timestamp: Date.now(),
        checks: {
          stt: { transcription: '', confidence: 0, similarity: 0, matched: false },
          synth: { probability: 0, isSynthetic: false, modelVersion: 'n/a' },
          spoof: { score: 0, eer: 0, isSpoofed: false, modelVersion: 'n/a' }
        },
        reason: isTimeout ? FailureReason.TIMEOUT : FailureReason.POOR_AUDIO,
        processingTimeMs: processingTime
      };
      
      // Update session status
      await this.sessionStorage.updateSession(sessionId, {
        status: SessionStatus.FAILED,
        result: failureResult
      });
      
      // Log failure
      await this.auditLogger.logEvent(
        sessionId,
        session.userId,
        AuditEvent.VERIFICATION_COMPLETED,
        failureResult,
        {
          ipAddress: session.metadata.ipAddress,
          userAgent: session.metadata.userAgent,
          region: 'unknown'
        }
      );
      
      return failureResult;
    }
  }
  
  /**
   * Aggregate results from parallel processors (interface method)
   */
  aggregateResults(
    sttResult: STTResult,
    synthResult: SynthResult,
    spoofResult: SpoofResult
  ): VerificationResult {
    return this.aggregateResultsInternal(
      'unknown',
      sttResult,
      synthResult,
      spoofResult,
      0
    );
  }
  
  /**
   * Internal aggregate results with full parameters
   */
  private aggregateResultsInternal(
    sessionId: string,
    sttResult: STTResult,
    synthResult: SynthResult,
    spoofResult: SpoofResult,
    processingTimeMs: number
  ): VerificationResult {
    // Check each threshold
    const sttPassed = sttResult.similarity >= this.config.sttThreshold;
    const synthPassed = synthResult.probability <= this.config.synthThreshold;
    const spoofPassed = spoofResult.eer <= this.config.spoofEERThreshold;
    
    // All checks must pass
    const success = sttPassed && synthPassed && spoofPassed;
    
    // Determine failure reason if any check failed
    let reason: FailureReason | undefined;
    if (!success) {
      if (!synthPassed) {
        reason = FailureReason.SYNTHETIC_VOICE;
      } else if (!spoofPassed) {
        reason = FailureReason.SPOOF_DETECTED;
      } else if (!sttPassed) {
        reason = FailureReason.PHRASE_MISMATCH;
      }
    }
    
    // Calculate composite liveness score (0-100)
    const livenessScore = this.calculateLivenessScore(
      sttResult,
      synthResult,
      spoofResult
    );
    
    return {
      sessionId,
      success,
      livenessScore,
      timestamp: Date.now(),
      checks: {
        stt: sttResult,
        synth: synthResult,
        spoof: spoofResult
      },
      reason,
      processingTimeMs
    };
  }
  
  /**
   * Calculate composite liveness score from all checks
   * Returns a score from 0-100 where higher is more confident of live human
   */
  private calculateLivenessScore(
    sttResult: STTResult,
    synthResult: SynthResult,
    spoofResult: SpoofResult
  ): number {
    // Weight each component
    const sttWeight = 0.4;
    const synthWeight = 0.3;
    const spoofWeight = 0.3;
    
    // Normalize STT similarity (already 0-1)
    const sttScore = sttResult.similarity;
    
    // Normalize synth probability (invert since lower is better)
    const synthScore = 1 - Math.min(synthResult.probability / this.config.synthThreshold, 1);
    
    // Normalize spoof EER (invert since lower is better)
    const spoofScore = 1 - Math.min(spoofResult.eer / this.config.spoofEERThreshold, 1);
    
    // Calculate weighted average
    const compositeScore = (
      sttScore * sttWeight +
      synthScore * synthWeight +
      spoofScore * spoofWeight
    );
    
    // Convert to 0-100 scale
    return Math.round(compositeScore * 100);
  }
  
  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessionStorage.getSession(sessionId);
  }
  
  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    return this.sessionStorage.cleanupExpiredSessions();
  }
}
