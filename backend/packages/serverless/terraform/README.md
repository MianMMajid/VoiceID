# VoiceLiveness Onboarder - Terraform Infrastructure

This directory contains comprehensive Terraform configurations for deploying the complete VLO serverless infrastructure on AWS.

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured with appropriate credentials
- AWS account with necessary permissions
- Docker (for building Lambda container images)

## Architecture Overview

The infrastructure includes:

- **API Gateway**: REST API with rate limiting and CORS
- **Lambda Functions**: Session creator, audio processor, verification orchestrator, spoof detector
- **DynamoDB**: Sessions and audit logs tables with auto-scaling
- **S3 + CloudFront**: Audio storage and CDN delivery
- **CloudWatch**: Monitoring, logging, and alerting
- **Secrets Manager**: API keys and secrets
- **AWS Backup**: Automated backups for DynamoDB

## Quick Start

### 1. Prepare Backend State Storage

First, create S3 buckets and DynamoDB tables for Terraform state:

```bash
# Create state bucket and lock table for dev environment
aws s3 mb s3://vlo-terraform-state-dev --region us-east-1
aws dynamodb create-table \
  --table-name vlo-terraform-locks-dev \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Enable versioning on state bucket
aws s3api put-bucket-versioning \
  --bucket vlo-terraform-state-dev \
  --versioning-configuration Status=Enabled
```

Repeat for staging and prod environments.

### 2. Build Lambda Packages

```bash
# From the serverless package directory
cd packages/serverless
npm run build

# Create deployment package
zip -r dist/lambda.zip dist/ node_modules/ package.json

# Create layer package (shared dependencies)
mkdir -p layer/nodejs
cp -r node_modules layer/nodejs/
cd layer && zip -r ../dist/layer.zip . && cd ..
```

### 3. Initialize Terraform

```bash
cd terraform

# Initialize with dev backend
terraform init -backend-config=environments/backend-dev.hcl
```

### 4. Configure Secrets

Set API keys as environment variables or use `-var` flags:

```bash
export TF_VAR_elevenlabs_api_key="your-elevenlabs-key"
export TF_VAR_openai_api_key="your-openai-key"
export TF_VAR_alert_email="alerts@example.com"
```

### 5. Deploy Infrastructure

```bash
# Review the plan
terraform plan -var-file=environments/dev.tfvars

# Apply the configuration
terraform apply -var-file=environments/dev.tfvars
```

## Multi-Environment Deployment

### Development Environment

```bash
terraform init -backend-config=environments/backend-dev.hcl
terraform apply -var-file=environments/dev.tfvars
```

### Staging Environment

```bash
terraform init -backend-config=environments/backend-staging.hcl -reconfigure
terraform apply -var-file=environments/staging.tfvars
```

### Production Environment

```bash
terraform init -backend-config=environments/backend-prod.hcl -reconfigure
terraform apply -var-file=environments/prod.tfvars
```

## Configuration Files

### Environment Variables Files

- `environments/dev.tfvars`: Development configuration
- `environments/staging.tfvars`: Staging configuration
- `environments/prod.tfvars`: Production configuration

### Backend Configuration Files

- `environments/backend-dev.hcl`: Dev state backend
- `environments/backend-staging.hcl`: Staging state backend
- `environments/backend-prod.hcl`: Production state backend

## Key Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `environment` | Environment name | `dev` |
| `aws_region` | AWS region | `us-east-1` |
| `lambda_memory_size` | Lambda memory (MB) | `512` |
| `dynamodb_billing_mode` | DynamoDB billing | `PAY_PER_REQUEST` |
| `enable_backup` | Enable AWS Backup | `true` |
| `enable_provisioned_concurrency` | Enable Lambda provisioned concurrency | `false` |
| `audio_retention_days` | Audio retention period | `90` |
| `alert_email` | Email for alerts | `""` |

## Outputs

After deployment, Terraform outputs:

```bash
# View all outputs
terraform output

# Specific outputs
terraform output api_gateway_url
terraform output cdn_domain_name
terraform output audio_bucket_name
```

Key outputs:
- `api_gateway_url`: API Gateway endpoint
- `cdn_domain_name`: CloudFront distribution domain
- `sessions_table_name`: DynamoDB sessions table
- `audit_logs_table_name`: DynamoDB audit logs table
- `dashboard_url`: CloudWatch dashboard URL

## Resources Created

