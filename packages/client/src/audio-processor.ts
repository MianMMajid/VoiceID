/**
 * Audio Processing and Encoding Module
 * Handles audio format conversion, compression, and silence trimming
 */

export interface AudioProcessingConfig {
  targetSampleRate?: number;
  silenceThreshold?: number;
  minSilenceDuration?: number;
}

export interface ProcessedAudioInfo {
  blob: Blob;
  duration: number;
  sampleRate: number;
  format: string;
  originalSize: number;
  processedSize: number;
}

export class AudioProcessor {
  private config: AudioProcessingConfig;

  constructor(config: AudioProcessingConfig = {}) {
    this.config = {
      targetSampleRate: 16000,
      silenceThreshold: 0.01,
      minSilenceDuration: 0.3,
      ...config
    };
  }

  /**
   * Process audio blob: convert format, compress, and trim silence
   */
  async processAudio(audioBlob: Blob, targetFormat: 'wav' | 'webm' = 'webm'): Promise<ProcessedAudioInfo> {
    const originalSize = audioBlob.size;

    // Decode audio blob to AudioBuffer
    const audioBuffer = await this.decodeAudioBlob(audioBlob);

    // Trim silence from beginning and end
    const trimmedBuffer = this.trimSilence(audioBuffer);

    // Resample if needed
    const resampledBuffer = await this.resampleAudio(
      trimmedBuffer,
      this.config.targetSampleRate!
    );

    // Convert to target format
    const processedBlob = await this.convertToFormat(resampledBuffer, targetFormat);

    return {
      blob: processedBlob,
      duration: resampledBuffer.duration,
      sampleRate: resampledBuffer.sampleRate,
      format: targetFormat,
      originalSize,
      processedSize: processedBlob.size
    };
  }

