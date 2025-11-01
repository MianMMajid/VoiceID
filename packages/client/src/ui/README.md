# VLO UI Components

React components for the Voice Liveness Onboarder verification flow.

## Components

### VoiceVerificationFlow

The main orchestrator component that manages the complete verification workflow.

```tsx
import { VoiceVerificationFlow, VLOClientImpl } from '@vlo/client';
import '@vlo/client/ui/styles.css';

const client = new VLOClientImpl({
  apiBaseUrl: 'https://api.example.com',
  userId: 'user123'
});

function App() {
  return (
    <VoiceVerificationFlow
      client={client}
      onComplete={(result) => {
        console.log('Verification complete:', result);
      }}
      onError={(error) => {
        console.error('Verification error:', error);
      }}
      recordingDuration={5000}
      showDetails={true}
    />
  );
}
```

### SessionInitializer

Handles the initial session setup and microphone permission request.

```tsx
import { SessionInitializer, VLOClientImpl } from '@vlo/client';

<SessionInitializer
  client={client}
  onSessionStarted={(session) => {
    console.log('Session started:', session);
  }}
  onError={(error) => {
    console.error('Error:', error);
  }}
/>
```

**Features:**
- Start verification button
- Browser compatibility check
- Microphone permission handling
- Loading states
- Error messages with helpful instructions

### ChallengeDisplay

Displays the TTS challenge phrase and plays the audio.

```tsx
import { ChallengeDisplay, VLOClientImpl } from '@vlo/client';

<ChallengeDisplay
  client={client}
  session={session}
  onChallengeComplete={() => {
    console.log('Challenge complete');
  }}
  onError={(error) => {
    console.error('Error:', error);
  }}
  autoPlay={true}
/>
```

**Features:**
- Challenge text display
- TTS audio playback
- Visual countdown timer (3-2-1)
- Replay button
- Audio playing indicator

### AudioRecorder

Records user audio with visual feedback.

```tsx
import { AudioRecorder, VLOClientImpl } from '@vlo/client';

<AudioRecorder
  client={client}
  session={session}
  recordingDuration={5000}
  onRecordingComplete={(audioBlob) => {
    console.log('Recording complete:', audioBlob);
  }}
  onError={(error) => {
    console.error('Error:', error);
  }}
  autoStart={true}
/>
```

**Features:**
- Recording indicator with blinking dot
- Real-time audio level visualization (20 bars)
- Countdown timer showing time remaining
- Stop recording button
- Processing indicator after recording

### ResultDisplay

Shows verification results with detailed feedback.

```tsx
import { ResultDisplay } from '@vlo/client';

<ResultDisplay
  result={verificationResult}
  onRetry={() => {
    console.log('Retry verification');
  }}
  onContinue={() => {
    console.log('Continue to next step');
  }}
  showDetails={true}
/>
```

**Features:**
- Success/failure screens with icons
- Detailed feedback for failure reasons
- Helpful tips for fixing issues
- Technical details (scores, timing)
- Retry button for failures
- Continue button for success

## Styling

Import the CSS file in your application:

```tsx
import '@vlo/client/ui/styles.css';
```

Or customize the styles by overriding the CSS classes:

```css
.vlo-start-button {
  background: #custom-color;
}
```

## Requirements Mapping

- **Requirement 1.1**: Session initialization within 2 seconds - `SessionInitializer`
- **Requirement 6.5**: Microphone permission handling - `SessionInitializer`
- **Requirement 8.1**: Challenge display and audio playback - `ChallengeDisplay`
- **Requirement 8.2**: Audio level visualization - `AudioRecorder`
- **Requirement 8.3**: Progress indicators - `AudioRecorder`, `VoiceVerificationFlow`
- **Requirement 8.4**: Failure feedback - `ResultDisplay`
- **Requirement 8.5**: Success message - `ResultDisplay`

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Accessibility

All components include:
- ARIA labels and roles
- Keyboard navigation support
- Screen reader announcements
- High contrast support
- Focus indicators
