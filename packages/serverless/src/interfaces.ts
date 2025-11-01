import {
  Session,
  VerificationResult,
  STTResult,
  SynthResult,
  SpoofResult,
  Challenge,
  ProcessedAudio,
  AudioValidation
} from '@vlo/shared-types';

/**
 * Verification Orchestrator interface
 */
export interface VerificationOrchestrator {
  /**
   * Create new verification session
   */
  createSession(userId: string): Promise<Session>;
  
  /**
   * Process submitted audio through all checks
   * Processors are injected for flexibility in testing and implementation
   */
  processAudio(
    sessionId: string,
    audioData: Buffer,
    sttTranscriber?: STTTranscriberWithChallenge,
    synthClassifier?: SynthClassifierInterface,
    spoofDetector?: SpoofDetectorInterface
  ): Promise<VerificationResult>;
  
  /**
   * Aggregate results from parallel processors
   */
  aggregateResults(
    sttResult: STTResult,
    synthResult: SynthResult,
    spoofResult: SpoofResult
  ): VerificationResult;
}

/**
 * TTS Generator interface
 */
export interface TTSGenerator {
  /**
   * Generate challenge phrase and TTS audio
   */
  generateChallenge(): Promise<Challenge>;
}

/**
 * STT Transcriber with challenge phrase
 */
export interface STTTranscriberWithChallenge {
  /**
   * Transcribe audio to text and compare with challenge
   */
  transcribe(audioData: Buffer, challengePhrase: string): Promise<STTResult>;
}

/**
 * Synth Classifier interface
 */
export interface SynthClassifierInterface {
  /**
   * Classify audio as human or synthetic
   */
  classify(audioData: Buffer): Promise<SynthResult>;
}

/**
 * Spoof Detector interface
 */
export interface SpoofDetectorInterface {
  /**
   * Detect spoofed or replayed audio
   */
  detect(audioData: Buffer): Promise<SpoofResult>;
}

/**
 * Audio Processor interface
 */
export interface AudioProcessor {
  /**
   * Process incoming audio
   */
  processAudio(sessionId: string, audioData: Buffer): Promise<ProcessedAudio>;
  
  /**
   * Store audio artifact
   */
  storeAudio(sessionId: string, audioData: Buffer): Promise<string>;
  
  /**
   * Validate audio quality
   */
  validateAudio(audioData: Buffer): AudioValidation;
}

/**
 * STT Transcriber interface
 */
export interface STTTranscriber {
  /**
   * Transcribe audio to text
   */
  transcribe(audioData: Buffer): Promise<STTResult>;
  
  /**
   * Calculate similarity between transcription and challenge
   */
  calculateSimilarity(transcription: string, challenge: string): number;
}

/**
 * Synth Classifier interface
 */
export interface SynthClassifier {
  /**
   * Classify audio as human or synthetic
   */
  classify(audioData: Buffer): Promise<SynthResult>;
}

/**
 * Spoof Detector interface
 */
export interface SpoofDetector {
  /**
   * Detect spoofed or replayed audio
   */
  detect(audioData: Buffer): Promise<SpoofResult>;
}
