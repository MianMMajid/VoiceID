# VoiceLiveness Onboarder - Setup Guide

## Prerequisites Installed ✓

- ✅ Terraform v1.5.7
- ✅ AWS CLI v2.31.27
- ✅ Node.js (already installed)
- ✅ Environment variables configured

## Next Steps

### 1. Configure AWS Credentials

You need to configure AWS CLI with your AWS account credentials:

```bash
aws configure
```

You'll be prompted for:
- **AWS Access Key ID**: Get from AWS IAM Console
- **AWS Secret Access Key**: Get from AWS IAM Console
- **Default region**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

#### Getting AWS Credentials

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → Your username → "Security credentials"
3. Click "Create access key"
4. Choose "Command Line Interface (CLI)"
5. Copy the Access Key ID and Secret Access Key

### 2. Load Environment Variables

```bash
source ./scripts/load-env.sh
```

This loads your API keys from `.env` file.

### 3. Set Up Terraform Backend (First Time Only)

For development environment:

```bash
./scripts/setup-terraform-backend.sh dev
```

This creates:
- S3 bucket for Terraform state
- DynamoDB table for state locking
- Enables versioning and encryption

### 4. Build the Project

```bash
npm install
npm run build
```

### 5. Deploy to AWS

#### Option A: Using Deployment Script (Recommended)

```bash
./scripts/deploy.sh dev
```

#### Option B: Manual Deployment

```bash
# Navigate to terraform directory
cd packages/serverless/terraform

# Initialize Terraform
terraform init -backend-config=environments/backend-dev.hcl

# Plan deployment
terraform plan -var-file=environments/dev.tfvars -out=tfplan

# Apply deployment
terraform apply tfplan
```

### 6. Verify Deployment

After deployment completes:

```bash
# Get API Gateway URL
cd packages/serverless/terraform
terraform output api_gateway_url

# Run smoke tests
API_URL=$(terraform output -raw api_gateway_url)
cd ../../..
./scripts/smoke-test.sh "$API_URL"
```

## Troubleshooting

### AWS Credentials Not Found

If you see "Unable to locate credentials":
```bash
aws configure
# Enter your credentials
```

### Terraform State Lock

If Terraform state is locked:
```bash
terraform force-unlock <lock-id>
```

### Permission Errors

Ensure your IAM user has these permissions:
- Lambda: Full access
- API Gateway: Full access
- DynamoDB: Full access
- S3: Full access
- CloudFront: Full access
- CloudWatch: Full access
- Secrets Manager: Full access
- IAM: Limited access for role creation

## Quick Reference

### Environment Variables
```bash
# Load from .env file
source ./scripts/load-env.sh

# Or set manually
export TF_VAR_openai_api_key="your-key"
export TF_VAR_elevenlabs_api_key="your-key"
export TF_VAR_alert_email="your-email"
```

### Terraform Commands
```bash
# Initialize
terraform init

# Plan changes
terraform plan -var-file=environments/dev.tfvars

# Apply changes
terraform apply -var-file=environments/dev.tfvars

# Destroy resources
terraform destroy -var-file=environments/dev.tfvars

# Show outputs
terraform output
```

### AWS CLI Commands
```bash
# Check configuration
aws configure list

# Test credentials
aws sts get-caller-identity

# List S3 buckets
aws s3 ls

# List Lambda functions
aws lambda list-functions
```

## Next Steps After Deployment

1. Check CloudWatch Dashboard (URL in terraform output)
2. Monitor CloudWatch Logs
3. Test API endpoints
4. Review CloudWatch Alarms
5. Run integration tests

## Documentation

- [Deployment Guide](DEPLOYMENT.md) - Detailed deployment instructions
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist
- [E2E Testing](E2E_TESTING.md) - End-to-end testing guide
- [Terraform README](packages/serverless/terraform/README.md) - Infrastructure details

## Support

For issues:
1. Check CloudWatch logs
2. Review this setup guide
3. Consult DEPLOYMENT.md
4. Check Terraform state
