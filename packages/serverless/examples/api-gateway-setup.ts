/**
 * Example: Setting up API Gateway with authentication and CDN
 */

import {
  APIGateway,
  APIGatewayConfig,
  InMemoryRateLimitStore,
  AuthMiddleware,
  createDefaultAuthConfig,
  CDNManager,
  CDNAudioStorage,
  createDefaultCDNConfig,
  HTTPRequest
} from '../src';

// Example 1: Basic API Gateway setup
function setupBasicAPIGateway() {
  const config: APIGatewayConfig = {
    corsOrigins: ['https://example.com', 'http://localhost:3000'],
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    enableRateLimiting: true,
    enableAuthentication: false
  };

  const rateLimitStore = new InMemoryRateLimitStore();
  const gateway = new APIGateway(config, rateLimitStore);

  return gateway;
}

// Example 2: API Gateway with authentication
function setupAuthenticatedAPIGateway() {
  const config: APIGatewayConfig = {
    corsOrigins: ['https://example.com'],
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    enableRateLimiting: true,
    enableAuthentication: true
  };

  const authConfig = createDefaultAuthConfig();
  const authMiddleware = new AuthMiddleware(authConfig, [
    'internal-api-key-123',
    'service-api-key-456'
  ]);

  const rateLimitStore = new InMemoryRateLimitStore();
  const gateway = new APIGateway(config, rateLimitStore, authMiddleware);

  return { gateway, authMiddleware };
}

// Example 3: Handle incoming request
async function handleRequest() {
  const { gateway, authMiddleware } = setupAuthenticatedAPIGateway();

  // Create a session and generate token
  const userId = 'user-123';
  const sessionId = 'session-456';
  const sessionToken = authMiddleware.generateSessionToken(userId, sessionId);

  // Simulate incoming request
  const request: HTTPRequest = {
    method: 'POST',
    path: '/api/v1/sessions',
    headers: {
      'content-type': 'application/json',
      'origin': 'https://example.com',
      'x-forwarded-for': '192.168.1.1'
    },
    body: JSON.stringify({ userId })
  };

  const response = await gateway.handleRequest(request);
  console.log('Response:', response);

  // Authenticated request to get session
  const authenticatedRequest: HTTPRequest = {
    method: 'GET',
    path: `/api/v1/sessions/${sessionId}`,
    headers: {
      'authorization': `Bearer ${sessionToken}`,
      'origin': 'https://example.com',
      'x-forwarded-for': '192.168.1.1'
    }
  };

  const authenticatedResponse = await gateway.handleRequest(authenticatedRequest);
  console.log('Authenticated Response:', authenticatedResponse);
}

// Example 4: CDN setup for audio delivery
function setupCDN() {
  const cdnConfig = createDefaultCDNConfig();
  const cdnManager = new CDNManager(cdnConfig);
  const audioStorage = new CDNAudioStorage(cdnManager);

  return { cdnManager, audioStorage };
}

// Example 5: Generate signed URL for audio
async function generateAudioURL() {
  const { cdnManager, audioStorage } = setupCDN();

  // Generate cache key from challenge phrase
  const challengePhrase = "The quick brown fox jumps over the lazy dog";
  const audioKey = cdnManager.getAudioKeyFromPhrase(challengePhrase);

  // Upload audio (simulated)
  const audioData = Buffer.from('fake-audio-data');
  const audioURL = await audioStorage.uploadAudio(audioKey, audioData, {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'public, max-age=86400'
  });

  console.log('Audio URL:', audioURL);

  // Generate signed URL with custom expiration
  const signedURL = cdnManager.generateSignedURL(audioKey, {
    expiresIn: 300, // 5 minutes
    ipAddress: '192.168.1.1' // Optional IP restriction
  });

  console.log('Signed URL:', signedURL);

  return signedURL;
}

// Example 6: Complete workflow
async function completeWorkflow() {
  console.log('=== VLO API Gateway Complete Workflow ===\n');

  // 1. Setup
  const { gateway, authMiddleware } = setupAuthenticatedAPIGateway();
  const { cdnManager, audioStorage } = setupCDN();

  // 2. Create session (unauthenticated)
  console.log('1. Creating session...');
  const createSessionRequest: HTTPRequest = {
    method: 'POST',
    path: '/api/v1/sessions',
    headers: {
      'content-type': 'application/json',
      'origin': 'https://example.com'
    },
    body: JSON.stringify({ userId: 'user-123' })
  };

  const sessionResponse = await gateway.handleRequest(createSessionRequest);
  console.log('Session created:', sessionResponse.statusCode);

  // 3. Generate session token
  const userId = 'user-123';
  const sessionId = 'session-456';
  const sessionToken = authMiddleware.generateSessionToken(userId, sessionId);
  console.log('Session token generated');

  // 4. Generate challenge audio URL
  console.log('\n2. Generating challenge audio...');
  const challengePhrase = "Please repeat this phrase clearly";
  const audioKey = cdnManager.getAudioKeyFromPhrase(challengePhrase);
  const audioURL = await audioStorage.uploadAudio(audioKey, Buffer.from('audio-data'));
  console.log('Challenge audio URL:', audioURL);

  // 5. Submit audio (authenticated)
  console.log('\n3. Submitting user audio...');
  const submitAudioRequest: HTTPRequest = {
    method: 'POST',
    path: `/api/v1/sessions/${sessionId}/audio`,
    headers: {
      'content-type': 'audio/webm',
      'authorization': `Bearer ${sessionToken}`,
      'origin': 'https://example.com'
    },
    body: 'binary-audio-data'
  };

  const audioResponse = await gateway.handleRequest(submitAudioRequest);
  console.log('Audio submitted:', audioResponse.statusCode);

  // 6. Get result (authenticated)
  console.log('\n4. Getting verification result...');
  const getResultRequest: HTTPRequest = {
    method: 'GET',
    path: `/api/v1/sessions/${sessionId}/result`,
    headers: {
      'authorization': `Bearer ${sessionToken}`,
      'origin': 'https://example.com'
    }
  };

  const resultResponse = await gateway.handleRequest(getResultRequest);
  console.log('Result retrieved:', resultResponse.statusCode);

  console.log('\n=== Workflow Complete ===');
}

// Example 7: Rate limiting demonstration
async function demonstrateRateLimiting() {
  const gateway = setupBasicAPIGateway();

  console.log('=== Rate Limiting Demo ===\n');

  const request: HTTPRequest = {
    method: 'POST',
    path: '/api/v1/sessions',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.100'
    },
    body: '{}'
  };

  // Make 65 requests (rate limit is 60/min)
  for (let i = 1; i <= 65; i++) {
    const response = await gateway.handleRequest(request);
    if (response.statusCode === 429) {
      console.log(`Request ${i}: Rate limited!`);
      break;
    } else {
      console.log(`Request ${i}: Success (${response.statusCode})`);
    }
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    try {
      await completeWorkflow();
      console.log('\n');
      await demonstrateRateLimiting();
    } catch (error) {
      console.error('Error:', error);
    }
  })();
}

export {
  setupBasicAPIGateway,
  setupAuthenticatedAPIGateway,
  handleRequest,
  setupCDN,
  generateAudioURL,
  completeWorkflow,
  demonstrateRateLimiting
};
