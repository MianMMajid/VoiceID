#!/usr/bin/env ts-node
/**
 * API Integration Test Script
 * Tests real API calls to OpenAI and ElevenLabs to verify credentials and connectivity
 * 
 * Usage: 
 *   source ./scripts/load-env.sh
 *   npx ts-node scripts/test-api-integration.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  service: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Test OpenAI Whisper API
 */
async function testOpenAIWhisper(): Promise<TestResult> {
  const startTime = Date.now();
  const apiKey = process.env.TF_VAR_openai_api_key;

  if (!apiKey) {
    return {
      service: 'OpenAI Whisper',
      status: 'SKIP',
      message: 'API key not found in environment (TF_VAR_openai_api_key)',
    };
  }

  try {
    console.log('Testing OpenAI Whisper API...');
    
    // Create a simple test audio file (1 second of silence in WAV format)
    const testAudio = createTestAudioBuffer();
    
    const formData = new FormData();
    const audioBlob = new Blob([testAudio], { type: 'audio/wav' });
    formData.append('file', audioBlob, 'test.wav');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        service: 'OpenAI Whisper',
        status: 'FAIL',
        message: `API returned ${response.status}: ${response.statusText}`,
        duration,
        error: errorText,
      };
    }

    const data = await response.json();
    
    return {
      service: 'OpenAI Whisper',
      status: 'PASS',
      message: `API call successful. Response received.`,
      duration,
    };
  } catch (error) {
    return {
      service: 'OpenAI Whisper',
      status: 'FAIL',
      message: 'API call failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test ElevenLabs TTS API
 */
async function testElevenLabsTTS(): Promise<TestResult> {
  const startTime = Date.now();
  const apiKey = process.env.TF_VAR_elevenlabs_api_key;

  if (!apiKey) {
    return {
      service: 'ElevenLabs TTS',
      status: 'SKIP',
      message: 'API key not found in environment (TF_VAR_elevenlabs_api_key)',
    };
  }

  try {
    console.log('Testing ElevenLabs TTS API...');
    
    // Test with a simple text-to-speech request
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: 'Hello, this is a test.',
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        service: 'ElevenLabs TTS',
        status: 'FAIL',
        message: `API returned ${response.status}: ${response.statusText}`,
        duration,
        error: errorText,
      };
    }

    const audioData = await response.arrayBuffer();
    
    return {
      service: 'ElevenLabs TTS',
      status: 'PASS',
      message: `API call successful. Generated ${audioData.byteLength} bytes of audio.`,
      duration,
    };
  } catch (error) {
    return {
      service: 'ElevenLabs TTS',
      status: 'FAIL',
      message: 'API call failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test ElevenLabs Synthetic Voice Detection API
 */
async function testElevenLabsSynthDetection(): Promise<TestResult> {
  const startTime = Date.now();
  const apiKey = process.env.TF_VAR_elevenlabs_api_key;

  if (!apiKey) {
    return {
      service: 'ElevenLabs API Access',
      status: 'SKIP',
      message: 'API key not found in environment (TF_VAR_elevenlabs_api_key)',
    };
  }

  try {
    console.log('Testing ElevenLabs API Access...');
    
    // Create a simple test audio file
    const testAudio = createTestAudioBuffer();
    
    const formData = new FormData();
    const audioBlob = new Blob([testAudio], { type: 'audio/wav' });
    formData.append('audio', audioBlob, 'test.wav');

    // Note: Synthetic voice detection may require a specific subscription tier
    // Testing with voice list endpoint instead to verify API access
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        service: 'ElevenLabs API Access',
        status: 'FAIL',
        message: `API returned ${response.status}: ${response.statusText}`,
        duration,
        error: errorText,
      };
    }

    const data: any = await response.json();
    const voiceCount = data.voices ? data.voices.length : 0;
    
    return {
      service: 'ElevenLabs API Access',
      status: 'PASS',
      message: `API access verified. Found ${voiceCount} available voices.`,
      duration,
    };
  } catch (error) {
    return {
      service: 'ElevenLabs API Access',
      status: 'FAIL',
      message: 'API call failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a minimal WAV audio buffer for testing (1 second of silence)
 */
function createTestAudioBuffer(): Buffer {
  const sampleRate = 16000;
  const duration = 1; // 1 second
  const numSamples = sampleRate * duration;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = numSamples * numChannels * bitsPerSample / 8;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // audio format (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  // Fill with silence (zeros)
  buffer.fill(0, 44);
  
  return buffer;
}

/**
 * Print test results
 */
function printResults(results: TestResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('API INTEGRATION TEST RESULTS');
  console.log('='.repeat(80) + '\n');

  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  results.forEach((result) => {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    const durationStr = result.duration ? ` (${result.duration}ms)` : '';
    
    console.log(`${statusIcon} ${result.service}: ${result.status}${durationStr}`);
    console.log(`   ${result.message}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    console.log('');

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else skipCount++;
  });

  console.log('='.repeat(80));
  console.log(`Summary: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);
  console.log('='.repeat(80) + '\n');

  if (failCount > 0) {
    console.log('⚠️  Some API tests failed. Please check your API keys and network connectivity.');
    process.exit(1);
  } else if (passCount === 0) {
    console.log('⚠️  No API tests were run. Please set your API keys in .env file.');
    console.log('   Run: source ./scripts/load-env.sh');
    process.exit(1);
  } else {
    console.log('✅ All API integration tests passed!');
    process.exit(0);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('Starting API Integration Tests...\n');
  console.log('This will make real API calls to verify your credentials.\n');

  // Check if environment variables are loaded
  if (!process.env.TF_VAR_openai_api_key && !process.env.TF_VAR_elevenlabs_api_key) {
    console.log('❌ No API keys found in environment variables.');
    console.log('   Please run: source ./scripts/load-env.sh');
    console.log('   Or set TF_VAR_openai_api_key and TF_VAR_elevenlabs_api_key manually.\n');
    process.exit(1);
  }

  // Run tests
  results.push(await testOpenAIWhisper());
  results.push(await testElevenLabsTTS());
  results.push(await testElevenLabsSynthDetection());

  // Print results
  printResults(results);
}

// Run tests
main().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
