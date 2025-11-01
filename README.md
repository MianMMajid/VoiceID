# VoiceLiveness Onboarder (VLO)

A serverless voice biometrics system for zero-friction account onboarding.

## 🚀 Quick Start

New to this project? Check out the [Setup Guide](SETUP_GUIDE.md) for complete installation and deployment instructions.

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

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- **ElevenLabs API Key**: Get from [ElevenLabs Settings](https://elevenlabs.io/app/settings/api-keys)

### 3. Load Environment Variables

Before deploying or running tests, load the environment variables:

```bash
source ./scripts/load-env.sh
```

Or manually export them:

```bash
export TF_VAR_openai_api_key="your-openai-key"
export TF_VAR_elevenlabs_api_key="your-elevenlabs-key"
export TF_VAR_alert_email="your-email@example.com"
```

### 4. Build All Packages

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
