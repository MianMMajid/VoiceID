import { describe, it, expect, beforeEach } from 'vitest';
import { VoiceLivenessOrchestrator } from '../verification-orchestrator';
import { InMemorySessionStorage } from '../session-storage';
import { InMemoryAuditLogger } from '../audit-logger';
import { TTSGenerator } from '../interfaces';
import {
  SessionStatus,
  FailureReason,
  STTResult,
  SynthResult,
  SpoofResult
} from '@vlo/shared-types';

// Mock TTS Generator
class MockTTSGenerator implements TTSGenerator {
  async generateChallenge() {
    return {
      text: 'The quick brown fox jumps over the lazy dog',
      audioUrl: 'https://example.com/challenge.mp3',
      audioData: Buffer.from('mock-audio-data')
    };
  }
}

// Mock processors for testing
class MockSTTTranscriber {
  constructor(private mockResult: STTResult) {}
  
  async transcribe(_audioData: Buffer, _challengePhrase: string): Promise<STTResult> {
    return this.mockResult;
  }
}

class MockSynthClassifier {
  constructor(private mockResult: SynthResult) {}
  
  async classify(_audioData: Buffer): Promise<SynthResult> {
    return this.mockResult;
  }
}

class MockSpoofDetector {
  constructor(private mockResult: SpoofResult) {}
  
  async detect(_audioData: Buffer): Promise<SpoofResult> {
    return this.mockResult;
  }
}