### Compute
- 4 Lambda functions (session creator, audio processor, verification orchestrator, spoof detector)
- Lambda layers for shared dependencies
- CloudWatch Log Groups with retention policies

### Storage
- DynamoDB tables: sessions, audit logs (with GSIs, TTL, encryption)
- S3 bucket for audio storage (with lifecycle policies, versioning, encryption)
- AWS Backup vault and plans

### Networking & API
- API Gateway REST API with custom domain support
- CloudFront CDN distribution with signed URLs
- API Gateway usage plans and rate limiting

### Security
- IAM roles and policies for Lambda execution
- Secrets Manager secrets for API keys
- KMS encryption (optional)

### Monitoring
- CloudWatch alarms for errors, latency, throttling
- CloudWatch Dashboard
- SNS topic for alerts
- Custom metrics and log filters

## Security Features

- **Encryption**: TLS 1.3 for API Gateway, AES-256 for S3, KMS for DynamoDB
- **Authentication**: JWT tokens, API keys, signed URLs
- **Rate Limiting**: Per-user and per-IP limits
- **Audit Logging**: Tamper-evident logs with 90-day retention
- **Backup**: Automated daily backups with point-in-time recovery

## Auto-Scaling

### Lambda
- Automatic scaling based on demand
- Optional provisioned concurrency for production
- Reserved concurrent executions

### DynamoDB
- PAY_PER_REQUEST mode (default) for automatic scaling
- PROVISIONED mode with auto-scaling policies (optional)
- Target tracking at 70% capacity utilization

## Monitoring & Alerting

### CloudWatch Alarms

- API Gateway 5xx errors
- API Gateway latency > 10s
- Lambda errors and throttles
- Lambda duration > 10s
- DynamoDB throttles
- Fraud attempt spikes

### Dashboard

Access the CloudWatch dashboard via the `dashboard_url` output.

Metrics tracked:
- API request count and errors
- API latency (avg, p95, p99)
- Lambda invocations, errors, duration
- DynamoDB capacity consumption
- Recent error logs

## Backup & Disaster Recovery

### Automated Backups

- Daily backups at 2 AM UTC
- Configurable retention (default: 30 days for staging, 90 days for prod)
- Point-in-time recovery enabled

### Manual Backup

```bash
# Create on-demand backup
aws dynamodb create-backup \
  --table-name dev-vlo-sessions \
  --backup-name manual-backup-$(date +%Y%m%d)
```

### Restore from Backup

```bash
# List available backups
aws dynamodb list-backups --table-name dev-vlo-sessions

# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name dev-vlo-sessions-restored \
  --backup-arn <backup-arn>
```

## Cost Optimization

### Development
- PAY_PER_REQUEST billing mode
- No provisioned concurrency
- 7-day log retention
- Minimal backup retention

### Production
- Provisioned concurrency for critical functions
- 90-day log retention
- Comprehensive backups
- CloudFront caching to reduce origin requests

## Maintenance

### Updating Infrastructure

```bash
# Review changes
terraform plan -var-file=environments/prod.tfvars

# Apply changes
terraform apply -var-file=environments/prod.tfvars
```

### Updating Lambda Code

```bash
# Rebuild and redeploy
npm run build
zip -r dist/lambda.zip dist/ node_modules/ package.json
terraform apply -var-file=environments/prod.tfvars
```

### Rotating Secrets

```bash
# Update secret in Secrets Manager
aws secretsmanager update-secret \
  --secret-id prod-vlo-elevenlabs-api-key \
  --secret-string "new-api-key"

# Lambda functions will pick up new secret on next invocation
```

### Destroying Infrastructure

```bash
# Review what will be destroyed
terraform plan -destroy -var-file=environments/dev.tfvars

# Destroy all resources
terraform destroy -var-file=environments/dev.tfvars
```

**Warning**: This will permanently delete all resources including data in S3 and DynamoDB.

## Troubleshooting

### Lambda Cold Starts

- Enable provisioned concurrency in production
- Optimize package size
- Use Lambda layers for dependencies

### DynamoDB Throttling

- Switch to PAY_PER_REQUEST mode
- Enable auto-scaling for PROVISIONED mode
- Review access patterns and indexes

### API Gateway Errors

- Check CloudWatch logs: `/aws/apigateway/{environment}-vlo-api`
- Review Lambda function logs
- Verify IAM permissions

### State Lock Issues

```bash
# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

## Additional Resources

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway Security](https://docs.aws.amazon.com/apigateway/latest/developerguide/security.html)
