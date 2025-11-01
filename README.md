# VoiceLiveness Onboarder (VLO)

A serverless voice biometrics system for zero-friction account onboarding.

## Project Structure

```
voice-liveness-onboarder/
├── packages/
│   ├── client/              # WebRTC audio capture client
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── interfaces.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── serverless/          # Serverless function implementations
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── interfaces.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared-types/        # Shared TypeScript types
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json             # Root package with workspaces
└── README.md
```

## Setup

Install dependencies:

```bash
npm install
```

Build all packages:

```bash
npm run build
```

## Packages

### @vlo/shared-types
Core data models and TypeScript interfaces used across client and backend:
- Session, VerificationResult, AuditLog models
- Enums: SessionStatus, FailureReason, AuditEvent
- Service interfaces and types

### @vlo/client
Browser-based WebRTC audio capture and session management:
- VLOClient interface for voice verification
- Audio capture and streaming
- UI integration

### @vlo/serverless
Serverless function interfaces and implementations:
- VerificationOrchestrator
- TTSGenerator
- AudioProcessor
- STTTranscriber
- SynthClassifier
- SpoofDetector

## Requirements

- Node.js 18+
- TypeScript 5.3+
- npm workspaces support

## Architecture

The system uses a monorepo structure with npm workspaces to share types between client and serverless functions. All packages are written in TypeScript with strict type checking enabled.