describe('VoiceLivenessOrchestrator', () => {
  let orchestrator: VoiceLivenessOrchestrator;
  let sessionStorage: InMemorySessionStorage;
  let auditLogger: InMemoryAuditLogger;
  let ttsGenerator: MockTTSGenerator;
  
  beforeEach(() => {
    sessionStorage = new InMemorySessionStorage();
    auditLogger = new InMemoryAuditLogger();
    ttsGenerator = new MockTTSGenerator();
    orchestrator = new VoiceLivenessOrchestrator(
      sessionStorage,
      auditLogger,
      ttsGenerator
    );
  });
  
  describe('createSession', () => {
    it('should create a new session with unique ID', async () => {
      const session = await orchestrator.createSession('user123');
      
      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.status).toBe(SessionStatus.PENDING);
      expect(session.challengePhrase).toBe('The quick brown fox jumps over the lazy dog');
      expect(session.challengeAudioUrl).toBe('https://example.com/challenge.mp3');
    });
    
    it('should set session expiration to 5 minutes', async () => {
      const beforeCreate = Date.now();
      const session = await orchestrator.createSession('user123');
      const afterCreate = Date.now();
      
      const expectedExpiry = beforeCreate + (5 * 60 * 1000);
      expect(session.expiresAt).toBeGreaterThanOrEqual(expectedExpiry);
      expect(session.expiresAt).toBeLessThanOrEqual(afterCreate + (5 * 60 * 1000));
    });
    
    it('should store session in storage', async () => {
      const session = await orchestrator.createSession('user123');
      const retrieved = await sessionStorage.getSession(session.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });
    
    it('should log session creation event', async () => {
      const session = await orchestrator.createSession('user123');
      const logs = await auditLogger.getSessionLogs(session.id);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].event).toBe('session_created');
    });
  });
  
  describe('processAudio - successful verification', () => {
    it('should pass when all checks meet thresholds', async () => {
      const session = await orchestrator.createSession('user123');
      
      const sttTranscriber = new MockSTTTranscriber({
        transcription: 'The quick brown fox jumps over the lazy dog',
        confidence: 0.95,
        similarity: 0.98,
        matched: true
      });
      
      const synthClassifier = new MockSynthClassifier({
        probability: 0.01,
        isSynthetic: false,
        modelVersion: 'v1.0'
      });
      
      const spoofDetector = new MockSpoofDetector({
        score: 0.95,
        eer: 0.005,
        isSpoofed: false,
        modelVersion: 'v1.0'
      });
      
      const audioData = Buffer.from('test-audio');
      const result = await orchestrator.processAudio(
        session.id,
        audioData,
        sttTranscriber,
        synthClassifier,
        spoofDetector
      );
      
      expect(result.success).toBe(true);
      expect(result.livenessScore).toBeGreaterThan(70);
      expect(result.reason).toBeUndefined();
      expect(result.checks.stt.similarity).toBe(0.98);
      expect(result.checks.synth.probability).toBe(0.01);
      expect(result.checks.spoof.eer).toBe(0.005);
    });
    
    it('should update session status to completed', async () => {
      const session = await orchestrator.createSession('user123');
      
      const sttTranscriber = new MockSTTTranscriber({
        transcription: 'The quick brown fox',
        confidence: 0.9,
        similarity: 0.9,
        matched: true
      });
      
      const synthClassifier = new MockSynthClassifier({
        probability: 0.02,
        isSynthetic: false,
        modelVersion: 'v1.0'
      });
      
      const spoofDetector = new MockSpoofDetector({
        score: 0.9,
        eer: 0.008,
        isSpoofed: false,
        modelVersion: 'v1.0'
      });
      
      await orchestrator.processAudio(
        session.id,
        Buffer.from('test-audio'),
        sttTranscriber,
        synthClassifier,
        spoofDetector
      );
      
      const updatedSession = await sessionStorage.getSession(session.id);
      expect(updatedSession?.status).toBe(SessionStatus.COMPLETED);
    });
  });
  
  describe('processAudio - failed verification', () => {
    it('should fail when STT similarity below threshold', async () => {
      const session = await orchestrator.createSession('user123');
      
      const sttTranscriber = new MockSTTTranscriber({
        transcription: 'Wrong phrase',
        confidence: 0.8,
        similarity: 0.5,
        matched: false
      });
      
      const synthClassifier = new MockSynthClassifier({
        probability: 0.01,
        isSynthetic: false,
        modelVersion: 'v1.0'
      });
      
      const spoofDetector = new MockSpoofDetector({
        score: 0.95,
        eer: 0.005,
        isSpoofed: false,
        modelVersion: 'v1.0'
      });
      
      const result = await orchestrator.processAudio(
        session.id,
        Buffer.from('test-audio'),
        sttTranscriber,
        synthClassifier,
        spoofDetector
      );
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe(FailureReason.PHRASE_MISMATCH);
    });
    
    it('should fail when synthetic voice detected', async () => {
      const session = await orchestrator.createSession('user123');
      
      const sttTranscriber = new MockSTTTranscriber({
        transcription: 'The quick brown fox',
        confidence: 0.9,
        similarity: 0.9,
        matched: true
      });
      
      const synthClassifier = new MockSynthClassifier({
        probability: 0.8,
        isSynthetic: true,
        modelVersion: 'v1.0'
      });
      
      const spoofDetector = new MockSpoofDetector({
        score: 0.95,
        eer: 0.005,
        isSpoofed: false,
        modelVersion: 'v1.0'
      });
      
      const result = await orchestrator.processAudio(
        session.id,
        Buffer.from('test-audio'),
        sttTranscriber,
        synthClassifier,
        spoofDetector
      );
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe(FailureReason.SYNTHETIC_VOICE);
    });
    
    it('should fail when spoof detected', async () => {
      const session = await orchestrator.createSession('user123');
      
      const sttTranscriber = new MockSTTTranscriber({
        transcription: 'The quick brown fox',
        confidence: 0.9,
        similarity: 0.9,
        matched: true
      });
      
      const synthClassifier = new MockSynthClassifier({
        probability: 0.01,
        isSynthetic: false,
        modelVersion: 'v1.0'
      });
      
      const spoofDetector = new MockSpoofDetector({
        score: 0.2,
        eer: 0.05,
        isSpoofed: true,
        modelVersion: 'v1.0'
      });
      
      const result = await orchestrator.processAudio(
        session.id,
        Buffer.from('test-audio'),
        sttTranscriber,
        synthClassifier,
        spoofDetector
      );
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe(FailureReason.SPOOF_DETECTED);
    });
    
    it('should increment fraud counter on synthetic detection', async () => {
      const session = await orchestrator.createSession('user123');
      
      const sttTranscriber = new MockSTTTranscriber({
        transcription: 'Test',
        confidence: 0.9,
        similarity: 0.9,
        matched: true
      });
      
      const synthClassifier = new MockSynthClassifier({
        probability: 0.9,
        isSynthetic: true,
        modelVersion: 'v1.0'
      });
      
      const spoofDetector = new MockSpoofDetector({
        score: 0.95,
        eer: 0.005,
        isSpoofed: false,
        modelVersion: 'v1.0'
      });
      
      await orchestrator.processAudio(
        session.id,
        Buffer.from('test-audio'),
        sttTranscriber,
        synthClassifier,
        spoofDetector
      );
      
      const fraudCount = await auditLogger.getFraudCount('user123');
      expect(fraudCount).toBe(1);
    });
  });
  
  describe('processAudio - parallel execution', () => {
    it('should execute all checks in parallel', async () => {
      const session = await orchestrator.createSession('user123');
      
      let sttStartTime = 0;
      let synthStartTime = 0;
      let spoofStartTime = 0;
      
      class TimedSTTTranscriber {
        async transcribe(): Promise<STTResult> {
          sttStartTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            transcription: 'Test',
            confidence: 0.9,
            similarity: 0.9,
            matched: true
          };
        }
      }
      
      class TimedSynthClassifier {
        async classify(): Promise<SynthResult> {
          synthStartTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            probability: 0.01,
            isSynthetic: false,
            modelVersion: 'v1.0'
          };
        }
      }
      
      class TimedSpoofDetector {
        async detect(): Promise<SpoofResult> {
          spoofStartTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            score: 0.95,
            eer: 0.005,
            isSpoofed: false,
            modelVersion: 'v1.0'
          };
        }
      }
      
      const startTime = Date.now();
      await orchestrator.processAudio(
        session.id,
        Buffer.from('test-audio'),
        new TimedSTTTranscriber(),
        new TimedSynthClassifier(),
        new TimedSpoofDetector()
      );
      const endTime = Date.now();
      
      // All should start around the same time (within 50ms)
      const maxStartDiff = Math.max(
        Math.abs(sttStartTime - synthStartTime),
        Math.abs(synthStartTime - spoofStartTime),
        Math.abs(sttStartTime - spoofStartTime)
      );
      expect(maxStartDiff).toBeLessThan(50);
      
      // Total time should be ~100ms (parallel) not ~300ms (sequential)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(200);
    });
  });
  
  describe('processAudio - timeout handling', () => {
    it('should timeout after 10 seconds', async () => {
      const session = await orchestrator.createSession('user123');
      
      class SlowSTTTranscriber {
        async transcribe(): Promise<STTResult> {
          await new Promise(resolve => setTimeout(resolve, 15000));
          return {
            transcription: 'Test',
            confidence: 0.9,
            similarity: 0.9,
            matched: true
          };
        }
      }
      
      const synthClassifier = new MockSynthClassifier({
        probability: 0.01,
        isSynthetic: false,
        modelVersion: 'v1.0'
      });
      
      const spoofDetector = new MockSpoofDetector({
        score: 0.95,
        eer: 0.005,
        isSpoofed: false,
        modelVersion: 'v1.0'
      });
      
      const result = await orchestrator.processAudio(
        session.id,
        Buffer.from('test-audio'),
        new SlowSTTTranscriber(),
        synthClassifier,
        spoofDetector
      );
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe(FailureReason.TIMEOUT);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(10000);
    }, 15000); // Set test timeout to 15 seconds
  });
  
  describe('aggregateResults', () => {
    it('should calculate correct liveness score', () => {
      const sttResult: STTResult = {
        transcription: 'Test',
        confidence: 0.9,
        similarity: 1.0,
        matched: true
      };
      
      const synthResult: SynthResult = {
        probability: 0.0,
        isSynthetic: false,
        modelVersion: 'v1.0'
      };
      
      const spoofResult: SpoofResult = {
        score: 1.0,
        eer: 0.0,
        isSpoofed: false,
        modelVersion: 'v1.0'
      };
      
      const result = orchestrator.aggregateResults(
        sttResult,
        synthResult,
        spoofResult
      );
      
      expect(result.livenessScore).toBe(100);
      expect(result.success).toBe(true);
    });
    
    it('should prioritize synthetic detection in failure reason', () => {
      const sttResult: STTResult = {
        transcription: 'Wrong',
        confidence: 0.5,
        similarity: 0.5,
        matched: false
      };
      
      const synthResult: SynthResult = {
        probability: 0.9,
        isSynthetic: true,
        modelVersion: 'v1.0'
      };
      
      const spoofResult: SpoofResult = {
        score: 0.2,
        eer: 0.05,
        isSpoofed: true,
        modelVersion: 'v1.0'
      };
      
      const result = orchestrator.aggregateResults(
        sttResult,
        synthResult,
        spoofResult
      );
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe(FailureReason.SYNTHETIC_VOICE);
    });
  });
  
  describe('session expiration', () => {
    it('should not process expired session', async () => {
      // Create session with very short TTL
      const shortTTLOrchestrator = new VoiceLivenessOrchestrator(
        sessionStorage,
        auditLogger,
        ttsGenerator,
        { sessionTTLMinutes: 0.001 } // ~60ms
      );
      
      const session = await shortTTLOrchestrator.createSession('user123');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const sttTranscriber = new MockSTTTranscriber({
        transcription: 'Test',
        confidence: 0.9,
        similarity: 0.9,
        matched: true
      });
      
      const synthClassifier = new MockSynthClassifier({
        probability: 0.01,
        isSynthetic: false,
        modelVersion: 'v1.0'
      });
      
      const spoofDetector = new MockSpoofDetector({
        score: 0.95,
        eer: 0.005,
        isSpoofed: false,
        modelVersion: 'v1.0'
      });
      
      await expect(
        shortTTLOrchestrator.processAudio(
          session.id,
          Buffer.from('test-audio'),
          sttTranscriber,
          synthClassifier,
          spoofDetector
        )
      ).rejects.toThrow('Session expired');
    });
  });
});
