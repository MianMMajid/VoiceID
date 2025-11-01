import { describe, it, expect, vi, beforeEach } from 'vitest';
import { STTTranscriberImpl, STTTranscriberWithChallengeImpl, createSTTTranscriber, createSTTTranscriberWithChallenge } from '../stt-transcriber';

describe('STTTranscriber', () => {
  let transcriber: STTTranscriberImpl;

  beforeEach(() => {
    transcriber = new STTTranscriberImpl({
      whisperApiKey: 'test-key',
      timeout: 3000,
      retries: 3
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 100% for identical strings', () => {
      const similarity = transcriber.calculateSimilarity(
        'the quick brown fox',
        'the quick brown fox'
      );
      expect(similarity).toBe(100);
    });

    it('should return 100% for strings with different case', () => {
      const similarity = transcriber.calculateSimilarity(
        'The Quick Brown Fox',
        'the quick brown fox'
      );
      expect(similarity).toBe(100);
    });

    it('should return 100% for strings with different punctuation', () => {
      const similarity = transcriber.calculateSimilarity(
        'Hello, world!',
        'hello world'
      );
      expect(similarity).toBe(100);
    });

    it('should calculate similarity for slightly different strings', () => {
      const similarity = transcriber.calculateSimilarity(
        'the quick brown fox',
        'the quick brown dog'
      );
      // "fox" vs "dog" - 3 character difference out of 19 characters
      expect(similarity).toBeGreaterThan(80);
      expect(similarity).toBeLessThan(100);
    });

    it('should calculate similarity for very different strings', () => {
      const similarity = transcriber.calculateSimilarity(
        'hello world',
        'goodbye universe'
      );
      expect(similarity).toBeLessThan(50);
    });

    it('should handle empty strings', () => {
      const similarity = transcriber.calculateSimilarity('', '');
      expect(similarity).toBe(100);
    });

    it('should handle one empty string', () => {
      const similarity = transcriber.calculateSimilarity('hello', '');
      expect(similarity).toBe(0);
    });

    it('should normalize whitespace', () => {
      const similarity = transcriber.calculateSimilarity(
        'the  quick   brown    fox',
        'the quick brown fox'
      );
      expect(similarity).toBe(100);
    });
  });

  describe('transcribe with mocked Whisper API', () => {
    beforeEach(() => {
      // Mock global fetch
      global.fetch = vi.fn();
    });

    it('should successfully transcribe audio with Whisper API', async () => {
      const mockResponse = {
        text: 'the quick brown fox jumps over the lazy dog',
        confidence: 0.95
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      const result = await transcriber.transcribe(audioData);

      expect(result.transcription).toBe(mockResponse.text);
      expect(result.confidence).toBe(0.95);
      expect(result.similarity).toBe(0);
      expect(result.matched).toBe(false);
    });

    it('should use default confidence when not provided', async () => {
      const mockResponse = {
        text: 'hello world'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const audioData = Buffer.from('fake-audio-data');
      const result = await transcriber.transcribe(audioData);

      expect(result.confidence).toBe(0.95);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockResponse = {
        text: 'success after retry',
        confidence: 0.9
      };

      // First call fails, second succeeds
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

      const audioData = Buffer.from('fake-audio-data');
      const result = await transcriber.transcribe(audioData);

      expect(result.transcription).toBe(mockResponse.text);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should fallback to Google STT when Whisper fails', async () => {
      const googleResponse = {
        results: [{
          alternatives: [{
            transcript: 'fallback transcription',
            confidence: 0.88
          }]
        }]
      };

      // Whisper fails all retries
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Whisper error'))
        .mockRejectedValueOnce(new Error('Whisper error'))
        .mockRejectedValueOnce(new Error('Whisper error'))
        // Google succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => googleResponse
        });

      const transcriberWithGoogle = new STTTranscriberImpl({
        whisperApiKey: 'test-key',
        googleApiKey: 'google-test-key',
        timeout: 3000,
        retries: 3
      });

      const audioData = Buffer.from('fake-audio-data');
      const result = await transcriberWithGoogle.transcribe(audioData);

      expect(result.transcription).toBe('fallback transcription');
      expect(result.confidence).toBe(0.88);
    });

    it('should throw error when both Whisper and Google fail', async () => {
      // All calls fail
      (global.fetch as any).mockRejectedValue(new Error('API error'));

      const transcriberWithGoogle = new STTTranscriberImpl({
        whisperApiKey: 'test-key',
        googleApiKey: 'google-test-key',
        timeout: 3000,
        retries: 3
      });

      const audioData = Buffer.from('fake-audio-data');
      
      await expect(transcriberWithGoogle.transcribe(audioData)).rejects.toThrow(
        'STT transcription failed: All providers unavailable'
      );
    });

    it('should handle API timeout', async () => {
      // Mock a slow response that will timeout
      (global.fetch as any).mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 5000))
      );

      const shortTimeoutTranscriber = new STTTranscriberImpl({
        whisperApiKey: 'test-key',
        timeout: 100,
        retries: 1
      });

      const audioData = Buffer.from('fake-audio-data');
      
      await expect(shortTimeoutTranscriber.transcribe(audioData)).rejects.toThrow();
    });
  });

  describe('threshold validation', () => {
    it('should validate 85% threshold correctly', () => {
      const similarity85 = transcriber.calculateSimilarity(
        'the quick brown fox jumps',
        'the quick brown fox jump'
      );
      
      // Should be close to 85% (one character difference)
      expect(similarity85).toBeGreaterThan(80);
    });

    it('should identify strings below 85% threshold', () => {
      const lowSimilarity = transcriber.calculateSimilarity(
        'the quick brown fox',
        'a slow red dog'
      );
      
      expect(lowSimilarity).toBeLessThan(85);
    });

    it('should identify strings above 85% threshold', () => {
      const highSimilarity = transcriber.calculateSimilarity(
        'my voice is my password',
        'my voice is my pasword'
      );
      
      expect(highSimilarity).toBeGreaterThan(85);
    });
  });
});

