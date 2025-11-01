/**
 * Lambda Warmer Handler
 * Keeps Lambda functions warm to reduce cold starts
 */

import { ScheduledEvent, Context } from 'aws-lambda';

interface WarmerEvent extends ScheduledEvent {
  warmer?: boolean;
  concurrency?: number;
}

interface WarmerResponse {
  warmed: boolean;
  instanceId: string;
  timestamp: number;
  coldStart: boolean;
}

// Track if this is a cold start
let isColdStart = true;

/**
 * Lambda warmer handler
 * Invoked by CloudWatch Events to keep functions warm
 */
export const handler = async (
  event: WarmerEvent,
  context: Context
): Promise<WarmerResponse> => {
  const coldStart = isColdStart;
  isColdStart = false;

  // Check if this is a warmer invocation
  if (event.warmer) {
    console.log('Warmer invocation detected', {
      instanceId: context.awsRequestId,
      coldStart,
      concurrency: event.concurrency || 1,
    });

    return {
      warmed: true,
      instanceId: context.awsRequestId,
      timestamp: Date.now(),
      coldStart,
    };
  }

  // Regular invocation
  console.log('Regular invocation', {
    instanceId: context.awsRequestId,
    coldStart,
  });

  return {
    warmed: false,
    instanceId: context.awsRequestId,
    timestamp: Date.now(),
    coldStart,
  };
};

/**
 * Utility to check if request is a warmer invocation
 */
export const isWarmerInvocation = (event: any): boolean => {
  return event?.warmer === true;
};

/**
 * Middleware to handle warmer invocations in other handlers
 */
export const warmerMiddleware = async (
  event: any,
  context: Context
): Promise<WarmerResponse | null> => {
  if (isWarmerInvocation(event)) {
    const coldStart = isColdStart;
    isColdStart = false;

    console.log('Warmer middleware: keeping function warm', {
      instanceId: context.awsRequestId,
      coldStart,
    });

    return {
      warmed: true,
      instanceId: context.awsRequestId,
      timestamp: Date.now(),
      coldStart,
    };
  }

  // Mark that cold start has been handled
  if (isColdStart) {
    console.log('Cold start detected', { instanceId: context.awsRequestId });
    isColdStart = false;
  }

  return null;
};
