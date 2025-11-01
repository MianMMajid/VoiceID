/**
 * Unit tests for Spoof Detector service
 * 
 * Task 10.4: Write unit tests for spoof detector
 * - Test model inference with sample audio
 * - Test EER calculation
 * - Test threshold validation
 * 
 * Requirements: 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpoofDetector } from '../spoof-detector';

describe('SpoofDetector', () => {
  let detector: SpoofDetector;

  beforeEach(() => {
    detector = new SpoofDetector({
      modelEndpoint: 'http://test-endpoint/predict',
      modelVersion: 'speechbrain-ecapa-tdnn-v1',
      eerThreshold: 0.01,
      timeoutMs: 3000
    });

    // Mock global fetch
    global.fetch = vi.fn();
  });

  describe('detect - model inference with sample audio', () => {
    it('should successfully detect genuine audio', async () => {
      const mockResponse = {
        score: 0.15,
        eer: 0.005,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // Create sample audio buffer (16-bit PCM, 1 second at 16kHz)
      const sampleAudio = Buffer.alloc(32000); // 16000 samples * 2 bytes
      for (let i = 0; i < 16000; i++) {
        sampleAudio.writeInt16LE(Math.floor(Math.sin(i * 0.1) * 10000), i * 2);
      }

      const result = await detector.detect(sampleAudio);

      expect(result.score).toBe(0.15);
      expect(result.eer).toBe(0.005);
      expect(result.isSpoofed).toBe(false);
      expect(result.modelVersion).toBe('speechbrain-ecapa-tdnn-v1');
    });

    it('should successfully detect spoofed audio', async () => {
      const mockResponse = {
        score: 0.85,
        eer: 0.025,
        is_spoofed: true,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.score).toBe(0.85);
      expect(result.eer).toBe(0.025);
      expect(result.isSpoofed).toBe(true);
    });

    it('should handle audio at EER threshold boundary', async () => {
      const mockResponse = {
        score: 0.50,
        eer: 0.01,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.eer).toBe(0.01);
      expect(result.isSpoofed).toBe(false); // Should be false when equal to threshold
    });

    it('should reject empty audio buffer', async () => {
      const emptyAudio = Buffer.alloc(0);
      
      await expect(detector.detect(emptyAudio)).rejects.toThrow(
        'Invalid audio data: empty buffer'
      );
    });

    it('should reject audio that is too short', async () => {
      // Audio shorter than 0.5 seconds (8000 samples * 2 bytes = 16000 bytes)
      const shortAudio = Buffer.alloc(8000);
      
      await expect(detector.detect(shortAudio)).rejects.toThrow(
        'Audio too short for spoof detection'
      );
    });
  });

  describe('EER calculation and validation', () => {
    it('should calculate EER correctly - below 1% threshold', async () => {
      const mockResponse = {
        score: 0.20,
        eer: 0.008,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.eer).toBe(0.008);
      expect(result.isSpoofed).toBe(false);
    });

    it('should calculate EER correctly - above 1% threshold', async () => {
      const mockResponse = {
        score: 0.75,
        eer: 0.015,
        is_spoofed: true,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.eer).toBe(0.015);
      expect(result.isSpoofed).toBe(true);
    });

    it('should calculate EER correctly - exactly at 1% threshold', async () => {
      const mockResponse = {
        score: 0.50,
        eer: 0.01,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.eer).toBe(0.01);
      expect(result.isSpoofed).toBe(false); // Should be false when equal to threshold
    });

    it('should handle very low EER (high confidence genuine)', async () => {
      const mockResponse = {
        score: 0.05,
        eer: 0.001,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.eer).toBe(0.001);
      expect(result.isSpoofed).toBe(false);
    });

    it('should handle high EER (high confidence spoofed)', async () => {
      const mockResponse = {
        score: 0.95,
        eer: 0.10,
        is_spoofed: true,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.eer).toBe(0.10);
      expect(result.isSpoofed).toBe(true);
    });

    it('should throw error for invalid EER values (> 1)', async () => {
      const mockResponse = {
        score: 0.50,
        eer: 1.5, // Invalid: > 1
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      
      await expect(detector.detect(sampleAudio)).rejects.toThrow(
        'Invalid EER value'
      );
    });

    it('should throw error for negative EER values', async () => {
      const mockResponse = {
        score: 0.50,
        eer: -0.01,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      
      await expect(detector.detect(sampleAudio)).rejects.toThrow(
        'Invalid EER value'
      );
    });
  });

  describe('threshold validation', () => {
    it('should validate 1% EER threshold correctly - below threshold', async () => {
      const mockResponse = {
        score: 0.30,
        eer: 0.005,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.isSpoofed).toBe(false);
    });

    it('should validate 1% EER threshold correctly - above threshold', async () => {
      const mockResponse = {
        score: 0.70,
        eer: 0.02,
        is_spoofed: true,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.isSpoofed).toBe(true);
    });

    it('should use custom threshold when configured', async () => {
      const customDetector = new SpoofDetector({
        eerThreshold: 0.02 // 2% threshold
      });

      const mockResponse = {
        score: 0.60,
        eer: 0.015,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await customDetector.detect(sampleAudio);

      // With 2% threshold, 1.5% EER should be considered genuine
      expect(result.eer).toBe(0.015);
      expect(result.isSpoofed).toBe(false);
    });
  });

  describe('model version tracking', () => {
    it('should track model version from API response', async () => {
      const mockResponse = {
        score: 0.25,
        eer: 0.007,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v2'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.modelVersion).toBe('speechbrain-ecapa-tdnn-v2');
    });

    it('should use default model version when not provided by API', async () => {
      const mockResponse = {
        score: 0.25,
        eer: 0.007,
        is_spoofed: false
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      const result = await detector.detect(sampleAudio);

      expect(result.modelVersion).toBe('speechbrain-ecapa-tdnn-v1');
    });
  });

  describe('error handling', () => {
    it('should handle model endpoint errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Model inference failed'
      });

      const sampleAudio = Buffer.alloc(32000);
      
      await expect(detector.detect(sampleAudio)).rejects.toThrow(
        'Spoof detection failed'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const sampleAudio = Buffer.alloc(32000);
      
      await expect(detector.detect(sampleAudio)).rejects.toThrow(
        'Spoof detection failed'
      );
    });

    it('should handle timeout errors', async () => {
      (global.fetch as any).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Timeout');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      const sampleAudio = Buffer.alloc(32000);
      
      await expect(detector.detect(sampleAudio)).rejects.toThrow(
        'Model inference timeout'
      );
    });

    it('should throw error for invalid score values', async () => {
      const mockResponse = {
        score: 1.5, // Invalid: > 1
        eer: 0.01,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      
      await expect(detector.detect(sampleAudio)).rejects.toThrow(
        'Invalid anti-spoofing score'
      );
    });

    it('should throw error for missing score in response', async () => {
      const mockResponse = {
        eer: 0.01,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      
      await expect(detector.detect(sampleAudio)).rejects.toThrow(
        'Invalid model response: missing score or EER'
      );
    });

    it('should throw error for missing EER in response', async () => {
      const mockResponse = {
        score: 0.50,
        is_spoofed: false,
        model_version: 'speechbrain-ecapa-tdnn-v1'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const sampleAudio = Buffer.alloc(32000);
      
      await expect(detector.detect(sampleAudio)).rejects.toThrow(
        'Invalid model response: missing score or EER'
      );
    });
  });

  describe('configuration', () => {
    it('should use default configuration when not specified', () => {
      const defaultDetector = new SpoofDetector();
      
      expect(defaultDetector.getEERThreshold()).toBe(0.01);
      expect(defaultDetector.getModelVersion()).toBe('speechbrain-ecapa-tdnn-v1');
    });

    it('should use environment variable for model endpoint', () => {
      process.env.SPOOF_MODEL_ENDPOINT = 'http://env-endpoint/predict';
      const envDetector = new SpoofDetector();
      
      expect(envDetector.getModelEndpoint()).toBe('http://env-endpoint/predict');
      
      delete process.env.SPOOF_MODEL_ENDPOINT;
    });

    it('should return configured EER threshold', () => {
      expect(detector.getEERThreshold()).toBe(0.01);
    });

    it('should return configured model version', () => {
      expect(detector.getModelVersion()).toBe('speechbrain-ecapa-tdnn-v1');
    });

    it('should return configured model endpoint', () => {
      expect(detector.getModelEndpoint()).toBe('http://test-endpoint/predict');
    });
  });
});
