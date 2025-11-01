# Migration Guide: Backend Reorganization

This guide explains the recent project restructuring where backend components were moved into a dedicated `backend/` directory.

## What Changed

### Directory Structure

**Before:**
```
voice-liveness-onboarder/
├── packages/
│   ├── client/
│   ├── serverless/
│   └── shared-types/
├── scripts/
└── [deployment docs]
```

**After:**
```
voice-liveness-onboarder/
├── packages/
│   ├── client/              # Frontend
│   └── shared-types/        # Shared between frontend & backend
├── backend/
│   ├── packages/
│   │   └── serverless/      # Backend services
│   ├── scripts/             # Backend scripts
│   └── [deployment docs]
└── frontend/
```

### Files Moved to `backend/`

- `packages/serverless/` → `backend/packages/serverless/`
- `scripts/` → `backend/scripts/`
- `DEPLOYMENT.md` → `backend/DEPLOYMENT.md`
- `DEPLOYMENT_CHECKLIST.md` → `backend/DEPLOYMENT_CHECKLIST.md`
- `E2E_TESTING.md` → `backend/E2E_TESTING.md`

### Files Kept at Root

- `packages/client/` - Frontend client package
- `packages/shared-types/` - Shared types used by both frontend and backend
- `frontend/` - Frontend application
- `README.md` - Main project documentation

## What You Need to Do

### 1. Update Your Local Repository

```bash
# Pull the latest changes
git pull origin frontend

# Clean up old node_modules
rm -rf node_modules packages/*/node_modules backend/node_modules backend/packages/*/node_modules

# Reinstall dependencies
npm install
cd backend && npm install && cd ..
```

### 2. Update Scripts and Commands

**Deployment:**
```bash
# Old
./scripts/deploy.sh dev

# New
./backend/scripts/deploy.sh dev
```

**Terraform:**
```bash
# Old
cd packages/serverless/terraform

# New
cd backend/packages/serverless/terraform
```

**Backend Build:**
```bash
# From root
npm run build:backend

# Or from backend directory
cd backend && npm run build
```

### 3. Update CI/CD Pipelines

If you have custom CI/CD configurations, update paths:
- `packages/serverless/` → `backend/packages/serverless/`
- `scripts/` → `backend/scripts/`

The main `.github/workflows/ci.yml` has already been updated.

### 4. Update Documentation References

If you have internal documentation referencing:
- Deployment scripts: Update to `backend/scripts/`
- Serverless code: Update to `backend/packages/serverless/`
- Deployment docs: Update to `backend/DEPLOYMENT.md`

## Benefits of This Change

1. **Clear Separation**: Frontend and backend are now clearly separated
2. **Independent Development**: Frontend and backend can be developed independently
3. **Easier Deployment**: Backend can be deployed separately from frontend
4. **Better Organization**: Related backend files are grouped together
5. **Scalability**: Easier to add more backend services or frontend applications

## Troubleshooting

### Import Errors for `@vlo/shared-types`

If you see import errors for shared types:
```bash
# Reinstall dependencies
npm install
cd backend && npm install
```

### Terraform State Issues

Terraform state is not affected by this change. Your existing deployments will continue to work.

### Path Not Found Errors

Double-check that you're using the new paths:
- Backend scripts: `backend/scripts/`
- Serverless code: `backend/packages/serverless/`
- Deployment docs: `backend/DEPLOYMENT.md`

## Questions?

See the updated [README.md](./README.md) or [backend/README.md](./backend/README.md) for more information.
