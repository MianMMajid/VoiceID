/**
 * VLO Client Implementation
 * Main client class for voice liveness verification
 */

import { SessionResponse, VerificationResult } from '@vlo/shared-types';
import { AudioCaptureModule, AudioCaptureConfig } from './audio-capture';
import { AudioProcessor, ProcessedAudioInfo } from './audio-processor';
import { ApiClient, ApiClientConfig } from './api-client';
import { VLOClient } from './interfaces';

export interface VLOClientConfig {
  apiBaseUrl: string;
  userId: string;
  audioCaptureConfig?: AudioCaptureConfig;
  apiTimeout?: number;
  maxRetries?: number;
}

export enum SessionState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export class VLOClientImpl implements VLOClient {
  private apiClient: ApiClient;
  private audioCapture: AudioCaptureModule;
  private audioProcessor: AudioProcessor;
  private currentSession: SessionResponse | null = null;
  private sessionState: SessionState = SessionState.IDLE;
  private userId: string;
  private challengeAudioElement: HTMLAudioElement | null = null;

  constructor(config: VLOClientConfig) {
    this.userId = config.userId;

    // Initialize API client
    this.apiClient = new ApiClient({
      baseUrl: config.apiBaseUrl,
      timeout: config.apiTimeout,
      maxRetries: config.maxRetries
    });

    // Initialize audio capture
    this.audioCapture = new AudioCaptureModule(config.audioCaptureConfig);

    // Initialize audio processor
    this.audioProcessor = new AudioProcessor();
  }

  /**
   * Initialize verification session
   */
  async startSession(): Promise<SessionResponse> {
    try {
      this.sessionState = SessionState.INITIALIZING;

      // Check browser compatibility
      const compatibility = AudioCaptureModule.checkBrowserCompatibility();
      if (!compatibility.supported) {
        throw new Error(
          `Browser not supported. Missing: ${compatibility.missingFeatures.join(', ')}`
        );
      }

      // Initialize audio capture (request microphone permission)
      await this.audioCapture.initialize();

      // Create session on backend
      this.currentSession = await this.apiClient.createSession(this.userId);

      this.sessionState = SessionState.READY;
      return this.currentSession;
    } catch (error: any) {
      this.sessionState = SessionState.ERROR;
      throw new Error(`Failed to start session: ${error.message}`);
    }
  }

  /**
   * Play TTS challenge to user
   */
  async playChallengeAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create audio element if not exists
        if (!this.challengeAudioElement) {
          this.challengeAudioElement = new Audio();
        }

        this.challengeAudioElement.src = audioUrl;

        this.challengeAudioElement.onended = () => {
          resolve();
        };

        this.challengeAudioElement.onerror = (error) => {
          reject(new Error('Failed to play challenge audio'));
        };

        this.challengeAudioElement.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Capture user audio via WebRTC
   */
  async captureAudio(durationMs: number): Promise<Blob> {
    try {
      if (!this.audioCapture.isInitialized()) {
        throw new Error('Audio capture not initialized. Call startSession() first.');
      }

      this.sessionState = SessionState.RECORDING;

      // Start recording
      await this.audioCapture.startRecording();

      // Wait for specified duration
      await this.delay(durationMs);

      // Stop recording and get audio blob
      const audioBlob = await this.audioCapture.stopRecording();

      return audioBlob;
    } catch (error: any) {
      this.sessionState = SessionState.ERROR;
      throw new Error(`Failed to capture audio: ${error.message}`);
    }
  }

  /**
   * Submit audio for verification
   */
  async submitAudio(sessionId: string, audio: Blob): Promise<VerificationResult> {
    try {
      this.sessionState = SessionState.PROCESSING;

      // Validate audio quality
      const validation = await this.audioProcessor.validateAudioQuality(audio);
      if (!validation.valid) {
        throw new Error(`Audio quality issues: ${validation.issues.join(', ')}`);
      }

      // Process audio (trim silence, resample, compress)
      const processedAudio: ProcessedAudioInfo = await this.audioProcessor.processAudio(
        audio,
        'webm'
      );

      // Submit to backend
      const result = await this.apiClient.submitAudio(sessionId, processedAudio.blob);

      this.sessionState = SessionState.COMPLETED;
      return result;
    } catch (error: any) {
      this.sessionState = SessionState.ERROR;
      throw new Error(`Failed to submit audio: ${error.message}`);
    }
  }

  /**
   * Get real-time audio level for UI feedback
   */
  getAudioLevel(): number {
    return this.audioCapture.getAudioLevel();
  }

  /**
   * Get current session
   */
  getCurrentSession(): SessionResponse | null {
    return this.currentSession;
  }

  /**
   * Get current session state
   */
  getSessionState(): SessionState {
    return this.sessionState;
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    if (!this.currentSession) {
      return false;
    }

    const now = Date.now();
    return now < this.currentSession.expiresAt;
  }

  /**
   * Stop challenge audio playback
   */
  stopChallengeAudio(): void {
    if (this.challengeAudioElement) {
      this.challengeAudioElement.pause();
      this.challengeAudioElement.currentTime = 0;
    }
  }

  /**
   * Dispose and cleanup resources
   */
  dispose(): void {
    // Stop challenge audio
    this.stopChallengeAudio();
    this.challengeAudioElement = null;

    // Dispose audio capture
    this.audioCapture.dispose();

    // Reset state
    this.currentSession = null;
    this.sessionState = SessionState.IDLE;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Static method to check browser compatibility
   */
  static checkCompatibility() {
    return AudioCaptureModule.checkBrowserCompatibility();
  }
}