  /**
   * Decode audio blob to AudioBuffer
   */
  private async decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (AudioContext || (window as any).webkitAudioContext)();
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      throw new Error(`Failed to decode audio: ${error}`);
    } finally {
      await audioContext.close();
    }
  }

  /**
   * Trim silence from beginning and end of audio
   */
  private trimSilence(audioBuffer: AudioBuffer): AudioBuffer {
    const channelData = audioBuffer.getChannelData(0);
    const threshold = this.config.silenceThreshold!;
    const minSilenceSamples = Math.floor(
      this.config.minSilenceDuration! * audioBuffer.sampleRate
    );

    // Find start of audio (first non-silent sample)
    let startIndex = 0;
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) > threshold) {
        startIndex = Math.max(0, i - minSilenceSamples);
        break;
      }
    }

    // Find end of audio (last non-silent sample)
    let endIndex = channelData.length;
    for (let i = channelData.length - 1; i >= 0; i--) {
      if (Math.abs(channelData[i]) > threshold) {
        endIndex = Math.min(channelData.length, i + minSilenceSamples);
        break;
      }
    }

    // If entire audio is silence, return original
    if (startIndex >= endIndex) {
      return audioBuffer;
    }

    // Create new buffer with trimmed audio
    const trimmedLength = endIndex - startIndex;
    const audioContext = new (AudioContext || (window as any).webkitAudioContext)();
    const trimmedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      trimmedLength,
      audioBuffer.sampleRate
    );

    // Copy trimmed data to new buffer
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const targetData = trimmedBuffer.getChannelData(channel);
      for (let i = 0; i < trimmedLength; i++) {
        targetData[i] = sourceData[startIndex + i];
      }
    }

    audioContext.close();
    return trimmedBuffer;
  }

  /**
   * Resample audio to target sample rate
   */
  private async resampleAudio(
    audioBuffer: AudioBuffer,
    targetSampleRate: number
  ): Promise<AudioBuffer> {
    // If already at target sample rate, return original
    if (audioBuffer.sampleRate === targetSampleRate) {
      return audioBuffer;
    }

    const audioContext = new (AudioContext || (window as any).webkitAudioContext)({
      sampleRate: targetSampleRate
    });

    try {
      // Create offline context for resampling
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        Math.ceil(audioBuffer.duration * targetSampleRate),
        targetSampleRate
      );

      // Create buffer source
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);

      // Render resampled audio
      const resampledBuffer = await offlineContext.startRendering();
      return resampledBuffer;
    } finally {
      await audioContext.close();
    }
  }

  /**
   * Convert AudioBuffer to target format (WAV or WebM)
   */
  private async convertToFormat(
    audioBuffer: AudioBuffer,
    format: 'wav' | 'webm'
  ): Promise<Blob> {
    if (format === 'wav') {
      return this.convertToWAV(audioBuffer);
    } else {
      return this.convertToWebM(audioBuffer);
    }
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private convertToWAV(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * numberOfChannels * 2;

    // Create WAV file buffer
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM format
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const offset = 44;
    const channelData: Float32Array[] = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channelData.push(audioBuffer.getChannelData(i));
    }

    let index = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        view.setInt16(offset + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        index++;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Convert AudioBuffer to WebM format using MediaRecorder
   */
  private async convertToWebM(audioBuffer: AudioBuffer): Promise<Blob> {
    // Create a MediaStream from AudioBuffer
    const audioContext = new (AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    // Record the stream
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    const chunks: Blob[] = [];

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        audioContext.close();
        resolve(blob);
      };

      mediaRecorder.onerror = (event: Event) => {
        audioContext.close();
        reject(new Error('MediaRecorder error during conversion'));
      };

      mediaRecorder.start();
      source.start(0);

      // Stop recording after audio duration
      setTimeout(() => {
        mediaRecorder.stop();
        source.stop();
      }, audioBuffer.duration * 1000 + 100);
    });
  }

  /**
   * Compress audio by reducing quality (for WebM)
   */
  async compressAudio(audioBlob: Blob, bitrate: number = 32000): Promise<Blob> {
    // For WebM, compression is handled by the codec
    // This method can be extended for additional compression strategies
    return audioBlob;
  }

  /**
   * Get audio duration from blob
   */
  async getAudioDuration(audioBlob: Blob): Promise<number> {
    const audioBuffer = await this.decodeAudioBlob(audioBlob);
    return audioBuffer.duration;
  }

  /**
   * Validate audio quality
   */
  async validateAudioQuality(audioBlob: Blob): Promise<{
    valid: boolean;
    duration: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      const audioBuffer = await this.decodeAudioBlob(audioBlob);
      const duration = audioBuffer.duration;

      // Check duration
      if (duration < 1) {
        issues.push('Audio too short (minimum 1 second)');
      }
      if (duration > 30) {
        issues.push('Audio too long (maximum 30 seconds)');
      }

      // Check sample rate
      if (audioBuffer.sampleRate < 8000) {
        issues.push('Sample rate too low (minimum 8kHz)');
      }

      // Check for clipping
      const channelData = audioBuffer.getChannelData(0);
      let clippingCount = 0;
      for (let i = 0; i < channelData.length; i++) {
        if (Math.abs(channelData[i]) >= 0.99) {
          clippingCount++;
        }
      }
      const clippingRatio = clippingCount / channelData.length;
      if (clippingRatio > 0.01) {
        issues.push('Audio has significant clipping');
      }

      // Check for silence
      let silentSamples = 0;
      for (let i = 0; i < channelData.length; i++) {
        if (Math.abs(channelData[i]) < 0.001) {
          silentSamples++;
        }
      }
      const silenceRatio = silentSamples / channelData.length;
      if (silenceRatio > 0.9) {
        issues.push('Audio is mostly silent');
      }

      return {
        valid: issues.length === 0,
        duration,
        issues
      };
    } catch (error) {
      issues.push(`Failed to decode audio: ${error}`);
      return {
        valid: false,
        duration: 0,
        issues
      };
    }
  }
}
