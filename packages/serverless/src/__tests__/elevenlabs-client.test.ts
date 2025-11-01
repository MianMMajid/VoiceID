/**
 * Tests for ElevenLabs API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElevenLabsClient, withRetry } from '../elevenlabs-client';

// Mock fetch globally
global.fetch = vi.fn();

describe('ElevenLabsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should initialize with config', () => {
    const client = new ElevenLabsClient({
      apiKey: 'test-api-key',
      voiceId: 'test-voice-id',
      modelId: 'test-model-id'
    });
    
    expect(client).toBeDefined();
  });
  
  it('should generate TTS audio successfully', async () => {
    const mockAudioData = Buffer.from('mock-audio-data');
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'audio/mpeg'
      },
      arrayBuffer: async () => mockAudioData.buffer
    });
    
    const client = new ElevenLabsClient({
      apiKey: 'test-api-key'
    });
    
    const result = await client.generateTTS({
      text: 'Test phrase for TTS'
    });
    
    expect(result.audioData).toBeInstanceOf(Buffer);
    expect(result.contentType).toBe('audio/mpeg');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  
  it('should use custom voice and model settings', async () => {
    const mockAudioData = Buffer.from('mock-audio-data');
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'audio/mpeg'
      },
      arrayBuffer: async () => mockAudioData.buffer
    });
    
    const client = new ElevenLabsClient({
      apiKey: 'test-api-key',
      voiceId: 'custom-voice',
      modelId: 'custom-model'
    });
    
    await client.generateTTS({
      text: 'Test phrase',
      stability: 0.7,
      similarityBoost: 0.8
    });
    
    const fetchCall = (global.fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    
    expect(requestBody.voice_settings.stability).toBe(0.7);
    expect(requestBody.voice_settings.similarity_boost).toBe(0.8);
  });
  
  it('should throw error on API failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid API key'
    });
    
    const client = new ElevenLabsClient({
      apiKey: 'invalid-key'
    });
    
    await expect(
      client.generateTTS({ text: 'Test' })
    ).rejects.toThrow('ElevenLabs TTS API error');
  });
  
  it('should include API key in request headers', async () => {
    const mockAudioData = Buffer.from('mock-audio-data');
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'audio/mpeg'
      },
      arrayBuffer: async () => mockAudioData.buffer
    });
    
    const client = new ElevenLabsClient({
      apiKey: 'test-api-key-123'
    });
    
    await client.generateTTS({ text: 'Test' });
    
    const fetchCall = (global.fetch as any).mock.calls[0];
    const headers = fetchCall[1].headers;
    
    expect(headers['xi-api-key']).toBe('test-api-key-123');
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should succeed on first attempt', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    
    const result = await withRetry(mockFn, {
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2
    });
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
  
  it('should retry on failure and eventually succeed', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce('success');
    
    const result = await withRetry(mockFn, {
      maxRetries: 3,
      initialDelayMs: 1,
      maxDelayMs: 10,
      backoffMultiplier: 2
    });
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
  
  it('should throw error after max retries', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
    
    await expect(
      withRetry(mockFn, {
        maxRetries: 2,
        initialDelayMs: 1,
        maxDelayMs: 10,
        backoffMultiplier: 2
      })
    ).rejects.toThrow('Always fails');
    
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
  
  it('should use exponential backoff', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce('success');
    
    const startTime = Date.now();
    
    await withRetry(mockFn, {
      maxRetries: 3,
      initialDelayMs: 50,
      maxDelayMs: 500,
      backoffMultiplier: 2
    });
    
    const elapsed = Date.now() - startTime;
    
    // Should have waited at least 50ms + 100ms = 150ms
    expect(elapsed).toBeGreaterThanOrEqual(140); // Allow some margin
  });
});
