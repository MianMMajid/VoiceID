# Voice Liveness Backend

This directory contains all backend components for the Voice Liveness Onboarder system.

## Structure

- `packages/serverless/` - AWS Lambda functions and serverless infrastructure
- `scripts/` - Deployment and testing scripts
- `DEPLOYMENT.md` - Deployment documentation
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `E2E_TESTING.md` - End-to-end testing documentation

Note: Shared TypeScript types are located at `../packages/shared-types/` (root level) since they're used by both frontend and backend.

## Getting Started

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.
