# VLO CI/CD Pipeline

This directory contains GitHub Actions workflows for automated build, test, and deployment of the VoiceLiveness Onboarder system.

## Workflows

### 1. CI - Build and Test (`ci.yml`)

**Trigger**: Push or PR to `main` or `develop` branches

**Jobs**:
- **Test**: Runs unit tests across Node.js versions
- **Build**: Builds all packages and creates Lambda deployment artifacts
- **Security Scan**: Runs Trivy vulnerability scanner and npm audit

**Artifacts**:
- Lambda deployment packages (7-day retention)
- Client build artifacts (7-day retention)

### 2. Deploy to Development (`deploy-dev.yml`)

**Trigger**: Push to `develop` branch or manual dispatch

**Environment**: `development`

**Steps**:
1. Run tests
2. Build packages
3. Create Lambda deployment packages
4. Initialize Terraform with dev backend
5. Plan and apply Terraform changes
6. Run smoke tests
7. Notify via Slack

**Required Secrets**:
- `AWS_ROLE_ARN_DEV`: AWS IAM role for dev deployment
- `ELEVENLABS_API_KEY_DEV`: ElevenLabs API key
- `OPENAI_API_KEY_DEV`: OpenAI API key
- `ALERT_EMAIL_DEV`: Email for CloudWatch alerts
- `SLACK_WEBHOOK`: Slack webhook URL

### 3. Deploy to Staging (`deploy-staging.yml`)

**Trigger**: Push to `main` branch or manual dispatch

**Environment**: `staging`

**Steps**:
1. Run tests
2. Build packages
3. Create Lambda deployment packages
4. Initialize Terraform with staging backend
5. Plan and apply Terraform changes
6. Run smoke tests
7. Run integration tests
8. Notify via Slack

**Required Secrets**:
- `AWS_ROLE_ARN_STAGING`: AWS IAM role for staging deployment
- `ELEVENLABS_API_KEY_STAGING`: ElevenLabs API key
- `OPENAI_API_KEY_STAGING`: OpenAI API key
- `ALERT_EMAIL_STAGING`: Email for CloudWatch alerts
- `SLACK_WEBHOOK`: Slack webhook URL

### 4. Deploy to Production (`deploy-prod.yml`)

**Trigger**: Manual dispatch only (requires version input)

**Environment**: `production`

**Steps**:
1. Checkout specific version tag
2. Run tests
3. Build packages
4. Backup current Lambda versions
5. Initialize Terraform with prod backend
6. Plan Terraform changes
7. **Manual approval checkpoint** (requires 2 approvers)
8. Apply Terraform changes (blue-green deployment)
9. Run smoke tests
10. Monitor deployment for 5 minutes
11. Create deployment tag
12. Notify via Slack
13. Rollback on failure

**Required Secrets**:
- `AWS_ROLE_ARN_PROD`: AWS IAM role for prod deployment
- `ELEVENLABS_API_KEY_PROD`: ElevenLabs API key
- `OPENAI_API_KEY_PROD`: OpenAI API key
- `ALERT_EMAIL_PROD`: Email for CloudWatch alerts
- `PROD_APPROVERS`: GitHub usernames for approval (comma-separated)
- `SLACK_WEBHOOK`: Slack webhook URL

### 5. Rollback Deployment (`rollback.yml`)

**Trigger**: Manual dispatch only

**Inputs**:
- `environment`: Environment to rollback (dev/staging/prod)
- `lambda_version`: Specific version to rollback to (optional)

**Steps**:
1. Get list of Lambda functions
2. Rollback to previous or specified version
3. Verify rollback
4. Run smoke tests
5. Notify via Slack

## Setup Instructions

### 1. Configure AWS IAM Roles

Create IAM roles for GitHub Actions OIDC:

```bash
# Create trust policy for GitHub Actions
cat > github-actions-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:*"
        }
      }
    }
  ]
}
EOF

# Create role for each environment
aws iam create-role \
  --role-name GitHubActionsVLODev \
  --assume-role-policy-document file://github-actions-trust-policy.json

# Attach necessary policies
aws iam attach-role-policy \
  --role-name GitHubActionsVLODev \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```

### 2. Configure GitHub Secrets

Navigate to repository Settings > Secrets and variables > Actions:

**Development**:
- `AWS_ROLE_ARN_DEV`: `arn:aws:iam::ACCOUNT_ID:role/GitHubActionsVLODev`
- `ELEVENLABS_API_KEY_DEV`: Your ElevenLabs API key
- `OPENAI_API_KEY_DEV`: Your OpenAI API key
- `ALERT_EMAIL_DEV`: Email for alerts

