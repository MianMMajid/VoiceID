/**
 * Session Initialization UI Component
 * Handles start verification button and permission request flow
 */

import React, { useState } from 'react';
import { VLOClientImpl } from '../vlo-client';
import { SessionResponse } from '@vlo/shared-types';

export interface SessionInitializerProps {
  client: VLOClientImpl;
  onSessionStarted: (session: SessionResponse) => void;
  onError: (error: Error) => void;
}

export interface SessionInitializerState {
  isLoading: boolean;
  error: string | null;
  permissionStatus: 'pending' | 'granted' | 'denied' | null;
}

export const SessionInitializer: React.FC<SessionInitializerProps> = ({
  client,
  onSessionStarted,
  onError
}) => {
  const [state, setState] = useState<SessionInitializerState>({
    isLoading: false,
    error: null,
    permissionStatus: null
  });

  const handleStartVerification = async () => {
    setState({
      isLoading: true,
      error: null,
      permissionStatus: 'pending'
    });

    try {
      // Check browser compatibility first
      const compatibility = VLOClientImpl.checkCompatibility();
      if (!compatibility.supported) {
        throw new Error(
          `Your browser is not supported. Missing features: ${compatibility.missingFeatures.join(', ')}`
        );
      }

      // Start session (this will request microphone permission)
      const session = await client.startSession();

      setState({
        isLoading: false,
        error: null,
        permissionStatus: 'granted'
      });

      onSessionStarted(session);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to start verification';
      
      // Check if it's a permission error
      const isPermissionError = 
        errorMessage.includes('permission') || 
        errorMessage.includes('NotAllowedError') ||
        errorMessage.includes('denied');

      setState({
        isLoading: false,
        error: errorMessage,
        permissionStatus: isPermissionError ? 'denied' : null
      });

      onError(error);
    }
  };

  return (
    <div className="vlo-session-initializer">
      <div className="vlo-initializer-content">
        <h2>Voice Verification</h2>
        <p>We'll verify your identity using your voice. This takes less than 10 seconds.</p>

        {state.error && (
          <div className="vlo-error-message" role="alert">
            <strong>Error:</strong> {state.error}
            {state.permissionStatus === 'denied' && (
              <div className="vlo-permission-help">
                <p>To continue, please:</p>
                <ol>
                  <li>Click the microphone icon in your browser's address bar</li>
                  <li>Allow microphone access for this site</li>
                  <li>Try again</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {state.isLoading && (
          <div className="vlo-loading-state">
            <div className="vlo-spinner" aria-label="Loading"></div>
            <p>
              {state.permissionStatus === 'pending'
                ? 'Requesting microphone permission...'
                : 'Initializing verification...'}
            </p>
          </div>
        )}

        <button
          className="vlo-start-button"
          onClick={handleStartVerification}
          disabled={state.isLoading}
          aria-busy={state.isLoading}
        >
          {state.isLoading ? 'Starting...' : 'Start Verification'}
        </button>

        <div className="vlo-privacy-notice">
          <small>
            Your voice recording will be used only for verification and deleted after 90 days.
          </small>
        </div>
      </div>
    </div>
  );
};
