/**
 * Audio Processor Service
 * Handles audio validation, format conversion, and storage
 */

import { ProcessedAudio, AudioValidation } from '@vlo/shared-types';
import { AudioStorageService } from './audio-storage';

export interface AudioProcessorConfig {
  minDuration: number; // seconds
  maxDuration: number; // seconds
  targetSampleRate: number; // Hz
  minSampleRate: number; // Hz
  minSnr: number; // dB
  clippingThreshold: number; // 0-1
  retentionPeriodDays: number;
}

/**
 * Default configuration for audio processor
 */
export const DEFAULT_AUDIO_CONFIG: AudioProcessorConfig = {
  minDuration: 2,
  maxDuration: 10,
  targetSampleRate: 16000,
  minSampleRate: 8000,
  minSnr: 10,
  clippingThreshold: 0.95,
  retentionPeriodDays: 90
};

/**
 * Audio format enumeration
 */
export enum AudioFormat {
  WAV = 'audio/wav',
  WEBM = 'audio/webm',
  MP3 = 'audio/mpeg',
  OGG = 'audio/ogg'
}

/**
 * Audio Processor Service
 */
export class AudioProcessorService {
  private readonly config: AudioProcessorConfig;
  private readonly storage: AudioStorageService;
  
  constructor(storage: AudioStorageService, config: Partial<AudioProcessorConfig> = {}) {
    this.storage = storage;
    this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
  }
  
  /**
   * Process incoming audio
   */
  async processAudio(sessionId: string, audioData: Buffer): Promise<ProcessedAudio> {
    // Validate audio
    const validation = this.validateAudio(audioData);
    
    if (!validation.valid) {
      throw new Error(`Invalid audio: duration=${validation.duration}s, sampleRate=${validation.sampleRate}Hz, SNR=${validation.snr}dB, clipping=${validation.hasClipping}`);
    }
    
    // Convert format if needed
    let processedData = audioData;
    let needsResampling = validation.sampleRate !== this.config.targetSampleRate;
    
    if (needsResampling) {
      processedData = await this.resampleAudio(audioData, validation.sampleRate, this.config.targetSampleRate);
    }
    
    // Trim silence
    processedData = this.trimSilence(processedData);
    
    // Normalize audio
    processedData = this.normalizeAudio(processedData);
    
    // Store audio
    const audioUrl = await this.storeAudio(sessionId, processedData);
    
    return {
      sessionId,
      audioUrl,
      duration: validation.duration,
      sampleRate: needsResampling ? this.config.targetSampleRate : validation.sampleRate,
      format: this.detectFormat(audioData)
    };
  }
  
  /**
   * Store audio artifact
   */
  async storeAudio(sessionId: string, audioData: Buffer): Promise<string> {
    const format = this.detectFormat(audioData);
    const contentType = format || AudioFormat.WAV;
    
    // Upload with encryption (handled by storage service)
    const url = await this.storage.uploadAudio(audioData, contentType);
    
    // Schedule deletion after retention period
    this.scheduleAudioDeletion(url, this.config.retentionPeriodDays);
    
    return url;
  }
  
  /**
   * Validate audio quality
   */
  validateAudio(audioData: Buffer): AudioValidation {
    const metadata = this.extractAudioMetadata(audioData);
    
    // Check duration
    const durationValid = metadata.duration >= this.config.minDuration && 
                         metadata.duration <= this.config.maxDuration;
    
    // Check sample rate
    const sampleRateValid = metadata.sampleRate >= this.config.minSampleRate;
    
    // Check for clipping
    const hasClipping = this.detectClipping(audioData, this.config.clippingThreshold);
    
    // Calculate SNR
    const snr = this.calculateSNR(audioData);
    const snrValid = snr >= this.config.minSnr;
    
    const valid = durationValid && sampleRateValid && !hasClipping && snrValid;
    
    return {
      valid,
      duration: metadata.duration,
      sampleRate: metadata.sampleRate,
      hasClipping,
      snr
    };
  }
  
  /**
   * Extract audio metadata from buffer
   */
  private extractAudioMetadata(audioData: Buffer): { duration: number; sampleRate: number; channels: number } {
    const format = this.detectFormat(audioData);
    
    if (format === AudioFormat.WAV) {
      return this.parseWavHeader(audioData);
    } else if (format === AudioFormat.WEBM) {
      return this.parseWebMHeader(audioData);
    }
    
    // Default fallback
    return {
      duration: 5,
      sampleRate: 16000,
      channels: 1
    };
  }
  
