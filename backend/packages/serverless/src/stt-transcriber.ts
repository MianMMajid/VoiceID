import { STTResult } from '@vlo/shared-types';
import { STTTranscriber } from './interfaces';

/**
 * Configuration for STT Transcriber
 */
export interface STTTranscriberConfig {
  whisperApiKey?: string;
  whisperApiUrl?: string;
  googleApiKey?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Whisper API response structure
 */
interface WhisperResponse {
  text: string;
  confidence?: number;
}

/**
 * Google Speech-to-Text response structure
 */
interface GoogleSTTResponse {
  results?: Array<{
    alternatives?: Array<{
      transcript: string;
      confidence: number;
    }>;
  }>;
}

/**
 * STT Transcriber implementation using Whisper API with Google Speech-to-Text fallback
 */
export class STTTranscriberImpl implements STTTranscriber {
  private config: Required<STTTranscriberConfig>;

  constructor(config: STTTranscriberConfig = {}) {
    this.config = {
      whisperApiKey: config.whisperApiKey || process.env.WHISPER_API_KEY || '',
      whisperApiUrl: config.whisperApiUrl || process.env.WHISPER_API_URL || 'https://api.openai.com/v1/audio/transcriptions',
      googleApiKey: config.googleApiKey || process.env.GOOGLE_API_KEY || '',
      timeout: config.timeout || 30000, // 30 seconds for larger audio files
      retries: config.retries || 3
    };
  }

  /**
   * Transcribe audio to text using Whisper API with fallback to Google Speech-to-Text
   */
  async transcribe(audioData: Buffer): Promise<STTResult> {
    let transcription = '';
    let confidence = 0;

    try {
      // Try Whisper API first
      const whisperResult = await this.transcribeWithWhisper(audioData);
      transcription = whisperResult.text;
      confidence = whisperResult.confidence || 0.95; // Default confidence if not provided
    } catch (error) {
      console.warn('Whisper API failed, falling back to Google Speech-to-Text:', error);
      
      try {
        // Fallback to Google Speech-to-Text
        const googleResult = await this.transcribeWithGoogle(audioData);
        transcription = googleResult.text;
        confidence = googleResult.confidence || 0.9;
      } catch (fallbackError) {
        console.error('Both Whisper and Google STT failed:', fallbackError);
        throw new Error('STT transcription failed: All providers unavailable');
      }
    }

    // Return result without similarity calculation (will be done separately)
    return {
      transcription,
      confidence,
      similarity: 0,
      matched: false
    };
  }

  /**
   * Calculate similarity between transcription and challenge phrase
   */
  calculateSimilarity(transcription: string, challenge: string): number {
    // Normalize both strings
    const normalizedTranscription = this.normalizeText(transcription);
    const normalizedChallenge = this.normalizeText(challenge);

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(normalizedTranscription, normalizedChallenge);
    
    // Convert distance to similarity percentage
    const maxLength = Math.max(normalizedTranscription.length, normalizedChallenge.length);
    if (maxLength === 0) return 100;
    
    const similarity = ((maxLength - distance) / maxLength) * 100;
    return Math.max(0, Math.min(100, similarity));
  }

  /**
   * Transcribe audio using Whisper API with retry logic
   */
  private async transcribeWithWhisper(audioData: Buffer): Promise<WhisperResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const result = await this.callWhisperAPI(audioData);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Whisper API attempt ${attempt + 1} failed:`, error);
        
        // Wait before retry (exponential backoff)
        if (attempt < this.config.retries - 1) {
          await this.sleep(Math.pow(2, attempt) * 500);
        }
      }
    }

    throw lastError || new Error('Whisper API failed after retries');
  }

  /**
   * Call Whisper API with timeout
   */
  private async callWhisperAPI(audioData: Buffer): Promise<WhisperResponse> {
    if (!this.config.whisperApiKey) {
      throw new Error('Whisper API key not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Create form data for multipart/form-data request
      const formData = new FormData();
      const audioBlob = new Blob([new Uint8Array(audioData)], { type: 'audio/wav' });
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-1');

      const response = await fetch(this.config.whisperApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.whisperApiKey}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return {
        text: result.text || '',
        confidence: result.confidence
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error('Whisper API timeout');
      }
      throw error;
    }
  }

  /**
   * Transcribe audio using Google Speech-to-Text API
   */
  private async transcribeWithGoogle(audioData: Buffer): Promise<WhisperResponse> {
    if (!this.config.googleApiKey) {
      throw new Error('Google API key not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const base64Audio = audioData.toString('base64');
      
      const requestBody = {
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US'
        },
        audio: {
          content: base64Audio
        }
      };

      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${this.config.googleApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google STT error: ${response.status} - ${errorText}`);
      }

      const result: GoogleSTTResponse = await response.json();
      
      if (!result.results || result.results.length === 0) {
        throw new Error('No transcription results from Google STT');
      }

      const alternative = result.results[0].alternatives?.[0];
      if (!alternative) {
        throw new Error('No alternative transcription from Google STT');
      }

      return {
        text: alternative.transcript,
        confidence: alternative.confidence
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error('Google STT timeout');
      }
      throw error;
    }
  }

  /**
   * Normalize text for comparison (lowercase, remove punctuation, trim whitespace)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create a 2D array for dynamic programming
    const dp: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      dp[0][j] = j;
    }

    // Fill the dp table
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1,     // insertion
            dp[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }

    return dp[len1][len2];
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * STT Transcriber with challenge phrase comparison
 * This wrapper combines transcription with similarity calculation
 */
export class STTTranscriberWithChallengeImpl {
  private transcriber: STTTranscriber;
  private similarityThreshold: number;

  constructor(config?: STTTranscriberConfig, similarityThreshold: number = 85) {
    this.transcriber = new STTTranscriberImpl(config);
    this.similarityThreshold = similarityThreshold;
  }

  /**
   * Transcribe audio and compare with challenge phrase
   * Returns complete STTResult with similarity and match determination
   */
  async transcribe(audioData: Buffer, challengePhrase: string): Promise<STTResult> {
    // Get base transcription
    const baseResult = await this.transcriber.transcribe(audioData);
    
    // Calculate similarity with challenge phrase
    const similarity = this.transcriber.calculateSimilarity(
      baseResult.transcription,
      challengePhrase
    );
    
    // Determine if it's a match based on threshold
    const matched = similarity >= this.similarityThreshold;
    
    // Return complete result with all fields populated
    return {
      transcription: baseResult.transcription,
      confidence: baseResult.confidence,
      similarity: Math.round(similarity * 100) / 100, // Round to 2 decimal places
      matched
    };
  }
}

/**
 * Factory function to create STT Transcriber instance
 */
export function createSTTTranscriber(config?: STTTranscriberConfig): STTTranscriber {
  return new STTTranscriberImpl(config);
}

/**
 * Factory function to create STT Transcriber with challenge comparison
 */
export function createSTTTranscriberWithChallenge(
  config?: STTTranscriberConfig,
  similarityThreshold?: number
): STTTranscriberWithChallengeImpl {
  return new STTTranscriberWithChallengeImpl(config, similarityThreshold);
}
