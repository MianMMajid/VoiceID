import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SynthClassifier } from '../synth-classifier';

describe('SynthClassifier', () => {
  let classifier: SynthClassifier;

  beforeEach(() => {
    classifier = new SynthClassifier({
      apiKey: 'test-key',
      threshold: 0.05,
      timeoutMs: 2000,
      modelVersion: 'elevenlabs-synth-v1'
    });

    // Mock global fetch
    global.fetch = vi.fn();
  });

  describe('processClassificationResult', () => {
    it('should create SynthResult with extracted probability', async () => {
      const mockResponse = {
        is_ai_generated: false,
        probability: 0.02,
        model_version: 'elevenlabs-synth-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      const result = await classifier.classify(audioData);

      expect(result.probability).toBe(0.02);
      expect(result.isSynthetic).toBe(false);
      expect(result.modelVersion).toBe('elevenlabs-synth-v1');
    });

    it('should validate 0.05 threshold correctly - below threshold', async () => {
      const mockResponse = {
        is_ai_generated: false,
        probability: 0.04,
        model_version: 'elevenlabs-synth-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      const result = await classifier.classify(audioData);

      expect(result.probability).toBe(0.04);
      expect(result.isSynthetic).toBe(false);
    });

    it('should validate 0.05 threshold correctly - above threshold', async () => {
      const mockResponse = {
        is_ai_generated: true,
        probability: 0.08,
        model_version: 'elevenlabs-synth-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      const result = await classifier.classify(audioData);

      expect(result.probability).toBe(0.08);
      expect(result.isSynthetic).toBe(true);
    });

    it('should validate 0.05 threshold correctly - exactly at threshold', async () => {
      const mockResponse = {
        is_ai_generated: false,
        probability: 0.05,
        model_version: 'elevenlabs-synth-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      const result = await classifier.classify(audioData);

      expect(result.probability).toBe(0.05);
      expect(result.isSynthetic).toBe(false); // Should be false when equal to threshold
    });

    it('should track model version from API response', async () => {
      const mockResponse = {
        is_ai_generated: false,
        probability: 0.03,
        model_version: 'elevenlabs-synth-v2'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      const result = await classifier.classify(audioData);

      expect(result.modelVersion).toBe('elevenlabs-synth-v2');
    });

    it('should use default model version when not provided by API', async () => {
      const mockResponse = {
        is_ai_generated: false,
        probability: 0.01
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      const result = await classifier.classify(audioData);

      expect(result.modelVersion).toBe('elevenlabs-synth-v1');
    });

    it('should handle high probability synthetic voice', async () => {
      const mockResponse = {
        is_ai_generated: true,
        probability: 0.95,
        model_version: 'elevenlabs-synth-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      const result = await classifier.classify(audioData);

      expect(result.probability).toBe(0.95);
      expect(result.isSynthetic).toBe(true);
    });

    it('should throw error for invalid probability values', async () => {
      const mockResponse = {
        is_ai_generated: false,
        probability: 1.5, // Invalid: > 1
        model_version: 'elevenlabs-synth-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      
      await expect(classifier.classify(audioData)).rejects.toThrow(
        'Invalid probability score'
      );
    });

    it('should throw error for negative probability values', async () => {
      const mockResponse = {
        is_ai_generated: false,
        probability: -0.1,
        model_version: 'elevenlabs-synth-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      
      await expect(classifier.classify(audioData)).rejects.toThrow(
        'Invalid probability score'
      );
    });
  });

  describe('getThreshold', () => {
    it('should return configured threshold', () => {
      expect(classifier.getThreshold()).toBe(0.05);
    });

    it('should use default threshold when not specified', () => {
      const defaultClassifier = new SynthClassifier({
        apiKey: 'test-key'
      });
      expect(defaultClassifier.getThreshold()).toBe(0.05);
    });
  });

  describe('getModelVersion', () => {
    it('should return configured model version', () => {
      expect(classifier.getModelVersion()).toBe('elevenlabs-synth-v1');
    });

    it('should use default model version when not specified', () => {
      const defaultClassifier = new SynthClassifier({
        apiKey: 'test-key'
      });
      expect(defaultClassifier.getModelVersion()).toBe('elevenlabs-synth-v1');
    });
  });
});
