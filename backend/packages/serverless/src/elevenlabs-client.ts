/**
 * ElevenLabs API client for TTS generation
 * Handles text-to-speech conversion with error handling and retry logic
 */

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
}

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface TTSResponse {
  audioData: Buffer;
  contentType: string;
}

/**
 * ElevenLabs API client
 */
export class ElevenLabsClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  private readonly defaultVoiceId: string;
  private readonly defaultModelId: string;
  
  constructor(config: ElevenLabsConfig) {
    this.apiKey = config.apiKey;
    this.defaultVoiceId = config.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default voice
    this.defaultModelId = config.modelId || 'eleven_monolingual_v1';
  }
  
  /**
   * Generate TTS audio from text
   */
  async generateTTS(options: TTSOptions): Promise<TTSResponse> {
    const voiceId = options.voiceId || this.defaultVoiceId;
    const modelId = options.modelId || this.defaultModelId;
    
    const url = `${this.baseUrl}/text-to-speech/${voiceId}`;
    
    const requestBody = {
      text: options.text,
      model_id: modelId,
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarityBoost ?? 0.75
      }
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ElevenLabs TTS API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
    
    const audioBuffer = await response.arrayBuffer();
    
    return {
      audioData: Buffer.from(audioBuffer),
      contentType: response.headers.get('content-type') || 'audio/mpeg'
    };
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 2000,
  backoffMultiplier: 2
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  let delayMs = config.initialDelayMs;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Wait before retrying with exponential backoff
      await sleep(Math.min(delayMs, config.maxDelayMs));
      delayMs *= config.backoffMultiplier;
    }
  }
  
  throw lastError!;
}
