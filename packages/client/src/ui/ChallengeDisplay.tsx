/**
 * Challenge Display and Playback UI Component
 * Displays challenge text, plays TTS audio, and shows countdown timer
 */

import React, { useState, useEffect, useRef } from 'react';
import { VLOClientImpl } from '../vlo-client';
import { SessionResponse } from '@vlo/shared-types';

export interface ChallengeDisplayProps {
  client: VLOClientImpl;
  session: SessionResponse;
  onChallengeComplete: () => void;
  onError: (error: Error) => void;
  autoPlay?: boolean;
}

export interface ChallengeDisplayState {
  isPlaying: boolean;
  countdown: number | null;
  error: string | null;
  hasPlayed: boolean;
}

export const ChallengeDisplay: React.FC<ChallengeDisplayProps> = ({
  client,
  session,
  onChallengeComplete,
  onError,
  autoPlay = true
}) => {
  const [state, setState] = useState<ChallengeDisplayState>({
    isPlaying: false,
    countdown: null,
    error: null,
    hasPlayed: false
  });

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (autoPlay && !state.hasPlayed) {
      handlePlayChallenge();
    }

    return () => {
      // Cleanup countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      // Stop audio playback
      client.stopChallengeAudio();
    };
  }, []);

  const handlePlayChallenge = async () => {
    setState(prev => ({
      ...prev,
      isPlaying: true,
      error: null,
      countdown: 3
    }));

    try {
      // Start countdown
      startCountdown();

      // Play challenge audio
      await client.playChallengeAudio(session.challengeAudioUrl);

      setState(prev => ({
        ...prev,
        isPlaying: false,
        hasPlayed: true,
        countdown: null
      }));

      // Wait a moment then signal completion
      setTimeout(() => {
        onChallengeComplete();
      }, 500);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        error: error.message || 'Failed to play challenge audio',
        countdown: null
      }));
      onError(error);
    }
  };

  const startCountdown = () => {
    let count = 3;
    setState(prev => ({ ...prev, countdown: count }));

    countdownIntervalRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setState(prev => ({ ...prev, countdown: count }));
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setState(prev => ({ ...prev, countdown: null }));
      }
    }, 1000);
  };

  return (
    <div className="vlo-challenge-display">
      <div className="vlo-challenge-content">
        <h2>Listen and Repeat</h2>

        {state.countdown !== null && (
          <div className="vlo-countdown-timer" aria-live="polite">
            <div className="vlo-countdown-circle">
              <span className="vlo-countdown-number">{state.countdown}</span>
            </div>
            <p>Get ready...</p>
          </div>
        )}

        {state.countdown === null && (
          <>
            <div className="vlo-challenge-text-container">
              <p className="vlo-challenge-instruction">
                Please repeat this phrase clearly:
              </p>
              <div className="vlo-challenge-text" aria-label="Challenge phrase">
                "{session.challengeText}"
              </div>
            </div>

            {state.error && (
              <div className="vlo-error-message" role="alert">
                <strong>Error:</strong> {state.error}
              </div>
            )}

            <div className="vlo-audio-controls">
              {state.isPlaying ? (
                <div className="vlo-audio-playing">
                  <div className="vlo-audio-wave" aria-label="Playing audio">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p>Playing challenge...</p>
                </div>
              ) : (
                <button
                  className="vlo-replay-button"
                  onClick={handlePlayChallenge}
                  disabled={state.isPlaying}
                  aria-label="Replay challenge audio"
                >
                  {state.hasPlayed ? '🔄 Replay' : '▶️ Play'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
