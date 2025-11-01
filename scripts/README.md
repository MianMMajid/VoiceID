# VLO Deployment Scripts

This directory contains scripts for deploying and managing the VoiceLiveness Onboarder infrastructure.

## Scripts

### setup-terraform-backend.sh

Sets up the Terraform backend infrastructure (S3 bucket and DynamoDB table for state management).

**Usage**:
```bash
./setup-terraform-backend.sh <environment>
```

**Example**:
```bash
./setup-terraform-backend.sh dev
./setup-terraform-backend.sh staging
./setup-terraform-backend.sh prod
```

**What it does**:
- Creates S3 bucket for Terraform state
- Enables versioning on the bucket
- Enables encryption on the bucket
- Blocks public access
- Creates DynamoDB table for state locking
- Enables point-in-time recovery on the table

**Prerequisites**:
- AWS CLI configured
- Appropriate AWS permissions

### deploy.sh

Complete deployment script that handles the entire deployment process.

**Usage**:
```bash
./deploy.sh <environment>
```

**Example**:
```bash
./deploy.sh dev
./deploy.sh staging
./deploy.sh prod  # Requires confirmation
```

**What it does**:
1. Checks prerequisites (Node.js, npm, Terraform, AWS CLI)
2. Verifies AWS credentials
3. Installs dependencies
4. Runs tests
5. Builds packages
6. Creates Lambda deployment packages
7. Initializes Terraform
8. Plans Terraform changes
9. Applies changes (with confirmation for production)
10. Runs smoke tests
11. Displays deployment summary

**Prerequisites**:
- All development tools installed
- AWS CLI configured
- Terraform backend set up
- Environment variables set for secrets

**Environment Variables**:
```bash
export TF_VAR_elevenlabs_api_key="your-key"
export TF_VAR_openai_api_key="your-key"
export TF_VAR_alert_email="alerts@example.com"
export AWS_REGION="us-east-1"  # Optional, defaults to us-east-1
```

### smoke-test.sh

Runs smoke tests against a deployed API Gateway endpoint.

**Usage**:
```bash
./smoke-test.sh <api-gateway-url>
```

**Example**:
```bash
./smoke-test.sh https://abc123.execute-api.us-east-1.amazonaws.com/dev
```

**What it tests**:
- Health check endpoint
- API Gateway accessibility
- CORS preflight requests
- Create session endpoint
- Get session endpoint
- Submit audio endpoint
- Get result endpoint

**Exit codes**:
- `0`: All tests passed
- `1`: One or more tests failed

## Workflow

### Initial Setup

1. Set up Terraform backend for each environment:
   ```bash
   ./setup-terraform-backend.sh dev
   ./setup-terraform-backend.sh staging
   ./setup-terraform-backend.sh prod
   ```

### Development Deployment

1. Set environment variables:
   ```bash
   export TF_VAR_elevenlabs_api_key="dev-key"
   export TF_VAR_openai_api_key="dev-key"
   export TF_VAR_alert_email="dev@example.com"
   ```

2. Deploy:
   ```bash
   ./deploy.sh dev
   ```

3. Run smoke tests:
   ```bash
   API_URL=$(cd ../packages/serverless/terraform && terraform output -raw api_gateway_url)
   ./smoke-test.sh "$API_URL"
   ```

### Staging Deployment

1. Set environment variables:
   ```bash
   export TF_VAR_elevenlabs_api_key="staging-key"
   export TF_VAR_openai_api_key="staging-key"
   export TF_VAR_alert_email="staging@example.com"
   ```

2. Deploy:
   ```bash
   ./deploy.sh staging
   ```

3. Run smoke tests and integration tests

### Production Deployment

1. Set environment variables:
   ```bash
   export TF_VAR_elevenlabs_api_key="prod-key"
   export TF_VAR_openai_api_key="prod-key"
   export TF_VAR_alert_email="prod@example.com"
   ```

2. Deploy (requires confirmation):
   ```bash
   ./deploy.sh prod
   ```

3. Monitor deployment closely

## Troubleshooting

### Script Permission Denied

If you get a permission denied error:
```bash
chmod +x scripts/*.sh
```

### AWS Credentials Not Found

Configure AWS CLI:
```bash
aws configure
```

### Terraform State Lock

If Terraform state is locked:
```bash
# List locks
aws dynamodb scan --table-name vlo-terraform-locks-dev

# Force unlock (use with caution)
cd packages/serverless/terraform
terraform force-unlock <lock-id>
```

### Smoke Tests Failing

Check:
- API Gateway is deployed
- Lambda functions are active
- CloudWatch logs for errors
- IAM permissions

## Best Practices

1. **Always test locally first**: Run `npm test` before deploying
2. **Review Terraform plan**: Always review the plan before applying
3. **Deploy to dev first**: Test in development before staging/production
4. **Monitor after deployment**: Watch CloudWatch for 15-30 minutes
5. **Use version tags**: Tag production releases for easy rollback
6. **Keep secrets secure**: Never commit secrets to version control
7. **Document changes**: Update changelog and deployment log

## Additional Resources

- [Deployment Guide](../DEPLOYMENT.md)
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
- [Terraform README](../packages/serverless/terraform/README.md)
- [CI/CD Workflows](../.github/workflows/README.md)
