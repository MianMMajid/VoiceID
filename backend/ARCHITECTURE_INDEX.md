# VoiceLiveness Backend - Architecture Index

This document provides a comprehensive overview of the VoiceLiveness Onboarder backend architecture, components, and organization.

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Service Layer](#service-layer)
- [Infrastructure](#infrastructure)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [Security](#security)
- [Deployment](#deployment)
- [Testing](#testing)

## Overview

**VoiceLiveness Onboarder (VLO)** is a serverless voice biometrics system designed for zero-friction account onboarding. The backend is built on AWS Lambda with TypeScript, implementing a multi-layer verification system that combines Speech-to-Text (STT), Synthetic Voice Detection, and Spoof Detection.

### Key Technologies
- **Runtime**: Node.js 20.x on AWS Lambda
- **Language**: TypeScript 5.3+
- **Infrastructure**: Terraform 1.6+
- **Storage**: DynamoDB, S3, CloudFront CDN
- **API**: API Gateway REST API with TLS 1.3
- **External APIs**: ElevenLabs (TTS/Classification), OpenAI Whisper (STT), HuggingFace (Spoof Detection)

## System Architecture

### High-Level Flow

```
Client → API Gateway → Lambda → DynamoDB/S3
                   ↓
        Verification Orchestrator
                   ↓
        ┌──────────┼──────────┐
        ↓          ↓          ↓
      STT      Synth     Spoof
      API      API       Model
        ↓          ↓          ↓
    Parallel Processing
        ↓
    Result Aggregation
        ↓
    Audit Logging
```

### Core Services

1. **Session Creator** - Initializes verification sessions
2. **Audio Processor** - Validates and processes audio input
3. **Verification Orchestrator** - Coordinates the entire verification workflow
4. **Spoof Detector** - Detects replayed/fake audio using SpeechBrain ECAPA-TDNN

## Core Components

### Session Management

#### `verification-orchestrator.ts`
The central orchestrator that coordinates all verification checks.

**Key Features:**
- Parallel execution of STT, Synth, and Spoof checks
- Result aggregation with weighted scoring
- Comprehensive audit logging
- Fraud detection and counter tracking

**Configuration:**
```typescript
{
  sessionTTLMinutes: 5,
  totalTimeoutMs: 10000,
  sttThreshold: 0.85,      // 85% similarity
  synthThreshold: 0.05,    // 5% synthetic probability
  spoofEERThreshold: 0.01  // 1% EER
}
```

**Liveness Score Calculation:**
- STT: 40% weight (similarity)
- Synth: 30% weight (inverted probability)
- Spoof: 30% weight (inverted EER)
- Composite score: 0-100 where higher = more confident

### Speech-to-Text (STT)

#### `stt-transcriber.ts`
Transcribes audio using Whisper API with Google STT fallback.

**Features:**
- Levenshtein distance similarity calculation
- Text normalization (lowercase, remove punctuation)
- Retry logic with exponential backoff
- Configurable similarity threshold

**Fallback Strategy:**
1. Try OpenAI Whisper API (primary)
2. Fall back to Google Speech-to-Text
3. Throw error if both fail

### Synthetic Voice Detection

#### `synth-classifier.ts`
Detects AI-generated voices using ElevenLabs classification API.

**Threshold:** 5% probability
- Human voice: < 0.05
- Synthetic voice: ≥ 0.05

**Features:**
- 2s timeout for classification
- Model version tracking
- Configurable threshold

### Spoof Detection

#### `spoof-detector.ts`
Detects replayed/spoofed audio using SpeechBrain AASIST3 model.

**Features:**
- HuggingFace Inference API integration
- 60s timeout (model loading)
- Audio preprocessing (normalization, padding)
- EER threshold validation (1%)

**Model Details:**
- **Model**: AASIST3 (ECAPA-TDNN architecture)
- **Endpoint**: HuggingFace Inference API
- **Audio Format**: 16-bit PCM WAV, 16kHz, mono
- **Duration**: 4 seconds (64600 samples)

**Response Parsing:**
Handles multiple response formats:
1. Standard classification: `[{label, score}]`
2. Nested array: `[[{label, score}]]`
3. Custom object: `{score, prediction, ...}`

## Service Layer

### Audio Processing

#### `audio-processor.ts`
Validates and processes incoming audio files.

**Validation Criteria:**
- Duration: 2-10 seconds
- Sample rate: ≥ 8kHz (target: 16kHz)
- SNR: ≥ 10 dB
- No clipping (< 95% threshold)

**Processing Steps:**
1. Audio validation
2. Format conversion (if needed)
3. Resampling to 16kHz
4. Silence trimming
5. Audio normalization
6. Storage upload

#### `audio-storage.ts`
Manages audio file storage on S3.

**Features:**
- Automatic encryption at rest
- CDN integration via CloudFront
- Retention policy (90 days default)
- Signed URLs for secure access

### Text-to-Speech (TTS)

#### `tts-generator.ts`
Generates challenge phrases with audio using ElevenLabs.

**Features:**
- Random phrase generation from phrase bank
- TTS with retry logic
- Fallback to pre-generated audio
- CDN upload for audio delivery

#### `phrase-bank.ts`
Provides random challenge phrases for verification.

**Example Phrases:**
- "The quick brown fox jumps over the lazy dog"
- "She sells seashells by the seashore"
- "How much wood would a woodchuck chuck"

### Session Storage

#### `session-storage.ts`
DynamoDB session management with TTL.

**Features:**
- Session CRUD operations
- TTL-based expiration
- Indexed by userId and createdAt
- Optimistic locking

## Infrastructure

### API Gateway

**Configuration:**
- **TLS**: 1.3 minimum
- **CORS**: Configurable origins
- **Caching**: Optional (5min TTL)
- **Rate Limiting**: 60/min, 1000/hour
- **Security Headers**: HSTS, CSP, X-Frame-Options

**Endpoints:**
```
POST   /api/v1/sessions             # Create session
GET    /api/v1/sessions/{id}        # Get session
POST   /api/v1/sessions/{id}/audio  # Submit audio
GET    /api/v1/sessions/{id}/result # Get result
```

### Lambda Functions

#### Session Creator
- **Memory**: 512MB
- **Timeout**: 30s
- **Handler**: `handlers/session-creator.ts`

#### Audio Processor
- **Memory**: 1024MB
- **Timeout**: 60s
- **Handler**: `handlers/audio-processor.ts`

#### Verification Orchestrator
- **Memory**: 1024MB
- **Timeout**: 60s
- **Provisioned Concurrency**: Optional
- **Handler**: `handlers/verification-orchestrator.ts`

#### Spoof Detector
- **Runtime**: Container Image
- **Memory**: 3008MB
- **Ephemeral Storage**: 2GB (for model weights)
- **Timeout**: 30s

#### Warmer
- **Memory**: 128MB
- **Timeout**: 10s
- **Schedule**: Every 5 minutes (configurable)

### DynamoDB Tables

#### Sessions Table
```
Partition Key: id (String)
Sort Key: createdAt (Number)
GSI: userId-index
TTL: expiresAt
```

#### Audit Logs Table
```
Partition Key: sessionId (String)
Sort Key: timestamp (Number)
GSI: userId-index
Retention: 90 days
```

### S3 Bucket

**Purpose:** Audio file storage
- **Encryption**: AES-256
- **Retention**: 90 days
- **CDN**: CloudFront integration
- **Access**: Private bucket, signed URLs

### CloudWatch

**Monitoring:**
- API Gateway metrics (4XX, 5XX, latency)
- Lambda metrics (invocations, errors, duration, cold starts)
- DynamoDB metrics (capacity, throttling)
- Custom metrics (fraud attempts, liveness scores)

**Alarms:**
- High error rate (5XX > 10)
- High latency (p99 > 10s)
- Fraud attempts (threshold configurable)
- DynamoDB throttling

**Logs:**
- API Gateway access logs (JSON format)
- Lambda execution logs
- Structured logging with request IDs

## Data Models

### Session
```typescript
{
  id: string;
  userId: string;
  challengePhrase: string;
  challengeAudioUrl: string;
  status: SessionStatus;  // pending | processing | completed | failed | expired
  createdAt: number;
  expiresAt: number;
  audioUrl?: string;
  result?: VerificationResult;
  metadata: {
    ipAddress: string;
    userAgent: string;
    consentTimestamp: number;
  }
}
```

### VerificationResult
```typescript
{
  sessionId: string;
  success: boolean;
  livenessScore: number;  // 0-100
  timestamp: number;
  checks: {
    stt: { transcription, confidence, similarity, matched };
    synth: { probability, isSynthetic, modelVersion };
    spoof: { score, eer, isSpoofed, modelVersion };
  };
  reason?: FailureReason;
  processingTimeMs: number;
}
```

### Failure Reasons
- `synthetic_voice`: Synth probability ≥ 5%
- `spoof_detected`: EER > 1%
- `phrase_mismatch`: STT similarity < 85%
- `poor_audio`: Audio validation failed
- `timeout`: Processing exceeded 10s

## API Endpoints

### POST /api/v1/sessions

**Request:**
```json
{
  "userId": "user123",
  "metadata": {
    "ipAddress": "1.2.3.4",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "challengeText": "The quick brown fox...",
  "challengeAudioUrl": "https://cdn.../challenge.mp3",
  "expiresAt": 1234567890
}
```

### POST /api/v1/sessions/{id}/audio

**Request:** multipart/form-data with audio file

**Response:**
```json
{
  "sessionId": "uuid",
  "status": "processing"
}
```

### GET /api/v1/sessions/{id}/result

**Response:**
```json
{
  "sessionId": "uuid",
  "success": true,
  "livenessScore": 87,
  "checks": { ... },
  "processingTimeMs": 3240
}
```

## Security

### Authentication

#### JWT Tokens
- **Session Tokens**: 5-minute expiry
- **API Keys**: 60-minute expiry
- **Algorithm**: HS256

#### Implementation: `auth-middleware.ts`
- Token generation and verification
- Session access validation
- API key management
- Bearer token support

### Rate Limiting

#### `rate-limiter.ts`
**Per-User Limits:**
- Per minute: Configurable (default: 60)
- Per hour: Configurable (default: 1000)
- Per day: Configurable (default: 10000)

**Per-IP Limits:**
- Per minute: Configurable (default: 60)
- Per hour: Configurable (default: 1000)
- Per day: Configurable (default: 10000)

**Advanced Features:**
- Device fingerprinting
- Suspicious device detection
- CAPTCHA integration (Google reCAPTCHA v3)
- Automatic IP blocking after threshold
- Exponential backoff

### Encryption

#### At Rest
- DynamoDB: AES-256 (KMS)
- S3: AES-256 (server-side encryption)
- Secrets Manager: AES-256

#### In Transit
- API Gateway: TLS 1.3
- CloudFront: TLS 1.3
- Lambda → DynamoDB: Encrypted connection

### Audit Logging

#### `audit-logger.ts`
**Events Tracked:**
- Session creation
- Audio submission
- Verification completion
- Fraud detection

**Features:**
- Tamper-evident hashing (SHA-256)
- Encryption of sensitive data
- 90-day retention
- Export to JSON/CSV
- Fraud counter tracking

**Compliance:**
- GDPR: Right to deletion
- SOC 2: Audit trail
- PCI DSS: Security logging

## Deployment

### Environments

1. **Development**
   - DynamoDB: Pay-per-request
   - Provisioned concurrency: Off
   - Log retention: 7 days
   - Debug logging: Enabled

2. **Staging**
   - DynamoDB: Pay-per-request
   - Provisioned concurrency: Off
   - Log retention: 14 days
   - Info logging

3. **Production**
   - DynamoDB: Pay-per-request with auto-scaling
   - Provisioned concurrency: On (5 instances)
   - Log retention: 90 days
   - Info logging
   - DynamoDB streams: Enabled

### Terraform Structure

```
backend/packages/serverless/terraform/
├── main.tf              # API Gateway
├── lambda.tf            # Lambda functions
├── dynamodb.tf          # DynamoDB tables
├── cdn.tf               # CloudFront
├── monitoring.tf        # CloudWatch
├── secrets.tf           # Secrets Manager
├── variables.tf         # Configuration
├── outputs.tf           # Terraform outputs
└── environments/
    ├── backend-dev.hcl
    ├── backend-staging.hcl
    ├── backend-prod.hcl
    ├── dev.tfvars
    ├── staging.tfvars
    └── prod.tfvars
```

### Deployment Process

1. **Build**
   ```bash
   cd backend
   npm install
   npm run build
   ```

2. **Package**
   ```bash
   # Create Lambda deployment package
   zip -r dist/lambda.zip dist/ node_modules/ package.json
   
   # Create Lambda layer
   mkdir -p layer/nodejs
   cp -r node_modules layer/nodejs/
   cd layer && zip -r ../dist/layer.zip . && cd ..
   ```

3. **Deploy with Terraform**
   ```bash
   cd terraform
   terraform init -backend-config=environments/backend-dev.hcl
   terraform plan -var-file=environments/dev.tfvars
   terraform apply
   ```

4. **Verify**
   ```bash
   terraform output api_gateway_url
   ../../scripts/smoke-test.sh <url>
   ```

### CI/CD

**GitHub Actions Workflows:**
- **Push to develop**: Auto-deploy to dev
- **Push to main**: Auto-deploy to staging
- **Create tag**: Manual production deployment (2 approvals)

## Testing

### Test Structure

```
backend/packages/serverless/src/__tests__/
├── alerting.test.ts
├── audio-processor.test.ts
├── audio-storage.test.ts
├── audit-logger.test.ts
├── error-handler.test.ts
├── load-test.ts
├── logger.test.ts
├── metrics.test.ts
├── phrase-bank.test.ts
├── security-test.ts
├── spoof-detector.test.ts
├── stt-transcriber.test.ts
├── synth-classifier.test.ts
├── tracing.test.ts
├── tts-generator.test.ts
└── verification-orchestrator.test.ts
```

### Test Coverage

**Unit Tests:**
- Individual service logic
- Mock external APIs
- Error handling
- Edge cases

**Integration Tests:**
- End-to-end verification flow
- API Gateway → Lambda → DynamoDB
- Parallel processing
- Timeout handling

**Load Tests:**
- Concurrent session creation
- Burst handling
- Rate limit validation
- Cold start impact

### E2E Testing

See `E2E_TESTING.md` for comprehensive end-to-end test scenarios covering:
- Happy path verification
- Failure scenarios
- Timeout handling
- Fraud detection
- Audio quality validation

## Performance Optimizations

### Cold Start Mitigation

1. **Lambda Layers**: Shared dependencies
2. **Provisioned Concurrency**: Pre-warmed instances
3. **Warmer Function**: Scheduled keep-alive
4. **Model Caching**: Reuse loaded models

### Parallel Processing

**Task 15: Optimized Parallel Processor** (`parallel-processor.ts`)

Features:
- Concurrent execution of STT, Synth, Spoof
- Smart task distribution
- Coordinated timing
- Result aggregation

### Caching

- **TTS Audio**: CDN caching with 24h TTL
- **Model Weights**: Lambda /tmp directory (512MB-1024MB)
- **API Gateway**: Optional response caching
- **DynamoDB**: DAX (DynamoDB Accelerator) ready

## Observability

### Logging

**Structured Logging:**
- Request ID propagation
- Correlation IDs
- Log levels (DEBUG, INFO, WARN, ERROR)
- Contextual metadata

**Implementation:** `logger.ts`

### Metrics

**Custom Metrics:**
- Liveness score distribution
- Processing time percentiles
- Fraud attempt rate
- Model inference latency

**Implementation:** `metrics.ts`

### Tracing

**AWS X-Ray:**
- Distributed tracing across services
- Performance bottleneck identification
- Error correlation

**Implementation:** `tracing.ts`

### Alerting

**CloudWatch Alarms:**
- High error rates
- Latency spikes
- Fraud detection
- Capacity issues

**SNS Notifications:**
- Email alerts
- Slack integration
- PagerDuty escalation

**Implementation:** `alerting.ts`

## Documentation

### Additional Resources

1. **DEPLOYMENT.md**: Complete deployment guide
2. **DEPLOYMENT_CHECKLIST.md**: Pre/post-deployment checklist
3. **E2E_TESTING.md**: End-to-end test scenarios
4. **API_GATEWAY_IMPLEMENTATION.md**: API Gateway details
5. **AUDIT_LOGGING.md**: Audit logging specifications
6. **CDN_SETUP.md**: CloudFront CDN configuration

### Code Comments

All major components include:
- JSDoc comments
- Task references (from requirements)
- Requirement tracing
- Usage examples

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Build packages
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Adding New Features

1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Run full test suite
5. Submit PR with E2E test results

### Code Organization

```
backend/packages/serverless/src/
├── index.ts                          # Main exports
├── interfaces.ts                     # Service interfaces
├── handlers/                         # Lambda handlers
│   ├── session-creator.ts
│   ├── warmer.ts
│   └── ...
├── Core Services/
│   ├── verification-orchestrator.ts
│   ├── audio-processor.ts
│   ├── stt-transcriber.ts
│   ├── synth-classifier.ts
│   └── spoof-detector.ts
├── Infrastructure/
│   ├── api-gateway.ts
│   ├── auth-middleware.ts
│   ├── rate-limiter.ts
│   ├── audit-logger.ts
│   └── session-storage.ts
└── Utilities/
    ├── logger.ts
    ├── metrics.ts
    ├── tracing.ts
    └── error-handler.ts
```

## Troubleshooting

### Common Issues

1. **Cold Starts**
   - Enable provisioned concurrency
   - Use warmer function
   - Optimize package size

2. **Timeout Errors**
   - Increase Lambda timeout
   - Check external API latency
   - Optimize parallel processing

3. **Rate Limiting**
   - Review rate limit configuration
   - Implement exponential backoff
   - Consider request batching

4. **Model Inference Failures**
   - Check HuggingFace API status
   - Verify API key
   - Review audio preprocessing

### Debugging

**CloudWatch Logs:**
```bash
aws logs tail /aws/lambda/dev-vlo-verification-orchestrator --follow
```

**X-Ray Traces:**
```bash
aws xray get-trace-summaries --time-range-type TimeRangeByStartTime \
  --start-time $(date -u -d '5 minutes ago' +%s) \
  --end-time $(date -u +%s)
```

## Contributing

When contributing to the backend:

1. Follow TypeScript best practices
2. Maintain test coverage >80%
3. Document public APIs
4. Update architecture documentation
5. Run linter before committing

## Next Steps

### Planned Enhancements

1. **Multi-language Support**: Expand STT to multiple languages
2. **Custom Voice Models**: User-specific voice training
3. **Advanced Fraud Detection**: ML-based anomaly detection
4. **Performance Scaling**: DAX integration for sub-millisecond reads
5. **Cost Optimization**: Reserved capacity, spot instances

### Monitoring Improvements

1. **Real-time Dashboards**: Grafana integration
2. **Anomaly Detection**: AWS Lookout for Metrics
3. **User Experience Tracking**: RUM (Real User Monitoring)
4. **Business Metrics**: Conversion funnel analysis

---

**Last Updated**: 2024
**Version**: 1.0
**Maintainer**: Backend Team

