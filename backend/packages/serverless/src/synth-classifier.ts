/**
 * Synth Classifier Service
 * Detects synthetic/AI-generated voices using ElevenLabs classification API
 */

import { SynthResult } from '@vlo/shared-types';

/**
 * Configuration for Synth Classifier
 */
export interface SynthClassifierConfig {
  apiKey: string;
  threshold?: number;
  timeoutMs?: number;
  modelVersion?: string;
}

/**
 * ElevenLabs classification API response
 */
interface ElevenLabsClassificationResponse {
  is_ai_generated: boolean;
  probability: number;
  model_version?: string;
}

/**
 * Synth Classifier implementation
 * Uses ElevenLabs API to detect synthetic voices
 */
export class SynthClassifier {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  private readonly threshold: number;
  private readonly timeoutMs: number;
  private readonly modelVersion: string;
  
  constructor(config: SynthClassifierConfig) {
    this.apiKey = config.apiKey;
    this.threshold = config.threshold ?? 0.05; // Default 0.05 per requirements
    this.timeoutMs = config.timeoutMs ?? 2000; // Default 2s timeout
    this.modelVersion = config.modelVersion ?? 'elevenlabs-synth-v1';
  }
  
  /**
   * Classify audio as human or synthetic
   * Implements task 9.2: classification result processing
   */
  async classify(audioData: Buffer): Promise<SynthResult> {
    try {
      // Call ElevenLabs classification API (task 9.1 integration)
      const apiResponse = await this.callClassificationAPI(audioData);
      
      // Process classification result (task 9.2)
      return this.processClassificationResult(apiResponse);
    } catch (error) {
      throw new Error(`Synth classification failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Call ElevenLabs classification API
   * This is a placeholder for task 9.1 implementation
   */
  private async callClassificationAPI(audioData: Buffer): Promise<ElevenLabsClassificationResponse> {
    const url = `${this.baseUrl}/audio-classification`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    
    try {
      const formData = new FormData();
      const audioBlob = new Blob([new Uint8Array(audioData)], { type: 'audio/wav' });
      formData.append('audio', audioBlob);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
        },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ElevenLabs classification API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Classification API timeout after ${this.timeoutMs}ms`);
      }
      throw error;
    }
  }
  
  /**
   * Process classification result from API response
   * Task 9.2: Implement classification result processing
   * 
   * Sub-tasks:
   * - Create SynthResult data structure ✓ (defined in shared-types)
   * - Add probability score extraction ✓
   * - Implement 0.05 threshold validation ✓
   * - Add model version tracking ✓
   */
  private processClassificationResult(apiResponse: ElevenLabsClassificationResponse): SynthResult {
    // Extract probability score from API response
    const probability = this.extractProbabilityScore(apiResponse);
    
    // Validate against 0.05 threshold
    const isSynthetic = this.validateThreshold(probability);
    
    // Track model version
    const modelVersion = this.extractModelVersion(apiResponse);
    
    // Create and return SynthResult data structure
    return {
      probability,
      isSynthetic,
      modelVersion
    };
  }
  
  /**
   * Extract probability score from API response
   * Requirement 2.2: Classify audio as synthetic when probability > 0.05
   */
  private extractProbabilityScore(apiResponse: ElevenLabsClassificationResponse): number {
    const probability = apiResponse.probability;
    
    // Validate probability is in valid range [0, 1]
    if (typeof probability !== 'number' || probability < 0 || probability > 1) {
      throw new Error(`Invalid probability score: ${probability}`);
    }
    
    return probability;
  }
  
  /**
   * Validate probability against threshold
   * Requirement 2.2: Threshold of 0.05 (95% confidence of human voice required)
   * Requirement 2.3: Reject when probability exceeds threshold
   */
  private validateThreshold(probability: number): boolean {
    return probability > this.threshold;
  }
  
  /**
   * Extract model version from API response
   * Requirement 2.4: Track model version for audit purposes
   */
  private extractModelVersion(apiResponse: ElevenLabsClassificationResponse): string {
    return apiResponse.model_version || this.modelVersion;
  }
  
  /**
   * Get current threshold value
   */
  getThreshold(): number {
    return this.threshold;
  }
  
  /**
   * Get current model version
   */
  getModelVersion(): string {
    return this.modelVersion;
  }
}
