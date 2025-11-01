/**
 * Audio Processor Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AudioProcessorService, AudioFormat, DEFAULT_AUDIO_CONFIG } from '../audio-processor';
import { InMemoryAudioStorage } from '../audio-storage';

describe('AudioProcessorService', () => {
  let storage: InMemoryAudioStorage;
  let processor: AudioProcessorService;
  
  beforeEach(() => {
    storage = new InMemoryAudioStorage({
      bucketName: 'test-bucket',
      signedUrlExpirySeconds: 3600
    });
    
    processor = new AudioProcessorService(storage);
  });
  
  describe('Audio Validation', () => {
    it('should validate valid WAV audio', () => {
      const validWav = createMockWavBuffer({
        duration: 5,
        sampleRate: 16000,
        amplitude: 0.5
      });
      
      const validation = processor.validateAudio(validWav);
      
      expect(validation.valid).toBe(true);
      expect(validation.duration).toBeGreaterThan(0);
      expect(validation.sampleRate).toBe(16000);
      expect(validation.hasClipping).toBe(false);
      expect(validation.snr).toBeGreaterThan(0);
    });
    
    it('should reject audio that is too short', () => {
      const shortWav = createMockWavBuffer({
        duration: 1,
        sampleRate: 16000,
        amplitude: 0.5
      });
      
      const validation = processor.validateAudio(shortWav);
      
      expect(validation.valid).toBe(false);
      expect(validation.duration).toBeLessThan(DEFAULT_AUDIO_CONFIG.minDuration);
    });
    
    it('should reject audio that is too long', () => {
      const longWav = createMockWavBuffer({
        duration: 15,
        sampleRate: 16000,
        amplitude: 0.5
      });
      
      const validation = processor.validateAudio(longWav);
      
      expect(validation.valid).toBe(false);
      expect(validation.duration).toBeGreaterThan(DEFAULT_AUDIO_CONFIG.maxDuration);
    });
    
    it('should detect clipping in audio', () => {
      const clippedWav = createMockWavBuffer({
        duration: 5,
        sampleRate: 16000,
        amplitude: 1.0 // Max amplitude causes clipping
      });
      
      const validation = processor.validateAudio(clippedWav);
      
      expect(validation.hasClipping).toBe(true);
    });
    
    it('should reject audio with low sample rate', () => {
      const lowSampleRateWav = createMockWavBuffer({
        duration: 5,
        sampleRate: 4000, // Below minimum
        amplitude: 0.5
      });
      
      const validation = processor.validateAudio(lowSampleRateWav);
      
      expect(validation.valid).toBe(false);
      expect(validation.sampleRate).toBeLessThan(DEFAULT_AUDIO_CONFIG.minSampleRate);
    });
  });
  
  describe('Format Conversion', () => {
    it('should resample audio to target sample rate', async () => {
      const sourceWav = createMockWavBuffer({
        duration: 5,
        sampleRate: 48000,
        amplitude: 0.5
      });
      
      const resampled = await processor.resampleAudio(sourceWav, 48000, 16000);
      
      expect(resampled).toBeInstanceOf(Buffer);
      expect(resampled.length).toBeLessThan(sourceWav.length);
      
      // Verify new sample rate in header
      const newSampleRate = resampled.readUInt32LE(24);
      expect(newSampleRate).toBe(16000);
    });
    
    it('should trim silence from audio', () => {
      const wavWithSilence = createMockWavBufferWithSilence({
        duration: 5,
        sampleRate: 16000,
        silenceStart: 0.5,
        silenceEnd: 0.5
      });
      
      const trimmed = processor.trimSilence(wavWithSilence);
      
      expect(trimmed.length).toBeLessThan(wavWithSilence.length);
    });
    
    it('should normalize audio levels', () => {
      const quietWav = createMockWavBuffer({
        duration: 5,
        sampleRate: 16000,
        amplitude: 0.2 // Quiet audio
      });
      
      const normalized = processor['normalizeAudio'](quietWav);
      
      expect(normalized).toBeInstanceOf(Buffer);
      
      // Find peak in normalized audio
      let peak = 0;
      for (let i = 44; i < normalized.length - 1; i += 2) {
        const sample = Math.abs(normalized.readInt16LE(i));
        if (sample > peak) {
          peak = sample;
        }
      }
      
      // Peak should be closer to max value after normalization
      expect(peak).toBeGreaterThan(20000);
    });
  });
  
  describe('Storage Operations', () => {
    it('should store audio and return URL', async () => {
      const audioData = createMockWavBuffer({
        duration: 5,
        sampleRate: 16000,
        amplitude: 0.5
      });
      
      const url = await processor.storeAudio('session-123', audioData);
      
      expect(url).toContain('storage.example.com');
      expect(url).toContain('test-bucket');
    });
    
    it('should process audio end-to-end', async () => {
      const audioData = createMockWavBuffer({
        duration: 5,
        sampleRate: 16000,
        amplitude: 0.5
      });
      
      const result = await processor.processAudio('session-123', audioData);
      
      expect(result.sessionId).toBe('session-123');
      expect(result.audioUrl).toBeTruthy();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.sampleRate).toBe(16000);
      expect(result.format).toBe(AudioFormat.WAV);
    });
    
    it('should throw error for invalid audio', async () => {
      const invalidAudio = createMockWavBuffer({
        duration: 1, // Too short
        sampleRate: 16000,
        amplitude: 0.5
      });
      
      await expect(processor.processAudio('session-123', invalidAudio))
        .rejects.toThrow('Invalid audio');
    });
  });
  
  describe('Format Detection', () => {
    it('should detect WAV format', () => {
      const wavBuffer = createMockWavBuffer({
        duration: 5,
        sampleRate: 16000,
        amplitude: 0.5
      });
      
      const format = processor['detectFormat'](wavBuffer);
      
      expect(format).toBe(AudioFormat.WAV);
    });
    
    it('should detect WebM format', () => {
      const webmBuffer = Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x00, 0x00]);
      
      const format = processor['detectFormat'](webmBuffer);
      
      expect(format).toBe(AudioFormat.WEBM);
    });
    
    it('should default to WAV for unknown format', () => {
      const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      
      const format = processor['detectFormat'](unknownBuffer);
      
      expect(format).toBe(AudioFormat.WAV);
    });
  });
});

/**
 * Helper function to create mock WAV buffer
 */
