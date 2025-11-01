/**
 * Lambda Handler: Session Creator
 * Creates new verification sessions and generates TTS challenges
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { warmerMiddleware } from './warmer';

// Import VLO services (these would be implemented in the actual codebase)
// import { SessionStorage } from '../session-storage';
// import { TTSGenerator } from '../tts-generator';
// import { AuditLogger } from '../audit-logger';

interface CreateSessionRequest {
  userId: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

interface CreateSessionResponse {
  sessionId: string;
  challengeText: string;
  challengeAudioUrl: string;
  expiresAt: number;
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Task 15.1: Handle warmer invocations to keep function warm
  const warmerResponse = await warmerMiddleware(event, context);
  if (warmerResponse) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(warmerResponse),
    };
  }

  console.log('Session Creator invoked', { requestId: event.requestContext.requestId });

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Request body is required',
          },
        }),
      };
    }

    const request: CreateSessionRequest = JSON.parse(event.body);

    // Validate request
    if (!request.userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'userId is required',
          },
        }),
      };
    }

    // Generate session ID
    const sessionId = uuidv4();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // TODO: Generate TTS challenge
    // const ttsGenerator = new TTSGenerator();
    // const challenge = await ttsGenerator.generateChallenge();

    // Mock challenge for now
    const challenge = {
      text: 'The quick brown fox jumps over the lazy dog',
      audioUrl: `https://cdn.example.com/challenges/${sessionId}.mp3`,
    };

    // TODO: Store session in DynamoDB
    // const sessionStorage = new SessionStorage();
    // await sessionStorage.createSession({
    //   id: sessionId,
    //   userId: request.userId,
    //   challengePhrase: challenge.text,
    //   challengeAudioUrl: challenge.audioUrl,
    //   status: 'pending',
    //   createdAt: Date.now(),
    //   expiresAt,
    //   metadata: {
    //     ipAddress: event.requestContext.identity.sourceIp,
    //     userAgent: event.headers['User-Agent'] || '',
    //     consentTimestamp: Date.now(),
    //   },
    // });

    // TODO: Log audit event
    // const auditLogger = new AuditLogger();
    // await auditLogger.log({
    //   event: 'SESSION_CREATED',
    //   sessionId,
    //   userId: request.userId,
    //   timestamp: Date.now(),
    // });

    // Return response
    const response: CreateSessionResponse = {
      sessionId,
      challengeText: challenge.text,
      challengeAudioUrl: challenge.audioUrl,
      expiresAt,
    };

    console.log('Session created successfully', { sessionId });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error creating session', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create session',
          retryable: true,
        },
      }),
    };
  }
};