  /**
   * Parse WAV file header
   */
  private parseWavHeader(audioData: Buffer): { duration: number; sampleRate: number; channels: number } {
    // WAV header structure:
    // Bytes 0-3: "RIFF"
    // Bytes 4-7: File size - 8
    // Bytes 8-11: "WAVE"
    // Bytes 12-15: "fmt "
    // Bytes 16-19: Format chunk size
    // Bytes 20-21: Audio format (1 = PCM)
    // Bytes 22-23: Number of channels
    // Bytes 24-27: Sample rate
    // Bytes 28-31: Byte rate
    // Bytes 32-33: Block align
    // Bytes 34-35: Bits per sample
    
    if (audioData.length < 44) {
      throw new Error('Invalid WAV file: too short');
    }
    
    // Check RIFF header
    const riff = audioData.toString('ascii', 0, 4);
    if (riff !== 'RIFF') {
      throw new Error('Invalid WAV file: missing RIFF header');
    }
    
    // Check WAVE format
    const wave = audioData.toString('ascii', 8, 12);
    if (wave !== 'WAVE') {
      throw new Error('Invalid WAV file: missing WAVE format');
    }
    
    // Read sample rate (bytes 24-27, little-endian)
    const sampleRate = audioData.readUInt32LE(24);
    
    // Read number of channels (bytes 22-23, little-endian)
    const channels = audioData.readUInt16LE(22);
    
    // Read bits per sample (bytes 34-35, little-endian)
    const bitsPerSample = audioData.readUInt16LE(34);
    
    // Calculate duration
    const dataSize = audioData.length - 44; // Subtract header size
    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = dataSize / (bytesPerSample * channels);
    const duration = totalSamples / sampleRate;
    
    return {
      duration,
      sampleRate,
      channels
    };
  }
  
  /**
   * Parse WebM file header (simplified)
   */
  private parseWebMHeader(audioData: Buffer): { duration: number; sampleRate: number; channels: number } {
    // WebM parsing is complex, so we'll use a simplified approach
    // In production, use a library like ebml or matroska
    
    // For now, return reasonable defaults
    // A real implementation would parse EBML structure
    return {
      duration: 5,
      sampleRate: 48000,
      channels: 1
    };
  }
  
  /**
   * Detect audio format from buffer
   */
  private detectFormat(audioData: Buffer): string {
    // Check WAV format (RIFF header)
    if (audioData.length >= 4 && audioData.toString('ascii', 0, 4) === 'RIFF') {
      return AudioFormat.WAV;
    }
    
    // Check WebM format (EBML header: 0x1A 0x45 0xDF 0xA3)
    if (audioData.length >= 4 && 
        audioData[0] === 0x1A && 
        audioData[1] === 0x45 && 
        audioData[2] === 0xDF && 
        audioData[3] === 0xA3) {
      return AudioFormat.WEBM;
    }
    
    // Check MP3 format (ID3 tag or sync word)
    if (audioData.length >= 3 && audioData.toString('ascii', 0, 3) === 'ID3') {
      return AudioFormat.MP3;
    }
    
    // Check OGG format (OggS header)
    if (audioData.length >= 4 && audioData.toString('ascii', 0, 4) === 'OggS') {
      return AudioFormat.OGG;
    }
    
    // Default to WAV
    return AudioFormat.WAV;
  }
  
  /**
   * Detect clipping in audio
   */
  private detectClipping(audioData: Buffer, threshold: number): boolean {
    const format = this.detectFormat(audioData);
    
    if (format !== AudioFormat.WAV) {
      // For non-WAV formats, skip clipping detection
      return false;
    }
    
    // Skip WAV header (44 bytes)
    const audioStart = 44;
    if (audioData.length < audioStart + 2) {
      return false;
    }
    
    // Read 16-bit samples
    const maxValue = 32767; // Max value for 16-bit signed integer
    const clipThreshold = maxValue * threshold;
    let clippedSamples = 0;
    let totalSamples = 0;
    
    for (let i = audioStart; i < audioData.length - 1; i += 2) {
      const sample = audioData.readInt16LE(i);
      const absValue = Math.abs(sample);
      
      if (absValue >= clipThreshold) {
        clippedSamples++;
      }
      totalSamples++;
    }
    
    // Consider clipped if more than 1% of samples are at threshold
    const clippingRatio = clippedSamples / totalSamples;
    return clippingRatio > 0.01;
  }
  
