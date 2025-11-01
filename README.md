# VoiceLiveness Onboarder (VLO)

A serverless voice biometrics system for zero-friction account onboarding.

## Project Structure

```
voice-liveness-onboarder/
├── packages/
│   ├── client/              # WebRTC audio capture client (Frontend)
│   └── shared-types/        # Shared TypeScript types (used by both frontend & backend)
├── backend/                 # Backend services and infrastructure
│   ├── packages/
│   │   └── serverless/      # Serverless function implementations
│   ├── scripts/             # Deployment and testing scripts
│   ├── package.json
│   └── README.md
├── frontend/                # Frontend application
├── package.json             # Root package with workspaces
└── README.md
```

## Setup

### Frontend Setup

Install dependencies:

```bash
npm install
```

Build frontend packages:

```bash
npm run build
```

### Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
npm run build
```

## Packages

### Frontend

#### @vlo/client
Browser-based WebRTC audio capture and session management:
- VLOClient interface for voice verification
- Audio capture and streaming
- UI integration

### Backend

See [backend/README.md](./backend/README.md) for detailed backend documentation.

#### @vlo/shared-types
Core data models and TypeScript interfaces used across client and backend:
- Session, VerificationResult, AuditLog models
- Enums: SessionStatus, FailureReason, AuditEvent
- Service interfaces and types

#### @vlo/serverless
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
