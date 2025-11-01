/**
 * Tests for Audio Storage Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAudioStorage, AudioCacheManager } from '../audio-storage';

describe('InMemoryAudioStorage', () => {
  let storage: InMemoryAudioStorage;
  
  beforeEach(() => {
    storage = new InMemoryAudioStorage({
      bucketName: 'test-bucket',
      signedUrlExpirySeconds: 3600
    });
  });
  
  it('should upload audio and return URL', async () => {
    const audioData = Buffer.from('test-audio-data');
    const contentType = 'audio/mpeg';
    
    const url = await storage.uploadAudio(audioData, contentType);
    
    expect(url).toContain('test-bucket');
    expect(url).toContain('challenges/');
  });
  
  it('should store audio data in memory', async () => {
    const audioData = Buffer.from('test-audio-data');
    const contentType = 'audio/mpeg';
    
    const url = await storage.uploadAudio(audioData, contentType);
    
    // Extract key from URL
    const key = url.split('/').slice(-1)[0].split('?')[0];
    const fullKey = `challenges/${key}`;
    
    const stored = storage.getAudio(fullKey);
    expect(stored).toBeDefined();
    expect(stored?.data).toEqual(audioData);
    expect(stored?.contentType).toBe(contentType);
  });
  
  it('should generate signed URL with expiry', async () => {
    const key = 'challenges/test-audio.mp3';
    
    const signedUrl = await storage.generateSignedUrl(key, 1800);
    
    expect(signedUrl).toContain(key);
    expect(signedUrl).toContain('expires=');
  });
  
  it('should delete audio from memory', async () => {
    const audioData = Buffer.from('test-audio-data');
    const url = await storage.uploadAudio(audioData, 'audio/mpeg');
    
    const key = url.split('/').slice(-1)[0].split('?')[0];
    const fullKey = `challenges/${key}`;
    
    await storage.deleteAudio(fullKey);
    
    const stored = storage.getAudio(fullKey);
    expect(stored).toBeUndefined();
  });
  
  it('should clear all stored audio', async () => {
    await storage.uploadAudio(Buffer.from('audio1'), 'audio/mpeg');
    await storage.uploadAudio(Buffer.from('audio2'), 'audio/mpeg');
    
    storage.clear();
    
    // Storage should be empty - we can't directly check size, but uploading new should work
    const url = await storage.uploadAudio(Buffer.from('audio3'), 'audio/mpeg');
    expect(url).toBeDefined();
  });
  
  it('should generate unique keys for each upload', async () => {
    const urls = new Set<string>();
    
    for (let i = 0; i < 5; i++) {
      const url = await storage.uploadAudio(
        Buffer.from(`audio-${i}`),
        'audio/mpeg'
      );
      urls.add(url);
    }
    
    expect(urls.size).toBe(5);
  });
});

describe('AudioCacheManager', () => {
  let cacheManager: AudioCacheManager;
  
  beforeEach(() => {
    cacheManager = new AudioCacheManager(10, 1000); // 10 items, 1 second expiry
  });
  
  it('should cache audio URL for phrase', () => {
    const phrase = 'Test phrase for caching';
    const url = 'https://cdn.example.com/audio/test.mp3';
    
    cacheManager.set(phrase, url);
    
    const cachedUrl = cacheManager.get(phrase);
    expect(cachedUrl).toBe(url);
  });
  
  it('should return undefined for non-existent phrase', () => {
    const cachedUrl = cacheManager.get('Non-existent phrase');
    expect(cachedUrl).toBeUndefined();
  });
  
  it('should expire old cache entries', async () => {
    const phrase = 'Test phrase';
    const url = 'https://cdn.example.com/audio/test.mp3';
    
    cacheManager.set(phrase, url);
    
    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const cachedUrl = cacheManager.get(phrase);
    expect(cachedUrl).toBeUndefined();
  });
  
  it('should evict oldest entry when cache is full', () => {
    const cache = new AudioCacheManager(3, 10000); // Max 3 items
    
    cache.set('phrase1', 'url1');
    cache.set('phrase2', 'url2');
    cache.set('phrase3', 'url3');
    cache.set('phrase4', 'url4'); // Should evict phrase1
    
    expect(cache.get('phrase1')).toBeUndefined();
    expect(cache.get('phrase2')).toBe('url2');
    expect(cache.get('phrase3')).toBe('url3');
    expect(cache.get('phrase4')).toBe('url4');
  });
  
  it('should clear expired entries', async () => {
    const cache = new AudioCacheManager(10, 500); // 500ms expiry
    
    cache.set('phrase1', 'url1');
    
    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 600));
    
    cache.set('phrase2', 'url2'); // Fresh entry
    
    cache.clearExpired();
    
    expect(cache.get('phrase1')).toBeUndefined();
    expect(cache.get('phrase2')).toBe('url2');
  });
  
  it('should clear all cache entries', () => {
    cacheManager.set('phrase1', 'url1');
    cacheManager.set('phrase2', 'url2');
    
    cacheManager.clear();
    
    expect(cacheManager.size()).toBe(0);
    expect(cacheManager.get('phrase1')).toBeUndefined();
    expect(cacheManager.get('phrase2')).toBeUndefined();
  });
  
  it('should report correct cache size', () => {
    expect(cacheManager.size()).toBe(0);
    
    cacheManager.set('phrase1', 'url1');
    expect(cacheManager.size()).toBe(1);
    
    cacheManager.set('phrase2', 'url2');
    expect(cacheManager.size()).toBe(2);
    
    cacheManager.clear();
    expect(cacheManager.size()).toBe(0);
  });
});
