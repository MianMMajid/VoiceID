/**
 * Unit tests for VLOClientImpl
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VLOClientImpl, SessionState } from '../vlo-client';
import { AudioCaptureModule } from '../audio-capture';

describe('VLOClientImpl', () => {
  let client: VLOClientImpl;

  beforeEach(() => {
    client = new VLOClientImpl({
      apiBaseUrl: 'https://api.example.com',
      userId: 'test-user-123'
    });
  });

  afterEach(() => {
    client.dispose();
  });

  describe('constructor', () => {
    it('should create instance with required config', () => {
      expect(client).toBeInstanceOf(VLOClientImpl);
    });

    it('should initialize with IDLE state', () => {
      expect(client.getSessionState()).toBe(SessionState.IDLE);
    });
  });

  describe('getSessionState', () => {
    it('should return current session state', () => {
      const state = client.getSessionState();
      expect(Object.values(SessionState)).toContain(state);
    });
  });

  describe('getCurrentSession', () => {
    it('should return null when no session', () => {
      expect(client.getCurrentSession()).toBeNull();
    });
  });

  describe('isSessionActive', () => {
    it('should return false when no session', () => {
      expect(client.isSessionActive()).toBe(false);
    });
  });

  describe('getAudioLevel', () => {
    it('should return audio level', () => {
      const level = client.getAudioLevel();
      expect(typeof level).toBe('number');
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(100);
    });
  });

  describe('captureAudio', () => {
    it('should throw error if not initialized', async () => {
      await expect(client.captureAudio(5000)).rejects.toThrow('not initialized');
    });
  });

  describe('submitAudio', () => {
    it('should validate audio before submission', async () => {
      const invalidBlob = new Blob(['test'], { type: 'audio/wav' });
      
      await expect(
        client.submitAudio('session-123', invalidBlob)
      ).rejects.toThrow();
    });
  });

  describe('stopChallengeAudio', () => {
    it('should not throw when no audio playing', () => {
      expect(() => client.stopChallengeAudio()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should cleanup resources', () => {
      expect(() => client.dispose()).not.toThrow();
    });

    it('should reset state after dispose', () => {
      client.dispose();
      expect(client.getSessionState()).toBe(SessionState.IDLE);
      expect(client.getCurrentSession()).toBeNull();
    });
  });

  describe('checkCompatibility', () => {
    it('should check browser compatibility', () => {
      const compatibility = VLOClientImpl.checkCompatibility();
      
      expect(compatibility).toHaveProperty('supported');
      expect(compatibility).toHaveProperty('hasGetUserMedia');
      expect(compatibility).toHaveProperty('hasMediaRecorder');
      expect(compatibility).toHaveProperty('hasAudioContext');
    });
  });
});
