/**
 * Unit tests for AudioProcessor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AudioProcessor } from '../audio-processor';

describe('AudioProcessor', () => {
  let audioProcessor: AudioProcessor;

  beforeEach(() => {
    audioProcessor = new AudioProcessor();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(audioProcessor).toBeInstanceOf(AudioProcessor);
    });

    it('should accept custom config', () => {
      const customProcessor = new AudioProcessor({
        targetSampleRate: 48000,
        silenceThreshold: 0.02,
        minSilenceDuration: 0.5
      });
      expect(customProcessor).toBeInstanceOf(AudioProcessor);
    });
  });

  describe('validateAudioQuality', () => {
    it('should reject invalid audio blob', async () => {
      const invalidBlob = new Blob(['invalid data'], { type: 'audio/wav' });
      
      const result = await audioProcessor.validateAudioQuality(invalidBlob);
      
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should return validation result structure', async () => {
      const invalidBlob = new Blob(['test'], { type: 'audio/wav' });
      
      const result = await audioProcessor.validateAudioQuality(invalidBlob);
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('issues');
      expect(Array.isArray(result.issues)).toBe(true);
    });
  });

  describe('getAudioDuration', () => {
    it('should reject invalid audio blob', async () => {
      const invalidBlob = new Blob(['invalid'], { type: 'audio/wav' });
      
      await expect(audioProcessor.getAudioDuration(invalidBlob)).rejects.toThrow();
    });
  });

  describe('compressAudio', () => {
    it('should return blob for compression', async () => {
      const testBlob = new Blob(['test'], { type: 'audio/webm' });
      
      const result = await audioProcessor.compressAudio(testBlob);
      
      expect(result).toBeInstanceOf(Blob);
    });
  });
});