  /**
   * Calculate Signal-to-Noise Ratio
   */
  private calculateSNR(audioData: Buffer): number {
    const format = this.detectFormat(audioData);
    
    if (format !== AudioFormat.WAV) {
      // For non-WAV formats, return default SNR
      return 20;
    }
    
    // Skip WAV header (44 bytes)
    const audioStart = 44;
    if (audioData.length < audioStart + 2) {
      return 0;
    }
    
    // Calculate RMS of signal
    let sumSquares = 0;
    let sampleCount = 0;
    
    for (let i = audioStart; i < audioData.length - 1; i += 2) {
      const sample = audioData.readInt16LE(i);
      sumSquares += sample * sample;
      sampleCount++;
    }
    
    const rms = Math.sqrt(sumSquares / sampleCount);
    
    // Estimate noise floor (simplified: use bottom 10% of samples)
    const samples: number[] = [];
    for (let i = audioStart; i < audioData.length - 1; i += 2) {
      samples.push(Math.abs(audioData.readInt16LE(i)));
    }
    
    samples.sort((a, b) => a - b);
    const noiseFloorIndex = Math.floor(samples.length * 0.1);
    const noiseFloor = samples[noiseFloorIndex] || 1;
    
    // Calculate SNR in dB
    const snr = 20 * Math.log10(rms / noiseFloor);
    
    return Math.max(0, snr); // Ensure non-negative
  }
  
  /**
   * Normalize audio levels
   */
  private normalizeAudio(audioData: Buffer): Buffer {
    const format = this.detectFormat(audioData);
    
    if (format !== AudioFormat.WAV) {
      // For non-WAV formats, return as-is
      return audioData;
    }
    
    // Skip WAV header (44 bytes)
    const audioStart = 44;
    if (audioData.length < audioStart + 2) {
      return audioData;
    }
    
    // Find peak value
    let peak = 0;
    for (let i = audioStart; i < audioData.length - 1; i += 2) {
      const sample = Math.abs(audioData.readInt16LE(i));
      if (sample > peak) {
        peak = sample;
      }
    }
    
    // Calculate normalization factor (target 90% of max to avoid clipping)
    const maxValue = 32767;
    const targetPeak = maxValue * 0.9;
    const normFactor = peak > 0 ? targetPeak / peak : 1;
    
    // Apply normalization if needed
    if (normFactor > 1.1 || normFactor < 0.9) {
      const normalized = Buffer.from(audioData);
      
      for (let i = audioStart; i < normalized.length - 1; i += 2) {
        const sample = normalized.readInt16LE(i);
        const normalizedSample = Math.round(sample * normFactor);
        const clampedSample = Math.max(-maxValue, Math.min(maxValue, normalizedSample));
        normalized.writeInt16LE(clampedSample, i);
      }
      
      return normalized;
    }
    
    return audioData;
  }
  
