# VoiceLiveness Onboarder - Deployment Guide

This guide covers the complete deployment process for the VLO system across all environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Process](#deployment-process)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Node.js**: v20.x or later
- **npm**: v10.x or later
- **Terraform**: v1.6.0 or later
- **AWS CLI**: v2.x or later
- **Docker**: v24.x or later (for spoof detector container)
- **Git**: v2.x or later

### AWS Account Setup

1. **AWS Account**: Access to AWS account with appropriate permissions
2. **IAM User/Role**: IAM user or role with the following permissions:
   - Lambda: Full access
   - API Gateway: Full access
   - DynamoDB: Full access
   - S3: Full access
   - CloudFront: Full access
   - CloudWatch: Full access
   - Secrets Manager: Full access
   - IAM: Limited access for role creation

3. **AWS CLI Configuration**:
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Enter default region (e.g., us-east-1)
   # Enter default output format (json)
   ```

### API Keys

Obtain API keys for external services:
- **ElevenLabs API Key**: For TTS and synthetic voice detection
- **OpenAI API Key**: For Whisper STT

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/voice-liveness-onboarder.git
cd voice-liveness-onboarder
```

### 2. Install Dependencies

```bash
npm ci
```

### 3. Run Tests

```bash
npm test
```

### 4. Build Packages

```bash
npm run build
```

### 5. Set Up Terraform Backend

For each environment (dev, staging, prod):

```bash
# Development
./scripts/setup-terraform-backend.sh dev

# Staging
./scripts/setup-terraform-backend.sh staging

# Production
./scripts/setup-terraform-backend.sh prod
```

This creates:
- S3 bucket for Terraform state
- DynamoDB table for state locking
- Enables versioning and encryption

## Environment Configuration

### Development Environment

**Purpose**: Active development and testing

**Configuration**: `packages/serverless/terraform/environments/dev.tfvars`

**Characteristics**:
- Pay-per-request DynamoDB billing
- No provisioned concurrency
- 7-day log retention
- Minimal backup retention
- Debug logging enabled

**Secrets**:
```bash
export TF_VAR_elevenlabs_api_key="your-dev-key"
export TF_VAR_openai_api_key="your-dev-key"
export TF_VAR_alert_email="dev-alerts@example.com"
```

### Staging Environment

**Purpose**: Pre-production testing and validation

**Configuration**: `packages/serverless/terraform/environments/staging.tfvars`

**Characteristics**:
- Pay-per-request DynamoDB billing
- No provisioned concurrency
- 14-day log retention
- 14-day backup retention
- Info logging

**Secrets**:
```bash
export TF_VAR_elevenlabs_api_key="your-staging-key"
export TF_VAR_openai_api_key="your-staging-key"
export TF_VAR_alert_email="staging-alerts@example.com"
```

### Production Environment

**Purpose**: Live production system

**Configuration**: `packages/serverless/terraform/environments/prod.tfvars`

**Characteristics**:
- Pay-per-request DynamoDB billing with auto-scaling
- Provisioned concurrency enabled
- 90-day log retention
- 90-day backup retention
- Info logging
- DynamoDB streams enabled

**Secrets**:
```bash
export TF_VAR_elevenlabs_api_key="your-prod-key"
export TF_VAR_openai_api_key="your-prod-key"
export TF_VAR_alert_email="prod-alerts@example.com"
```

## Deployment Process

### Option 1: Automated Deployment (Recommended)

Use the deployment script:

```bash
# Deploy to development
./scripts/deploy.sh dev

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production (requires confirmation)
./scripts/deploy.sh prod
```

The script will:
1. Check prerequisites
2. Install dependencies
3. Run tests
4. Build packages
5. Create Lambda deployment packages
6. Initialize Terraform
7. Plan changes
8. Apply changes (with confirmation for prod)
9. Run smoke tests
10. Display deployment summary

### Option 2: Manual Deployment

#### Step 1: Prepare Lambda Packages

```bash
cd packages/serverless
npm run build

# Create Lambda function package
zip -r dist/lambda.zip dist/ node_modules/ package.json

# Create Lambda layer package
mkdir -p layer/nodejs
cp -r node_modules layer/nodejs/
cd layer && zip -r ../dist/layer.zip . && cd ..
rm -rf layer
```

#### Step 2: Initialize Terraform

```bash
cd packages/serverless/terraform

# For development
terraform init -backend-config=environments/backend-dev.hcl

# For staging
terraform init -backend-config=environments/backend-staging.hcl -reconfigure

# For production
terraform init -backend-config=environments/backend-prod.hcl -reconfigure
```

#### Step 3: Plan Deployment

```bash
# Set environment variables for secrets
export TF_VAR_elevenlabs_api_key="your-key"
export TF_VAR_openai_api_key="your-key"
export TF_VAR_alert_email="alerts@example.com"

# Run plan
terraform plan -var-file=environments/dev.tfvars -out=tfplan
```

Review the plan carefully before proceeding.

#### Step 4: Apply Changes

```bash
terraform apply tfplan
```

#### Step 5: Verify Deployment

```bash
# Get outputs
terraform output

# Run smoke tests
API_URL=$(terraform output -raw api_gateway_url)
../../scripts/smoke-test.sh "$API_URL"
```

### Option 3: CI/CD Deployment

Use GitHub Actions workflows:

#### Development
Push to `develop` branch triggers automatic deployment.

#### Staging
Push to `main` branch triggers automatic deployment.

#### Production
1. Create version tag: `git tag -a v1.0.0 -m "Release 1.0.0"`
2. Push tag: `git push origin v1.0.0`
3. Go to GitHub Actions > Deploy to Production
4. Click "Run workflow"
5. Enter version tag (e.g., v1.0.0)
6. Approve deployment (requires 2 approvers)

## Post-Deployment Verification

### 1. Check CloudWatch Dashboard

```bash
# Get dashboard URL
cd packages/serverless/terraform
terraform output dashboard_url
```

Monitor:
- API Gateway request count and errors
- Lambda invocations and errors
- DynamoDB capacity consumption
- Recent error logs

### 2. Run Smoke Tests

```bash
API_URL=$(cd packages/serverless/terraform && terraform output -raw api_gateway_url)
./scripts/smoke-test.sh "$API_URL"
```

### 3. Check CloudWatch Logs

```bash
# API Gateway logs
aws logs tail /aws/apigateway/dev-vlo-api --follow

# Lambda function logs
aws logs tail /aws/lambda/dev-vlo-session-creator --follow
aws logs tail /aws/lambda/dev-vlo-audio-processor --follow
aws logs tail /aws/lambda/dev-vlo-verification-orchestrator --follow
aws logs tail /aws/lambda/dev-vlo-spoof-detector --follow
```

### 4. Verify DynamoDB Tables

```bash
# List tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `vlo`)]'

# Check table status
aws dynamodb describe-table --table-name dev-vlo-sessions --query 'Table.TableStatus'
aws dynamodb describe-table --table-name dev-vlo-audit-logs --query 'Table.TableStatus'
```

### 5. Test API Endpoints

```bash
# Create session (requires authentication)
curl -X POST "$API_URL/api/v1/sessions" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'

# Get session
curl -X GET "$API_URL/api/v1/sessions/session-id"
```

### 6. Monitor CloudWatch Alarms

```bash
# List alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix "dev-vlo" \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```

## Rollback Procedures

### Automatic Rollback (CI/CD)

Production deployments automatically rollback if:
- Smoke tests fail
- Health checks fail during monitoring

### Manual Rollback

#### Option 1: Using Rollback Script (GitHub Actions)

1. Go to GitHub Actions > Rollback Deployment
2. Click "Run workflow"
3. Select environment
4. Optionally specify Lambda version
5. Click "Run workflow"

#### Option 2: Using Terraform

```bash
cd packages/serverless/terraform

# Checkout previous version
git checkout <previous-commit>

# Reinitialize Terraform
terraform init -backend-config=environments/backend-prod.hcl -reconfigure

# Plan rollback
terraform plan -var-file=environments/prod.tfvars -out=tfplan

# Apply rollback
terraform apply tfplan
```

#### Option 3: Lambda Version Rollback

```bash
# List Lambda versions
aws lambda list-versions-by-function \
  --function-name prod-vlo-verification-orchestrator

# Update alias to previous version
aws lambda update-alias \
  --function-name prod-vlo-verification-orchestrator \
  --name live \
  --function-version <previous-version>
```

### Rollback Verification

After rollback:
1. Run smoke tests
2. Check CloudWatch metrics
3. Monitor error rates
4. Verify API functionality

## Troubleshooting

### Deployment Failures

#### Terraform State Lock

**Problem**: Terraform state is locked

**Solution**:
```bash
# List locks
aws dynamodb scan --table-name vlo-terraform-locks-dev

# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

#### Lambda Package Too Large

**Problem**: Lambda deployment package exceeds size limit

**Solution**:
- Use Lambda layers for dependencies
- Remove unnecessary files from package
- Use webpack to bundle and minify code

#### IAM Permission Errors

**Problem**: Insufficient IAM permissions

**Solution**:
- Review IAM role policies
- Ensure role has necessary permissions
- Check trust relationships

### Runtime Issues

#### Lambda Cold Starts

**Problem**: High latency on first invocation

**Solution**:
- Enable provisioned concurrency (production)
- Optimize package size
- Use Lambda layers
- Implement function warming

#### DynamoDB Throttling

**Problem**: Read/write throttling errors

**Solution**:
- Switch to PAY_PER_REQUEST mode
- Enable auto-scaling
- Review access patterns
- Add GSIs for common queries

#### API Gateway Errors

**Problem**: 5xx errors from API Gateway

**Solution**:
- Check Lambda function logs
- Verify Lambda permissions
- Check Lambda timeout settings
- Review CloudWatch metrics

### Monitoring Issues

#### Missing Metrics

**Problem**: CloudWatch metrics not appearing

**Solution**:
- Verify CloudWatch agent is running
- Check IAM permissions for CloudWatch
- Ensure metrics are being published
- Wait for metric aggregation (up to 5 minutes)

#### Alarm Not Triggering

**Problem**: CloudWatch alarm not triggering

**Solution**:
- Verify alarm configuration
- Check metric data points
- Review evaluation periods
- Test alarm with manual metric

## Best Practices

### Pre-Deployment

- [ ] Run all tests locally
- [ ] Review Terraform plan carefully
- [ ] Backup current state
- [ ] Notify team of deployment
- [ ] Schedule deployment during low-traffic period (production)

### During Deployment

- [ ] Monitor CloudWatch dashboard
- [ ] Watch for errors in logs
- [ ] Check API Gateway metrics
- [ ] Verify Lambda invocations

### Post-Deployment

- [ ] Run smoke tests
- [ ] Monitor for 15-30 minutes
- [ ] Check error rates
- [ ] Verify all alarms are green
- [ ] Document any issues
- [ ] Update deployment log

### Production Deployments

- [ ] Deploy to staging first
- [ ] Run full integration tests in staging
- [ ] Get approval from stakeholders
- [ ] Schedule maintenance window
- [ ] Have rollback plan ready
- [ ] Monitor closely for 1 hour post-deployment

## Additional Resources

- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)

## Support

For deployment issues:
1. Check CloudWatch logs
2. Review Terraform state
3. Consult this guide
4. Contact DevOps team
5. Create incident ticket

## Changelog

Track deployment history:

```bash
# View deployment tags
git tag -l "deployed-*"

# View deployment details
git show deployed-prod-20240101-120000
```
