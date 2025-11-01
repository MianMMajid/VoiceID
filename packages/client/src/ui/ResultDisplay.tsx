/**
 * Result Display UI Component
 * Shows success/failure screens with detailed feedback and retry functionality
 */

import React from 'react';
import { VerificationResult } from '@vlo/shared-types';

export interface ResultDisplayProps {
  result: VerificationResult;
  onRetry?: () => void;
  onContinue?: () => void;
  showDetails?: boolean;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  onRetry,
  onContinue,
  showDetails = true
}) => {
  const getFailureMessage = (reason?: string): string => {
    switch (reason) {
      case 'synthetic_voice':
        return 'We detected that the audio may be synthetic or AI-generated. Please use your natural voice.';
      case 'spoof_detected':
        return 'We detected potential audio manipulation or replay. Please record fresh audio in a quiet environment.';
      case 'phrase_mismatch':
        return 'The phrase you spoke did not match the challenge. Please speak clearly and repeat the exact phrase.';
      case 'poor_audio':
        return 'The audio quality was too low. Please ensure you are in a quiet environment and speak clearly into your microphone.';
      case 'timeout':
        return 'The verification process took too long. Please try again with a stable internet connection.';
      default:
        return 'Verification failed. Please try again.';
    }
  };

  const getFailureHelp = (reason?: string): string[] => {
    switch (reason) {
      case 'synthetic_voice':
        return [
          'Ensure you are speaking naturally',
          'Do not use voice changers or filters',
          'Record in a quiet environment'
        ];
      case 'spoof_detected':
        return [
          'Record fresh audio (do not replay recordings)',
          'Speak directly into your microphone',
          'Ensure no audio processing is active'
        ];
      case 'phrase_mismatch':
        return [
          'Listen carefully to the challenge phrase',
          'Speak clearly and at a normal pace',
          'Repeat the exact words in order'
        ];
      case 'poor_audio':
        return [
          'Move to a quieter location',
          'Check your microphone is working properly',
          'Speak louder and more clearly',
          'Ensure microphone is not muted or blocked'
        ];
      default:
        return [
          'Check your internet connection',
          'Ensure microphone permissions are granted',
          'Try using a different browser if issues persist'
        ];
    }
  };

  return (
    <div className={`vlo-result-display ${result.success ? 'success' : 'failure'}`}>
      <div className="vlo-result-content">
        {result.success ? (
          <>
            <div className="vlo-result-icon success" aria-label="Success">
              ✓
            </div>
            <h2>Verification Successful!</h2>
            <p className="vlo-result-message">
              Your voice has been verified successfully. You can now continue with your account setup.
            </p>

            {showDetails && (
              <div className="vlo-result-details">
                <h3>Verification Details</h3>
                <div className="vlo-detail-item">
                  <span className="vlo-detail-label">Liveness Score:</span>
                  <span className="vlo-detail-value">{result.livenessScore}/100</span>
                </div>
                <div className="vlo-detail-item">
                  <span className="vlo-detail-label">Processing Time:</span>
                  <span className="vlo-detail-value">{(result.processingTimeMs / 1000).toFixed(2)}s</span>
                </div>
                {result.checks && (
                  <>
                    <div className="vlo-detail-item">
                      <span className="vlo-detail-label">Speech Match:</span>
                      <span className="vlo-detail-value">
                        {result.checks.stt?.matched ? '✓ Passed' : '✗ Failed'}
                      </span>
                    </div>
                    <div className="vlo-detail-item">
                      <span className="vlo-detail-label">Voice Authenticity:</span>
                      <span className="vlo-detail-value">
                        {result.checks.synth?.isSynthetic ? '✗ Failed' : '✓ Passed'}
                      </span>
                    </div>
                    <div className="vlo-detail-item">
                      <span className="vlo-detail-label">Spoof Detection:</span>
                      <span className="vlo-detail-value">
                        {result.checks.spoof?.isSpoofed ? '✗ Failed' : '✓ Passed'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {onContinue && (
              <button
                className="vlo-continue-button"
                onClick={onContinue}
                aria-label="Continue to next step"
              >
                Continue
              </button>
            )}
          </>
        ) : (
          <>
            <div className="vlo-result-icon failure" aria-label="Failure">
              ✗
            </div>
            <h2>Verification Failed</h2>
            <p className="vlo-result-message">
              {getFailureMessage(result.reason)}
            </p>

            <div className="vlo-failure-help">
              <h3>How to fix this:</h3>
              <ul>
                {getFailureHelp(result.reason).map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>

            {showDetails && result.checks && (
              <div className="vlo-result-details">
                <h3>Technical Details</h3>
                {result.checks.stt && (
                  <div className="vlo-detail-item">
                    <span className="vlo-detail-label">Speech Match:</span>
                    <span className="vlo-detail-value">
                      {result.checks.stt.similarity?.toFixed(1)}% 
                      {result.checks.stt.matched ? ' ✓' : ' ✗'}
                    </span>
                  </div>
                )}
                {result.checks.synth && (
                  <div className="vlo-detail-item">
                    <span className="vlo-detail-label">Synthetic Probability:</span>
                    <span className="vlo-detail-value">
                      {(result.checks.synth.probability * 100).toFixed(1)}%
                      {result.checks.synth.isSynthetic ? ' ✗' : ' ✓'}
                    </span>
                  </div>
                )}
                {result.checks.spoof && (
                  <div className="vlo-detail-item">
                    <span className="vlo-detail-label">Spoof Score:</span>
                    <span className="vlo-detail-value">
                      EER {(result.checks.spoof.eer * 100).toFixed(2)}%
                      {result.checks.spoof.isSpoofed ? ' ✗' : ' ✓'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {onRetry && (
              <button
                className="vlo-retry-button"
                onClick={onRetry}
                aria-label="Try verification again"
              >
                🔄 Try Again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
