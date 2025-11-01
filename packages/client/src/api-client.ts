/**
 * API Client for backend communication
 * Handles HTTP requests with retry logic and error handling
 */

import { SessionResponse, VerificationResult, ErrorResponse } from '@vlo/shared-types';

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class ApiClient {
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Create a new verification session
   */
  async createSession(userId: string): Promise<SessionResponse> {
    return this.request<SessionResponse>('/api/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  /**
   * Get session status
   */
  async getSession(sessionId: string): Promise<SessionResponse> {
    return this.request<SessionResponse>(`/api/v1/sessions/${sessionId}`, {
      method: 'GET'
    });
  }

  /**
   * Submit audio for verification
   */
  async submitAudio(sessionId: string, audioBlob: Blob): Promise<VerificationResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    return this.request<VerificationResult>(
      `/api/v1/sessions/${sessionId}/audio`,
      {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      },
      false // Don't set JSON content type
    );
  }

  /**
   * Get verification result
   */
  async getResult(sessionId: string): Promise<VerificationResult> {
    return this.request<VerificationResult>(`/api/v1/sessions/${sessionId}/result`, {
      method: 'GET'
    });
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit,
    isJson: boolean = true
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          ...options,
          headers: {
            ...(isJson ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
          }
        });

        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          
          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(errorData.error.message);
          }

          // Retry server errors (5xx)
          if (errorData.error.retryable && attempt < this.config.maxRetries) {
            await this.delay(this.config.retryDelay * Math.pow(2, attempt));
            continue;
          }

          throw new Error(errorData.error.message);
        }

        return await response.json();
      } catch (error: any) {
        lastError = error;

        // Don't retry on timeout or network errors if max retries reached
        if (attempt >= this.config.maxRetries) {
          break;
        }

        // Exponential backoff
        await this.delay(this.config.retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<ErrorResponse> {
    try {
      return await response.json();
    } catch {
      return {
        error: {
          code: 'UNKNOWN_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
          retryable: response.status >= 500
        }
      };
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