  /**
   * Resample audio to target sample rate
   */
  async resampleAudio(audioData: Buffer, sourceSampleRate: number, targetSampleRate: number): Promise<Buffer> {
    // Simplified resampling using linear interpolation
    // In production, use a library like ffmpeg or sox
    
    const format = this.detectFormat(audioData);
    
    if (format !== AudioFormat.WAV) {
      // For non-WAV formats, return as-is
      // In production, convert to WAV first
      return audioData;
    }
    
    // Skip WAV header (44 bytes)
    const audioStart = 44;
    if (audioData.length < audioStart + 2) {
      return audioData;
    }
    
    // Read source samples
    const sourceSamples: number[] = [];
    for (let i = audioStart; i < audioData.length - 1; i += 2) {
      sourceSamples.push(audioData.readInt16LE(i));
    }
    
    // Calculate resampling ratio
    const ratio = targetSampleRate / sourceSampleRate;
    const targetLength = Math.floor(sourceSamples.length * ratio);
    
    // Resample using linear interpolation
    const resampledSamples: number[] = [];
    for (let i = 0; i < targetLength; i++) {
      const sourceIndex = i / ratio;
      const index1 = Math.floor(sourceIndex);
      const index2 = Math.min(index1 + 1, sourceSamples.length - 1);
      const fraction = sourceIndex - index1;
      
      const sample1 = sourceSamples[index1];
      const sample2 = sourceSamples[index2];
      const interpolated = sample1 + (sample2 - sample1) * fraction;
      
      resampledSamples.push(Math.round(interpolated));
    }
    
    // Create new WAV buffer with updated header
    const newDataSize = resampledSamples.length * 2;
    const newBuffer = Buffer.alloc(44 + newDataSize);
    
    // Copy and update WAV header
    audioData.copy(newBuffer, 0, 0, 44);
    
    // Update sample rate in header (bytes 24-27)
    newBuffer.writeUInt32LE(targetSampleRate, 24);
    
    // Update byte rate in header (bytes 28-31)
    const channels = audioData.readUInt16LE(22);
    const bitsPerSample = audioData.readUInt16LE(34);
    const byteRate = targetSampleRate * channels * (bitsPerSample / 8);
    newBuffer.writeUInt32LE(byteRate, 28);
    
    // Update file size in header (bytes 4-7)
    newBuffer.writeUInt32LE(36 + newDataSize, 4);
    
    // Write resampled audio data
    for (let i = 0; i < resampledSamples.length; i++) {
      newBuffer.writeInt16LE(resampledSamples[i], 44 + i * 2);
    }
    
    return newBuffer;
  }
  
  /**
   * Trim silence from beginning and end of audio
   */
  trimSilence(audioData: Buffer): Buffer {
    const format = this.detectFormat(audioData);
    
    if (format !== AudioFormat.WAV) {
      // For non-WAV formats, return as-is
      return audioData;
    }
    
    // Skip WAV header (44 bytes)
    const audioStart = 44;
    if (audioData.length < audioStart + 2) {
      return audioData;
    }
    
    // Define silence threshold (5% of max value)
    const silenceThreshold = 32767 * 0.05;
    
    // Find start of audio (first non-silent sample)
    let startIndex = audioStart;
    for (let i = audioStart; i < audioData.length - 1; i += 2) {
      const sample = Math.abs(audioData.readInt16LE(i));
      if (sample > silenceThreshold) {
        startIndex = i;
        break;
      }
    }
    
    // Find end of audio (last non-silent sample)
    let endIndex = audioData.length - 2;
    for (let i = audioData.length - 2; i >= audioStart; i -= 2) {
      const sample = Math.abs(audioData.readInt16LE(i));
      if (sample > silenceThreshold) {
        endIndex = i + 2;
        break;
      }
    }
    
    // If no significant audio found, return original
    if (startIndex >= endIndex) {
      return audioData;
    }
    
    // Create trimmed buffer
    const trimmedDataSize = endIndex - startIndex;
    const trimmedBuffer = Buffer.alloc(44 + trimmedDataSize);
    
    // Copy WAV header
    audioData.copy(trimmedBuffer, 0, 0, 44);
    
    // Update file size in header
    trimmedBuffer.writeUInt32LE(36 + trimmedDataSize, 4);
    
    // Copy trimmed audio data
    audioData.copy(trimmedBuffer, 44, startIndex, endIndex);
    
    return trimmedBuffer;
  }
  
  /**
   * Schedule audio deletion after retention period
   */
  private scheduleAudioDeletion(audioUrl: string, retentionDays: number): void {
    // In production, this would:
    // 1. Add a record to a deletion queue (SQS, Cloud Tasks)
    // 2. Set up a scheduled job to process deletions
    // 3. Use S3 lifecycle policies or GCS object lifecycle management
    
    // For now, just log the scheduled deletion
    const deletionDate = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    console.log(`Audio scheduled for deletion on ${deletionDate.toISOString()}: ${audioUrl}`);
  }
  
  /**
   * Delete audio immediately
   */
  async deleteAudio(audioUrl: string): Promise<void> {
    // Extract key from URL
    const key = this.extractKeyFromUrl(audioUrl);
    
    if (key) {
      await this.storage.deleteAudio(key);
    }
  }
  
  /**
   * Extract storage key from URL
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Remove leading slash
      return pathname.startsWith('/') ? pathname.substring(1) : pathname;
    } catch (error) {
      console.error('Failed to extract key from URL:', error);
      return null;
    }
  }
}
