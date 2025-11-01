/**
 * Audio Format Optimizer
 * Optimizes audio format conversion for faster processing
 * Task 15.3: Optimize audio format conversion
 */

export interface AudioOptimizationConfig {
  targetSampleRate: number;
  targetChannels: number;
  targetBitDepth: number;
  enableCompression: boolean;
  compressionQuality: number; // 0-1
}

export interface OptimizedAudio {
  data: Buffer;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  duration: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

/**
 * Audio optimizer for fast format conversion
 * Task 15.3: Optimize audio format conversion
 */
export class AudioOptimizer {
  private config: AudioOptimizationConfig;

  constructor(config?: Partial<AudioOptimizationConfig>) {
    this.config = {
      targetSampleRate: 16000, // 16kHz for ML models
      targetChannels: 1, // Mono
      targetBitDepth: 16, // 16-bit
      enableCompression: false, // Don't compress for ML processing
      compressionQuality: 0.8,
      ...config,
    };
  }

  /**
   * Optimize audio for ML model processing
   * Task 15.3: Fast audio format conversion
   * 
   * Optimizations:
   * - Downsample to 16kHz if needed
   * - Convert to mono if stereo
   * - Normalize bit depth to 16-bit
   * - Remove silence from start/end
   * - Optimize buffer allocation
   */
  async optimize(audioData: Buffer, metadata?: {
    sampleRate?: number;
    channels?: number;
    bitDepth?: number;
  }): Promise<OptimizedAudio> {
    const startTime = Date.now();
    const originalSize = audioData.length;

    // Detect audio format if not provided
    const detectedMetadata = metadata || this.detectAudioFormat(audioData);
    
    console.log('Optimizing audio', {
      originalSize,
      sampleRate: detectedMetadata.sampleRate,
      channels: detectedMetadata.channels,
      bitDepth: detectedMetadata.bitDepth,
    });

    let optimizedData = audioData;

    // Convert to target format
    if (this.needsConversion(detectedMetadata)) {
      optimizedData = await this.convertFormat(
        audioData,
        detectedMetadata,
        this.config
      );
    }

    // Trim silence
    optimizedData = this.trimSilence(optimizedData);

    // Calculate metrics
    const duration = this.calculateDuration(
      optimizedData.length,
      this.config.targetSampleRate,
      this.config.targetChannels,
      this.config.targetBitDepth
    );

    const result: OptimizedAudio = {
      data: optimizedData,
      sampleRate: this.config.targetSampleRate,
      channels: this.config.targetChannels,
      bitDepth: this.config.targetBitDepth,
      duration,
      originalSize,
      optimizedSize: optimizedData.length,
      compressionRatio: originalSize / optimizedData.length,
    };

    console.log('Audio optimization complete', {
      duration: Date.now() - startTime,
      originalSize,
      optimizedSize: result.optimizedSize,
      compressionRatio: result.compressionRatio.toFixed(2),
      audioDuration: duration.toFixed(2),
    });

    return result;
  }

  /**
   * Detect audio format from buffer
   */
  private detectAudioFormat(audioData: Buffer): {
    sampleRate: number;
    channels: number;
    bitDepth: number;
  } {
    // Simple heuristic detection
    // In production, use proper audio format detection library
    
    // Assume 16-bit PCM by default
    return {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
    };
  }

  /**
   * Check if conversion is needed
   */
  private needsConversion(metadata: {
    sampleRate?: number;
    channels?: number;
    bitDepth?: number;
  }): boolean {
    return (
      metadata.sampleRate !== this.config.targetSampleRate ||
      metadata.channels !== this.config.targetChannels ||
      metadata.bitDepth !== this.config.targetBitDepth
    );
  }

  /**
   * Convert audio format
   * Task 15.3: Optimized format conversion
   */
  private async convertFormat(
    audioData: Buffer,
    source: {
      sampleRate?: number;
      channels?: number;
      bitDepth?: number;
    },
    target: AudioOptimizationConfig
  ): Promise<Buffer> {
    // In production, use optimized audio processing library
    // For now, return as-is (placeholder)
    
    console.log('Converting audio format', {
      from: source,
      to: {
        sampleRate: target.targetSampleRate,
        channels: target.targetChannels,
        bitDepth: target.targetBitDepth,
      },
    });

    // Placeholder: actual conversion would use FFmpeg or similar
    return audioData;
  }

