/**
 * Basic Usage Example
 * Demonstrates how to use the VLO UI components
 */

import React from 'react';
import { VoiceVerificationFlow, VLOClientImpl } from '@vlo/client';
import '@vlo/client/ui/styles.css';

// Example 1: Complete Flow with Single Component
export function BasicVerificationExample() {
  const client = new VLOClientImpl({
    apiBaseUrl: 'https://api.example.com/vlo',
    userId: 'user-123'
  });

  return (
    <div className="app-container">
      <VoiceVerificationFlow
        client={client}
        recordingDuration={5000}
        showDetails={true}
        onComplete={(result) => {
          console.log('Verification complete:', result);
          if (result.success) {
            // Redirect to dashboard or next step
            window.location.href = '/dashboard';
          }
        }}
        onError={(error) => {
          console.error('Verification error:', error);
          // Show error notification
        }}
      />
    </div>
  );
}

// Example 2: Custom Flow with Individual Components
import {
  SessionInitializer,
  ChallengeDisplay,
  AudioRecorder,
  ResultDisplay
} from '@vlo/client';
import { SessionResponse, VerificationResult } from '@vlo/shared-types';

export function CustomVerificationFlow() {
  const [stage, setStage] = React.useState<'init' | 'challenge' | 'record' | 'result'>('init');
  const [session, setSession] = React.useState<SessionResponse | null>(null);
  const [result, setResult] = React.useState<VerificationResult | null>(null);

  const client = new VLOClientImpl({
    apiBaseUrl: 'https://api.example.com/vlo',
    userId: 'user-123'
  });

  return (
    <div className="custom-flow">
      {stage === 'init' && (
        <SessionInitializer
          client={client}
          onSessionStarted={(session) => {
            setSession(session);
            setStage('challenge');
          }}
          onError={(error) => {
            console.error('Init error:', error);
          }}
        />
      )}

      {stage === 'challenge' && session && (
        <ChallengeDisplay
          client={client}
          session={session}
          autoPlay={true}
          onChallengeComplete={() => {
            setStage('record');
          }}
          onError={(error) => {
            console.error('Challenge error:', error);
          }}
        />
      )}

      {stage === 'record' && session && (
        <AudioRecorder
          client={client}
          session={session}
          recordingDuration={5000}
          autoStart={true}
          onRecordingComplete={async (audioBlob) => {
            const result = await client.submitAudio(session.sessionId, audioBlob);
            setResult(result);
            setStage('result');
          }}
          onError={(error) => {
            console.error('Recording error:', error);
          }}
        />
      )}

      {stage === 'result' && result && (
        <ResultDisplay
          result={result}
          showDetails={true}
          onRetry={() => {
            setStage('init');
            setSession(null);
            setResult(null);
            client.dispose();
          }}
          onContinue={() => {
            window.location.href = '/dashboard';
          }}
        />
      )}
    </div>
  );
}

// Example 3: With Custom Styling
export function StyledVerificationExample() {
  const client = new VLOClientImpl({
    apiBaseUrl: 'https://api.example.com/vlo',
    userId: 'user-123'
  });

  return (
    <div className="branded-container">
      <style>{`
        .vlo-start-button {
          background: #ff6b6b;
          font-size: 1.2rem;
          padding: 1rem 3rem;
        }
        .vlo-challenge-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
        }
        .vlo-result-icon.success {
          background: #51cf66;
          border-color: #51cf66;
        }
      `}</style>
      
      <VoiceVerificationFlow
        client={client}
        onComplete={(result) => {
          console.log('Verification complete:', result);
        }}
        onError={(error) => {
          console.error('Error:', error);
        }}
      />
    </div>
  );
}