function createMockWavBuffer(options: {
  duration: number;
  sampleRate: number;
  amplitude: number;
}): Buffer {
  const { duration, sampleRate, amplitude } = options;
  
  const numSamples = Math.floor(duration * sampleRate);
  const dataSize = numSamples * 2; // 16-bit samples
  const buffer = Buffer.alloc(44 + dataSize);
  
  // Write WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Format chunk size
  buffer.writeUInt16LE(1, 20); // Audio format (PCM)
  buffer.writeUInt16LE(1, 22); // Number of channels (mono)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  // Write audio samples (sine wave)
  const maxValue = 32767;
  const frequency = 440; // A4 note
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude * maxValue;
    buffer.writeInt16LE(Math.round(sample), 44 + i * 2);
  }
  
  return buffer;
}

/**
 * Helper function to create mock WAV buffer with silence
 */
function createMockWavBufferWithSilence(options: {
  duration: number;
  sampleRate: number;
  silenceStart: number;
  silenceEnd: number;
}): Buffer {
  const { duration, sampleRate, silenceStart, silenceEnd } = options;
  
  const numSamples = Math.floor(duration * sampleRate);
  const silenceStartSamples = Math.floor(silenceStart * sampleRate);
  const silenceEndSamples = Math.floor(silenceEnd * sampleRate);
  
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  
  // Write WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  // Write audio samples with silence at start and end
  const maxValue = 32767;
  const frequency = 440;
  
  for (let i = 0; i < numSamples; i++) {
    let sample = 0;
    
    if (i >= silenceStartSamples && i < numSamples - silenceEndSamples) {
      const t = i / sampleRate;
      sample = Math.sin(2 * Math.PI * frequency * t) * 0.5 * maxValue;
    }
    
    buffer.writeInt16LE(Math.round(sample), 44 + i * 2);
  }
  
  return buffer;
}
