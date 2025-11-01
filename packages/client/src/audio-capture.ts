/**
 * WebRTC Audio Capture Module
 * Handles microphone access, audio stream management, and recording
 */

export interface AudioCaptureConfig {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface BrowserCompatibility {
  supported: boolean;
  hasGetUserMedia: boolean;
  hasMediaRecorder: boolean;
  hasAudioContext: boolean;
  missingFeatures: string[];
}

export class AudioCaptureModule {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentAudioLevel: number = 0;
  private animationFrameId: number | null = null;

  constructor(private config: AudioCaptureConfig = {}) {
    this.config = {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...config
    };
  }

  /**
   * Check browser compatibility for WebRTC audio capture
   */
  static checkBrowserCompatibility(): BrowserCompatibility {
    const missingFeatures: string[] = [];
    
    const hasGetUserMedia = !!(
      navigator.mediaDevices && 
      navigator.mediaDevices.getUserMedia
    );
    if (!hasGetUserMedia) {
      missingFeatures.push('getUserMedia');
    }

    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    if (!hasMediaRecorder) {
      missingFeatures.push('MediaRecorder');
    }

    const hasAudioContext = !!(
      typeof AudioContext !== 'undefined' || 
      typeof (window as any).webkitAudioContext !== 'undefined'
    );
    if (!hasAudioContext) {
      missingFeatures.push('AudioContext');
    }

    return {
      supported: missingFeatures.length === 0,
      hasGetUserMedia,
      hasMediaRecorder,
      hasAudioContext,
      missingFeatures
    };
  }

  /**
   * Initialize audio capture by requesting microphone access
   */
  async initialize(): Promise<void> {
    const compatibility = AudioCaptureModule.checkBrowserCompatibility();
    
    if (!compatibility.supported) {
      throw new Error(
        `Browser not supported. Missing features: ${compatibility.missingFeatures.join(', ')}`
      );
    }

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl
        },
        video: false
      });

      // Create audio context for analysis
      const AudioContextClass = AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Create analyser for audio level monitoring
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect media stream to analyser
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      // Start monitoring audio levels
      this.startAudioLevelMonitoring();

    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission denied. Please allow microphone access to continue.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Microphone is already in use by another application.');
      } else {
        throw new Error(`Failed to access microphone: ${error.message}`);
      }
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(mimeType?: string): Promise<void> {
    if (!this.mediaStream) {
      throw new Error('Audio capture not initialized. Call initialize() first.');
    }

    // Determine supported mime type
    const supportedMimeType = this.getSupportedMimeType(mimeType);
    
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: supportedMimeType
    });

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording to stop.'));
        return;
      }

      if (this.mediaRecorder.state === 'inactive') {
        reject(new Error('MediaRecorder is already inactive.'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder!.mimeType;
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.audioChunks = [];
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event: Event) => {
        reject(new Error('Recording error occurred.'));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get current audio level (0-100)
   */
  getAudioLevel(): number {
    return this.currentAudioLevel;
  }

  /**
   * Start monitoring audio levels for visual feedback
   */
  private startAudioLevelMonitoring(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Normalize to 0-100 scale
      this.currentAudioLevel = Math.min(100, (average / 255) * 100);

      this.animationFrameId = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }

  /**
   * Stop monitoring audio levels
   */
  private stopAudioLevelMonitoring(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.currentAudioLevel = 0;
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(preferredType?: string): string {
    const types = [
      preferredType,
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ].filter(Boolean) as string[];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Fallback to default
    return '';
  }

  /**
   * Release all resources and stop audio capture
   */
  dispose(): void {
    // Stop audio level monitoring
    this.stopAudioLevelMonitoring();

    // Stop media recorder if active
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;

    // Stop all media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.audioChunks = [];
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.mediaStream !== null && this.audioContext !== null;
  }
}
