import { SessionResponse, VerificationResult } from '@vlo/shared-types';

/**
 * VLO Client interface for voice verification
 */
export interface VLOClient {
  /**
   * Initialize verification session
   */
  startSession(): Promise<SessionResponse>;
  
  /**
   * Play TTS challenge to user
   */
  playChallengeAudio(audioUrl: string): Promise<void>;
  
  /**
   * Capture user audio via WebRTC
   */
  captureAudio(durationMs: number): Promise<Blob>;
  
  /**
   * Submit audio for verification
   */
  submitAudio(sessionId: string, audio: Blob): Promise<VerificationResult>;
  
  /**
   * Get real-time audio level for UI feedback
   */
  getAudioLevel(): number;
}
