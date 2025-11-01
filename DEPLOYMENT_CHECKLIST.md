# VLO Deployment Checklist

Use this checklist to ensure all steps are completed for a successful deployment.

## Pre-Deployment Checklist

### Development Environment

- [ ] AWS account configured with appropriate credentials
- [ ] Node.js v20.x installed
- [ ] Terraform v1.6.0+ installed
- [ ] AWS CLI v2.x installed
- [ ] Docker installed (for spoof detector container)
- [ ] Repository cloned and dependencies installed
- [ ] All tests passing locally (`npm test`)
- [ ] Build successful (`npm run build`)

### API Keys and Secrets

- [ ] ElevenLabs API key obtained
- [ ] OpenAI API key obtained
- [ ] Alert email configured
- [ ] Secrets stored securely (not in version control)

### Terraform Backend

- [ ] S3 bucket created for Terraform state (dev)
- [ ] S3 bucket created for Terraform state (staging)
- [ ] S3 bucket created for Terraform state (prod)
- [ ] DynamoDB table created for state locking (dev)
- [ ] DynamoDB table created for state locking (staging)
- [ ] DynamoDB table created for state locking (prod)
- [ ] Versioning enabled on state buckets
- [ ] Encryption enabled on state buckets

## Development Deployment

- [ ] Environment variables set for secrets
- [ ] Terraform backend initialized (`terraform init -backend-config=environments/backend-dev.hcl`)
- [ ] Terraform plan reviewed (`terraform plan -var-file=environments/dev.tfvars`)
- [ ] Terraform applied (`terraform apply`)
- [ ] API Gateway URL obtained
- [ ] CloudFront distribution created
- [ ] DynamoDB tables created
- [ ] Lambda functions deployed
- [ ] CloudWatch dashboard created
- [ ] Smoke tests passed
- [ ] API endpoints accessible
- [ ] CloudWatch logs visible
- [ ] No critical alarms triggered

## Staging Deployment

- [ ] Development deployment successful
- [ ] Code merged to main branch
- [ ] Environment variables set for secrets
- [ ] Terraform backend initialized (`terraform init -backend-config=environments/backend-staging.hcl`)
- [ ] Terraform plan reviewed
- [ ] Terraform applied
- [ ] Smoke tests passed
- [ ] Integration tests passed
- [ ] Load testing completed (optional)
- [ ] Security scanning completed
- [ ] Performance metrics acceptable
- [ ] No critical alarms triggered
- [ ] Stakeholder approval obtained

## Production Deployment

### Pre-Production

- [ ] Staging deployment successful and stable for 24+ hours
- [ ] All integration tests passing in staging
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure tested
- [ ] Deployment window scheduled
- [ ] Team notified of deployment
- [ ] On-call engineer identified
- [ ] Monitoring dashboard prepared

### Production Deployment Steps

- [ ] Version tag created (`git tag -a v1.0.0`)
- [ ] Version tag pushed to repository
- [ ] Environment variables set for secrets
- [ ] Terraform backend initialized (`terraform init -backend-config=environments/backend-prod.hcl`)
- [ ] Terraform plan reviewed carefully
- [ ] Deployment approval obtained (2+ approvers)
- [ ] Current Lambda versions backed up
- [ ] Terraform applied
- [ ] Smoke tests passed
- [ ] Health checks passing
- [ ] API Gateway metrics normal
- [ ] Lambda metrics normal
- [ ] DynamoDB metrics normal
- [ ] CloudWatch alarms green
- [ ] No errors in logs
- [ ] Deployment tag created

### Post-Production

- [ ] Monitor for 1 hour post-deployment
- [ ] API latency within SLA (<10s)
- [ ] Error rate within acceptable range (<1%)
- [ ] No customer complaints
- [ ] CloudWatch dashboard reviewed
- [ ] All alarms green
- [ ] Deployment documented
- [ ] Team notified of successful deployment
- [ ] Deployment log updated

## Post-Deployment Verification

### Infrastructure Verification

