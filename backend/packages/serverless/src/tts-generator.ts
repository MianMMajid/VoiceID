/**
 * TTS Generator Service
 * Generates challenge phrases and TTS audio for voice verification
 */

import { Challenge } from '@vlo/shared-types';
import { getChallengePhraseText } from './phrase-bank';
import { ElevenLabsClient, withRetry, TTSResponse } from './elevenlabs-client';

export interface TTSGeneratorConfig {
  elevenLabsApiKey: string;
  voiceId?: string;
  modelId?: string;
  fallbackAudioEnabled?: boolean;
  fallbackAudioPath?: string;
}

export interface StorageProvider {
  uploadAudio(audioData: Buffer, contentType: string): Promise<string>;
}

/**
 * TTS Generator implementation
 */
export class TTSGeneratorService {
  private readonly elevenLabsClient: ElevenLabsClient;
  private readonly fallbackAudioEnabled: boolean;
  private readonly fallbackAudioPath?: string;
  private readonly storageProvider?: StorageProvider;
  
  constructor(config: TTSGeneratorConfig, storageProvider?: StorageProvider) {
    this.elevenLabsClient = new ElevenLabsClient({
      apiKey: config.elevenLabsApiKey,
      voiceId: config.voiceId,
      modelId: config.modelId
    });
    this.fallbackAudioEnabled = config.fallbackAudioEnabled ?? true;
    this.fallbackAudioPath = config.fallbackAudioPath;
    this.storageProvider = storageProvider;
  }
  
  /**
   * Generate challenge phrase and TTS audio
   */
  async generateChallenge(): Promise<Challenge> {
    // Get random challenge phrase
    const challengeText = getChallengePhraseText();
    
    try {
      // Generate TTS audio with retry logic
      const ttsResponse = await withRetry(
        () => this.elevenLabsClient.generateTTS({ text: challengeText }),
        {
          maxRetries: 3,
          initialDelayMs: 100,
          maxDelayMs: 2000,
          backoffMultiplier: 2
        }
      );
      
      // Upload audio to storage if provider is available
      let audioUrl: string;
      if (this.storageProvider) {
        audioUrl = await this.storageProvider.uploadAudio(
          ttsResponse.audioData,
          ttsResponse.contentType
        );
      } else {
        // Return data URL if no storage provider
        audioUrl = this.createDataUrl(ttsResponse.audioData, ttsResponse.contentType);
      }
      
      return {
        text: challengeText,
        audioUrl,
        audioData: ttsResponse.audioData
      };
      
    } catch (error) {
      console.error('ElevenLabs TTS generation failed:', error);
      
      // Fallback to pre-generated audio if enabled
      if (this.fallbackAudioEnabled) {
        return this.getFallbackChallenge(challengeText);
      }
      
      throw new Error(`TTS generation failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get fallback challenge with pre-generated audio
   */
  private async getFallbackChallenge(challengeText: string): Promise<Challenge> {
    // In a real implementation, this would load pre-generated audio
    // For now, we'll return a placeholder
    console.warn('Using fallback audio for challenge');
    
    const fallbackAudioUrl = this.fallbackAudioPath || '/audio/fallback-challenge.mp3';
    
    return {
      text: challengeText,
      audioUrl: fallbackAudioUrl,
      audioData: Buffer.from('') // Empty buffer for fallback
    };
  }
  
  /**
   * Create data URL from audio buffer
   */
  private createDataUrl(audioData: Buffer, contentType: string): string {
    const base64Audio = audioData.toString('base64');
    return `data:${contentType};base64,${base64Audio}`;
  }
}