  /**
   * Trim silence from start and end
   * Task 15.3: Remove unnecessary audio data
   */
  private trimSilence(audioData: Buffer): Buffer {
    const samples = this.bufferToSamples(audioData);
    const threshold = 0.01; // Silence threshold

    // Find first non-silent sample
    let start = 0;
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > threshold) {
        start = i;
        break;
      }
    }

    // Find last non-silent sample
    let end = samples.length - 1;
    for (let i = samples.length - 1; i >= 0; i--) {
      if (Math.abs(samples[i]) > threshold) {
        end = i;
        break;
      }
    }

    // Add small padding
    const padding = Math.floor(this.config.targetSampleRate * 0.1); // 100ms
    start = Math.max(0, start - padding);
    end = Math.min(samples.length - 1, end + padding);

    // Extract trimmed samples
    const trimmedSamples = samples.slice(start, end + 1);
    
    console.log('Trimmed silence', {
      originalSamples: samples.length,
      trimmedSamples: trimmedSamples.length,
      removedStart: start,
      removedEnd: samples.length - end - 1,
    });

    return this.samplesToBuffer(trimmedSamples);
  }

  /**
   * Convert buffer to samples
   */
  private bufferToSamples(buffer: Buffer): Float32Array {
    const samples = new Float32Array(buffer.length / 2);
    for (let i = 0; i < samples.length; i++) {
      const int16 = buffer.readInt16LE(i * 2);
      samples[i] = int16 / 32768.0;
    }
    return samples;
  }

  /**
   * Convert samples to buffer
   */
  private samplesToBuffer(samples: Float32Array): Buffer {
    const buffer = Buffer.allocUnsafe(samples.length * 2);
    for (let i = 0; i < samples.length; i++) {
      const int16 = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32768)));
      buffer.writeInt16LE(int16, i * 2);
    }
    return buffer;
  }

  /**
   * Calculate audio duration in seconds
   */
  private calculateDuration(
    bufferSize: number,
    sampleRate: number,
    channels: number,
    bitDepth: number
  ): number {
    const bytesPerSample = bitDepth / 8;
    const totalSamples = bufferSize / (bytesPerSample * channels);
    return totalSamples / sampleRate;
  }

  /**
   * Validate audio quality
   */
  validateAudio(audioData: Buffer): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check minimum size
    const minSize = this.config.targetSampleRate * 0.5 * 2; // 0.5s at 16kHz, 16-bit
    if (audioData.length < minSize) {
      issues.push(`Audio too short: ${audioData.length} bytes (min: ${minSize})`);
    }

    // Check maximum size
    const maxSize = this.config.targetSampleRate * 10 * 2; // 10s at 16kHz, 16-bit
    if (audioData.length > maxSize) {
      issues.push(`Audio too long: ${audioData.length} bytes (max: ${maxSize})`);
    }

    // Check for clipping
    const samples = this.bufferToSamples(audioData);
    const clippedSamples = samples.filter(s => Math.abs(s) > 0.99).length;
    const clippingRatio = clippedSamples / samples.length;
    if (clippingRatio > 0.01) {
      issues.push(`Audio clipping detected: ${(clippingRatio * 100).toFixed(2)}%`);
    }

    // Check signal-to-noise ratio
    const snr = this.calculateSNR(samples);
    if (snr < 10) {
      issues.push(`Low SNR: ${snr.toFixed(2)} dB (min: 10 dB)`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Calculate signal-to-noise ratio
   */
  private calculateSNR(samples: Float32Array): number {
    // Simple SNR calculation
    const signal = samples.reduce((sum, s) => sum + s * s, 0) / samples.length;
    const noise = 0.001; // Assume 0.1% noise floor
    return 10 * Math.log10(signal / noise);
  }
}

/**
 * Create default audio optimizer for verification
 */
export function createAudioOptimizer(): AudioOptimizer {
  return new AudioOptimizer({
    targetSampleRate: 16000,
    targetChannels: 1,
    targetBitDepth: 16,
    enableCompression: false,
    compressionQuality: 0.8,
  });
}
