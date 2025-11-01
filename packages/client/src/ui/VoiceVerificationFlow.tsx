/**
 * Voice Verification Flow Component
 * Orchestrates the complete verification workflow through all UI stages
 */

import React, { useState } from 'react';
import { VLOClientImpl } from '../vlo-client';
import { SessionResponse, VerificationResult } from '@vlo/shared-types';
import { SessionInitializer } from './SessionInitializer';
import { ChallengeDisplay } from './ChallengeDisplay';
import { AudioRecorder } from './AudioRecorder';
import { ResultDisplay } from './ResultDisplay';

export interface VoiceVerificationFlowProps {
  client: VLOClientImpl;
  onComplete?: (result: VerificationResult) => void;
  onError?: (error: Error) => void;
  recordingDuration?: number;
  showDetails?: boolean;
}

type FlowStage = 'init' | 'challenge' | 'recording' | 'processing' | 'result';

interface FlowState {
  stage: FlowStage;
  session: SessionResponse | null;
  audioBlob: Blob | null;
  result: VerificationResult | null;
  error: Error | null;
}

export const VoiceVerificationFlow: React.FC<VoiceVerificationFlowProps> = ({
  client,
  onComplete,
  onError,
  recordingDuration = 5000,
  showDetails = true
}) => {
  const [state, setState] = useState<FlowState>({
    stage: 'init',
    session: null,
    audioBlob: null,
    result: null,
    error: null
  });

  const handleSessionStarted = (session: SessionResponse) => {
    setState(prev => ({
      ...prev,
      stage: 'challenge',
      session,
      error: null
    }));
  };

  const handleChallengeComplete = () => {
    setState(prev => ({
      ...prev,
      stage: 'recording'
    }));
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setState(prev => ({
      ...prev,
      stage: 'processing',
      audioBlob
    }));

    try {
      if (!state.session) {
        throw new Error('No active session');
      }

      // Submit audio for verification
      const result = await client.submitAudio(state.session.sessionId, audioBlob);

      setState(prev => ({
        ...prev,
        stage: 'result',
        result
      }));

      if (onComplete) {
        onComplete(result);
      }
    } catch (error: any) {
      const err = new Error(error.message || 'Failed to process verification');
      setState(prev => ({
        ...prev,
        error: err
      }));

      if (onError) {
        onError(err);
      }
    }
  };

  const handleRetry = () => {
    // Reset to initial state
    setState({
      stage: 'init',
      session: null,
      audioBlob: null,
      result: null,
      error: null
    });

    // Dispose current client session
    client.dispose();
  };

  const handleError = (error: Error) => {
    setState(prev => ({
      ...prev,
      error
    }));

    if (onError) {
      onError(error);
    }
  };

  return (
    <div className="vlo-verification-flow">
      {state.stage === 'init' && (
        <SessionInitializer
          client={client}
          onSessionStarted={handleSessionStarted}
          onError={handleError}
        />
      )}

      {state.stage === 'challenge' && state.session && (
        <ChallengeDisplay
          client={client}
          session={state.session}
          onChallengeComplete={handleChallengeComplete}
          onError={handleError}
          autoPlay={true}
        />
      )}

      {state.stage === 'recording' && state.session && (
        <AudioRecorder
          client={client}
          session={state.session}
          recordingDuration={recordingDuration}
          onRecordingComplete={handleRecordingComplete}
          onError={handleError}
          autoStart={true}
        />
      )}

      {state.stage === 'processing' && (
        <div className="vlo-processing-stage">
          <div className="vlo-processing-content">
            <h2>Verifying...</h2>
            <div className="vlo-spinner" aria-label="Verifying your voice"></div>
            <p>Analyzing your voice recording</p>
            <div className="vlo-progress-bar">
              <div className="vlo-progress-fill animated"></div>
            </div>
          </div>
        </div>
      )}

      {state.stage === 'result' && state.result && (
        <ResultDisplay
          result={state.result}
          onRetry={handleRetry}
          showDetails={showDetails}
        />
      )}

      {state.error && state.stage !== 'result' && (
        <div className="vlo-error-overlay">
          <div className="vlo-error-content">
            <h3>Something went wrong</h3>
            <p>{state.error.message}</p>
            <button onClick={handleRetry} className="vlo-retry-button">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