- [ ] All Lambda functions deployed and active
- [ ] API Gateway endpoints responding
- [ ] DynamoDB tables accessible
- [ ] S3 bucket accessible
- [ ] CloudFront distribution active
- [ ] CloudWatch logs streaming
- [ ] CloudWatch alarms configured
- [ ] SNS topic for alerts configured
- [ ] Secrets Manager secrets accessible

### Functional Verification

- [ ] Create session endpoint working
- [ ] Get session endpoint working
- [ ] Submit audio endpoint working
- [ ] Get result endpoint working
- [ ] CORS headers present
- [ ] Rate limiting active
- [ ] Authentication working
- [ ] Error handling working

### Monitoring Verification

- [ ] CloudWatch dashboard accessible
- [ ] API Gateway metrics visible
- [ ] Lambda metrics visible
- [ ] DynamoDB metrics visible
- [ ] Custom metrics visible
- [ ] Log groups created
- [ ] Alarms configured
- [ ] SNS notifications working

### Security Verification

- [ ] TLS 1.3 enforced
- [ ] S3 bucket not publicly accessible
- [ ] DynamoDB encryption enabled
- [ ] Secrets encrypted
- [ ] IAM roles properly configured
- [ ] Rate limiting active
- [ ] CORS properly configured
- [ ] API keys secured

## Rollback Checklist

### If Deployment Fails

- [ ] Stop deployment immediately
- [ ] Identify failure cause
- [ ] Check CloudWatch logs
- [ ] Review error messages
- [ ] Determine if rollback needed

### Rollback Procedure

- [ ] Notify team of rollback
- [ ] Execute rollback script or workflow
- [ ] Verify rollback successful
- [ ] Run smoke tests
- [ ] Check CloudWatch metrics
- [ ] Verify API functionality
- [ ] Monitor for 30 minutes
- [ ] Document rollback reason
- [ ] Create incident report
- [ ] Plan remediation

## Troubleshooting Checklist

### Deployment Issues

- [ ] Check Terraform state lock
- [ ] Verify AWS credentials
- [ ] Check IAM permissions
- [ ] Review Terraform plan
- [ ] Check Lambda package size
- [ ] Verify environment variables
- [ ] Check resource quotas

### Runtime Issues

- [ ] Check CloudWatch logs
- [ ] Review Lambda errors
- [ ] Check API Gateway logs
- [ ] Verify DynamoDB capacity
- [ ] Check external API connectivity
- [ ] Review CloudWatch alarms
- [ ] Check Lambda timeout settings

### Performance Issues

- [ ] Review CloudWatch metrics
- [ ] Check Lambda cold starts
- [ ] Verify DynamoDB capacity
- [ ] Check API Gateway throttling
- [ ] Review Lambda memory settings
- [ ] Check external API latency
- [ ] Verify CDN caching

## Documentation Checklist

- [ ] Deployment documented in changelog
- [ ] Architecture diagrams updated
- [ ] API documentation updated
- [ ] Runbook updated
- [ ] Incident response plan updated
- [ ] Monitoring guide updated
- [ ] Troubleshooting guide updated

## Compliance Checklist

- [ ] Audit logs enabled
- [ ] Data retention policies configured
- [ ] Encryption at rest enabled
- [ ] Encryption in transit enabled
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] SOC 2 controls implemented
- [ ] Backup and recovery tested

## Sign-Off

### Development Deployment

- Deployed by: ________________
- Date: ________________
- Version: ________________
- Status: ☐ Success ☐ Failed ☐ Rolled Back

### Staging Deployment

- Deployed by: ________________
- Date: ________________
- Version: ________________
- Status: ☐ Success ☐ Failed ☐ Rolled Back
- Approved by: ________________

### Production Deployment

- Deployed by: ________________
- Date: ________________
- Version: ________________
- Status: ☐ Success ☐ Failed ☐ Rolled Back
- Approved by (1): ________________
- Approved by (2): ________________
- Verified by: ________________

## Notes

Use this section to document any issues, deviations from the plan, or important observations:

```
[Add notes here]
```
