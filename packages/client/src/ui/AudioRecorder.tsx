/**
 * Audio Recording UI Component
 * Shows recording indicator with audio level visualization and processing progress
 */

import React, { useState, useEffect, useRef } from 'react';
import { VLOClientImpl } from '../vlo-client';
import { SessionResponse } from '@vlo/shared-types';

export interface AudioRecorderProps {
  client: VLOClientImpl;
  session: SessionResponse;
  recordingDuration?: number; // milliseconds
  onRecordingComplete: (audioBlob: Blob) => void;
  onError: (error: Error) => void;
  autoStart?: boolean;
}

export interface AudioRecorderState {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number;
  timeRemaining: number;
  error: string | null;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  client,
  session,
  recordingDuration = 5000, // 5 seconds default
  onRecordingComplete,
  onError,
  autoStart = true
}) => {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isProcessing: false,
    audioLevel: 0,
    timeRemaining: recordingDuration / 1000,
    error: null
  });

  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (autoStart) {
      handleStartRecording();
    }

    return () => {
      // Cleanup intervals
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleStartRecording = async () => {
    setState(prev => ({
      ...prev,
      isRecording: true,
      error: null,
      timeRemaining: recordingDuration / 1000
    }));

    try {
      // Start audio level monitoring
      startAudioLevelMonitoring();

      // Start countdown timer
      startCountdownTimer();

      // Capture audio for specified duration
      recordingStartTimeRef.current = Date.now();
      const audioBlob = await client.captureAudio(recordingDuration);

      // Stop monitoring
      stopAudioLevelMonitoring();
      stopCountdownTimer();

      setState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: true
      }));

      onRecordingComplete(audioBlob);
    } catch (error: any) {
      stopAudioLevelMonitoring();
      stopCountdownTimer();

      setState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        error: error.message || 'Failed to record audio'
      }));

      onError(error);
    }
  };

  const handleStopRecording = () => {
    // Manual stop - not implemented in current client API
    // Could be added if needed
    stopAudioLevelMonitoring();
    stopCountdownTimer();
  };

  const startAudioLevelMonitoring = () => {
    audioLevelIntervalRef.current = setInterval(() => {
      const level = client.getAudioLevel();
      setState(prev => ({
        ...prev,
        audioLevel: level
      }));
    }, 50); // Update 20 times per second
  };

  const stopAudioLevelMonitoring = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    setState(prev => ({ ...prev, audioLevel: 0 }));
  };

  const startCountdownTimer = () => {
    const startTime = Date.now();
    const endTime = startTime + recordingDuration;

    countdownIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      setState(prev => ({
        ...prev,
        timeRemaining: remaining
      }));

      if (remaining === 0) {
        stopCountdownTimer();
      }
    }, 100); // Update 10 times per second for smooth countdown
  };

  const stopCountdownTimer = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const getAudioLevelBars = () => {
    const barCount = 20;
    const activeBars = Math.round((state.audioLevel / 100) * barCount);
    return Array.from({ length: barCount }, (_, i) => i < activeBars);
  };

  return (
    <div className="vlo-audio-recorder">
      <div className="vlo-recorder-content">
        {state.isRecording && (
          <>
            <h2>Recording...</h2>
            
            <div className="vlo-recording-indicator">
              <div className="vlo-recording-dot" aria-label="Recording in progress"></div>
              <span>Speak now</span>
            </div>

            <div className="vlo-audio-visualizer" aria-label="Audio level indicator">
              <div className="vlo-audio-bars">
                {getAudioLevelBars().map((active, index) => (
                  <div
                    key={index}
                    className={`vlo-audio-bar ${active ? 'active' : ''}`}
                    style={{
                      height: active ? `${20 + (state.audioLevel / 100) * 80}%` : '20%'
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="vlo-time-remaining" aria-live="polite">
              <span className="vlo-timer">{state.timeRemaining}s</span>
              <p>remaining</p>
            </div>

            <div className="vlo-recording-controls">
              <button
                className="vlo-stop-button"
                onClick={handleStopRecording}
                aria-label="Stop recording"
              >
                ⏹ Stop
              </button>
            </div>
          </>
        )}

        {state.isProcessing && (
          <>
            <h2>Processing...</h2>
            
            <div className="vlo-processing-indicator">
              <div className="vlo-spinner" aria-label="Processing audio"></div>
              <p>Analyzing your voice</p>
            </div>

            <div className="vlo-progress-bar">
              <div className="vlo-progress-fill" style={{ width: '60%' }}></div>
            </div>

            <p className="vlo-processing-message">
              This should take just a few seconds...
            </p>
          </>
        )}

        {!state.isRecording && !state.isProcessing && (
          <>
            <h2>Ready to Record</h2>
            
            {state.error && (
              <div className="vlo-error-message" role="alert">
                <strong>Error:</strong> {state.error}
              </div>
            )}

            <button
              className="vlo-start-recording-button"
              onClick={handleStartRecording}
              aria-label="Start recording"
            >
              🎤 Start Recording
            </button>
          </>
        )}
      </div>
    </div>
  );
};
