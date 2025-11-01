/**
 * Tests for TTS Generator Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TTSGeneratorService } from '../tts-generator';
import * as elevenLabsModule from '../elevenlabs-client';

// Mock dependencies
vi.mock('../phrase-bank', () => ({
  getChallengePhraseText: vi.fn(() => 'The quick brown fox jumps over')
}));

describe('TTSGeneratorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should initialize with config', () => {
    const service = new TTSGeneratorService({
      elevenLabsApiKey: 'test-key'
    });
    
    expect(service).toBeDefined();
  });
  
  it('should generate challenge with TTS audio', async () => {
    const mockAudioData = Buffer.from('mock-audio-data');
    
    // Mock ElevenLabs client
    const mockGenerateTTS = vi.fn().mockResolvedValue({
      audioData: mockAudioData,
      contentType: 'audio/mpeg'
    });
    
    vi.spyOn(elevenLabsModule, 'ElevenLabsClient').mockImplementation(() => ({
      generateTTS: mockGenerateTTS
    } as any));
    
    const service = new TTSGeneratorService({
      elevenLabsApiKey: 'test-key'
    });
    
    const challenge = await service.generateChallenge();
    
    expect(challenge.text).toBe('The quick brown fox jumps over');
    expect(challenge.audioData).toEqual(mockAudioData);
    expect(challenge.audioUrl).toContain('data:audio/mpeg;base64');
    expect(mockGenerateTTS).toHaveBeenCalledWith({
      text: 'The quick brown fox jumps over'
    });
  });
  
  it('should use storage provider when available', async () => {
    const mockAudioData = Buffer.from('mock-audio-data');
    const mockStorageUrl = 'https://cdn.example.com/audio/challenge.mp3';
    
    const mockGenerateTTS = vi.fn().mockResolvedValue({
      audioData: mockAudioData,
      contentType: 'audio/mpeg'
    });
    
    vi.spyOn(elevenLabsModule, 'ElevenLabsClient').mockImplementation(() => ({
      generateTTS: mockGenerateTTS
    } as any));
    
    const mockStorageProvider = {
      uploadAudio: vi.fn().mockResolvedValue(mockStorageUrl)
    };
    
    const service = new TTSGeneratorService(
      { elevenLabsApiKey: 'test-key' },
      mockStorageProvider
    );
    
    const challenge = await service.generateChallenge();
    
    expect(challenge.audioUrl).toBe(mockStorageUrl);
    expect(mockStorageProvider.uploadAudio).toHaveBeenCalledWith(
      mockAudioData,
      'audio/mpeg'
    );
  });
  
  it('should fallback to pre-generated audio on TTS failure', async () => {
    const mockGenerateTTS = vi.fn().mockRejectedValue(new Error('API Error'));
    
    vi.spyOn(elevenLabsModule, 'ElevenLabsClient').mockImplementation(() => ({
      generateTTS: mockGenerateTTS
    } as any));
    
    const service = new TTSGeneratorService({
      elevenLabsApiKey: 'test-key',
      fallbackAudioEnabled: true,
      fallbackAudioPath: '/audio/fallback.mp3'
    });
    
    const challenge = await service.generateChallenge();
    
    expect(challenge.text).toBe('The quick brown fox jumps over');
    expect(challenge.audioUrl).toBe('/audio/fallback.mp3');
    expect(challenge.audioData).toEqual(Buffer.from(''));
  });
  
  it('should throw error when fallback is disabled', async () => {
    const mockGenerateTTS = vi.fn().mockRejectedValue(new Error('API Error'));
    
    vi.spyOn(elevenLabsModule, 'ElevenLabsClient').mockImplementation(() => ({
      generateTTS: mockGenerateTTS
    } as any));
    
    const service = new TTSGeneratorService({
      elevenLabsApiKey: 'test-key',
      fallbackAudioEnabled: false
    });
    
    await expect(service.generateChallenge()).rejects.toThrow('TTS generation failed');
  });
  
  it('should retry TTS generation on failure', async () => {
    const mockAudioData = Buffer.from('mock-audio-data');
    
    const mockGenerateTTS = vi.fn()
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce({
        audioData: mockAudioData,
        contentType: 'audio/mpeg'
      });
    
    vi.spyOn(elevenLabsModule, 'ElevenLabsClient').mockImplementation(() => ({
      generateTTS: mockGenerateTTS
    } as any));
    
    const service = new TTSGeneratorService({
      elevenLabsApiKey: 'test-key',
      fallbackAudioEnabled: false
    });
    
    const challenge = await service.generateChallenge();
    
    expect(challenge.audioData).toEqual(mockAudioData);
    expect(mockGenerateTTS).toHaveBeenCalledTimes(2);
  });
  
  it('should create data URL when no storage provider', async () => {
    const mockAudioData = Buffer.from('test-audio');
    
    const mockGenerateTTS = vi.fn().mockResolvedValue({
      audioData: mockAudioData,
      contentType: 'audio/mpeg'
    });
    
    vi.spyOn(elevenLabsModule, 'ElevenLabsClient').mockImplementation(() => ({
      generateTTS: mockGenerateTTS
    } as any));
    
    const service = new TTSGeneratorService({
      elevenLabsApiKey: 'test-key'
    });
    
    const challenge = await service.generateChallenge();
    
    expect(challenge.audioUrl).toMatch(/^data:audio\/mpeg;base64,/);
    
    // Verify base64 encoding
    const base64Data = challenge.audioUrl.split(',')[1];
    const decodedData = Buffer.from(base64Data, 'base64');
    expect(decodedData.toString()).toBe('test-audio');
  });
});