**Staging**:
- `AWS_ROLE_ARN_STAGING`: `arn:aws:iam::ACCOUNT_ID:role/GitHubActionsVLOStaging`
- `ELEVENLABS_API_KEY_STAGING`: Your ElevenLabs API key
- `OPENAI_API_KEY_STAGING`: Your OpenAI API key
- `ALERT_EMAIL_STAGING`: Email for alerts

**Production**:
- `AWS_ROLE_ARN_PROD`: `arn:aws:iam::ACCOUNT_ID:role/GitHubActionsVLOProd`
- `ELEVENLABS_API_KEY_PROD`: Your ElevenLabs API key
- `OPENAI_API_KEY_PROD`: Your OpenAI API key
- `ALERT_EMAIL_PROD`: Email for alerts
- `PROD_APPROVERS`: `user1,user2` (GitHub usernames)

**Shared**:
- `SLACK_WEBHOOK`: Slack webhook URL for notifications
- `CODECOV_TOKEN`: Codecov token for coverage reports

### 3. Configure GitHub Environments

Navigate to repository Settings > Environments:

Create three environments:
- `development` (no protection rules)
- `staging` (optional: require reviewers)
- `production` (require reviewers, deployment branches: main only)

### 4. Create Terraform State Backend

Before first deployment, create S3 buckets and DynamoDB tables:

```bash
# Run for each environment (dev, staging, prod)
./scripts/setup-terraform-backend.sh dev
./scripts/setup-terraform-backend.sh staging
./scripts/setup-terraform-backend.sh prod
```

## Deployment Flow

### Development Deployment

```
develop branch push → CI tests → Build → Deploy to Dev → Smoke tests
```

### Staging Deployment

```
main branch push → CI tests → Build → Deploy to Staging → Integration tests
```

### Production Deployment

```
Manual trigger → Select version → CI tests → Build → Manual approval → Deploy to Prod → Monitor → Tag
```

## Blue-Green Deployment Strategy

Production deployments use a blue-green strategy:

1. **Blue (Current)**: Existing Lambda functions with alias `live`
2. **Green (New)**: New Lambda version deployed
3. **Switch**: Update alias to point to new version
4. **Rollback**: If issues detected, update alias back to previous version

## Rollback Procedures

### Automatic Rollback

Production deployment automatically rolls back if:
- Smoke tests fail
- Health checks fail during monitoring period

### Manual Rollback

Use the rollback workflow:

1. Go to Actions > Rollback Deployment
2. Click "Run workflow"
3. Select environment
4. Optionally specify version
5. Click "Run workflow"

## Monitoring Deployments

### CloudWatch Dashboards

After deployment, monitor via CloudWatch:
- API Gateway metrics (requests, errors, latency)
- Lambda metrics (invocations, errors, duration)
- DynamoDB metrics (capacity, throttles)

### Slack Notifications

All deployments send notifications to Slack:
- ✅ Success: Green message with deployment details
- ❌ Failure: Red message with error information

## Best Practices

### Branch Strategy

- `develop`: Development branch, auto-deploys to dev
- `main`: Stable branch, auto-deploys to staging
- `v*` tags: Production releases

### Version Tagging

Create version tags for production releases:

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### Testing Before Deployment

Always run tests locally before pushing:

```bash
npm test
npm run build
```

### Secrets Rotation

Rotate secrets regularly:

1. Update secret in GitHub Actions
2. Update secret in AWS Secrets Manager
3. Redeploy affected environments

## Troubleshooting

### Deployment Fails at Terraform Apply

- Check Terraform state lock in DynamoDB
- Verify AWS credentials and permissions
- Review Terraform plan output

### Lambda Functions Not Updating

- Verify Lambda package was created correctly
- Check Lambda function logs in CloudWatch
- Ensure IAM role has necessary permissions

### Smoke Tests Failing

- Check API Gateway endpoint URL
- Verify Lambda functions are deployed
- Review CloudWatch logs for errors

### State Lock Issues

If Terraform state is locked:

```bash
# List locks
aws dynamodb scan --table-name vlo-terraform-locks-dev

# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

## Security Considerations

- Use OIDC for AWS authentication (no long-lived credentials)
- Store secrets in GitHub Secrets (encrypted at rest)
- Require manual approval for production deployments
- Limit IAM role permissions to minimum required
- Enable branch protection rules
- Require code review before merging

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS OIDC with GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