describe('STTTranscriberWithChallenge', () => {
  let transcriberWithChallenge: STTTranscriberWithChallengeImpl;

  beforeEach(() => {
    transcriberWithChallenge = new STTTranscriberWithChallengeImpl({
      whisperApiKey: 'test-key',
      timeout: 3000,
      retries: 3
    }, 85);

    // Mock global fetch
    global.fetch = vi.fn();
  });

  it('should transcribe and calculate similarity with challenge phrase', async () => {
    const mockResponse = {
      text: 'the quick brown fox',
      confidence: 0.95
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const audioData = Buffer.from('fake-audio-data');
    const challengePhrase = 'the quick brown fox';
    
    const result = await transcriberWithChallenge.transcribe(audioData, challengePhrase);

    expect(result.transcription).toBe('the quick brown fox');
    expect(result.confidence).toBe(0.95);
    expect(result.similarity).toBe(100);
    expect(result.matched).toBe(true);
  });

  it('should mark as matched when similarity meets threshold', async () => {
    const mockResponse = {
      text: 'the quick brown fox jumps',
      confidence: 0.92
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const audioData = Buffer.from('fake-audio-data');
    const challengePhrase = 'the quick brown fox jump';
    
    const result = await transcriberWithChallenge.transcribe(audioData, challengePhrase);

    expect(result.similarity).toBeGreaterThan(85);
    expect(result.matched).toBe(true);
  });

  it('should mark as not matched when similarity below threshold', async () => {
    const mockResponse = {
      text: 'completely different phrase',
      confidence: 0.9
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const audioData = Buffer.from('fake-audio-data');
    const challengePhrase = 'the quick brown fox';
    
    const result = await transcriberWithChallenge.transcribe(audioData, challengePhrase);

    expect(result.similarity).toBeLessThan(85);
    expect(result.matched).toBe(false);
  });

  it('should round similarity to 2 decimal places', async () => {
    const mockResponse = {
      text: 'the quick brown foxes',
      confidence: 0.93
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const audioData = Buffer.from('fake-audio-data');
    const challengePhrase = 'the quick brown fox';
    
    const result = await transcriberWithChallenge.transcribe(audioData, challengePhrase);

    // Check that similarity is rounded to 2 decimal places
    expect(result.similarity.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
  });
});

describe('Factory functions', () => {
  it('should create STTTranscriber instance', () => {
    const transcriber = createSTTTranscriber();
    expect(transcriber).toBeInstanceOf(STTTranscriberImpl);
  });

  it('should create STTTranscriberWithChallenge instance', () => {
    const transcriber = createSTTTranscriberWithChallenge();
    expect(transcriber).toBeInstanceOf(STTTranscriberWithChallengeImpl);
  });

  it('should create STTTranscriberWithChallenge with custom threshold', () => {
    const transcriber = createSTTTranscriberWithChallenge(undefined, 90);
    expect(transcriber).toBeInstanceOf(STTTranscriberWithChallengeImpl);
  });
});
