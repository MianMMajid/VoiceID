# CloudFront CDN Setup for Audio Delivery

This guide explains how to set up CloudFront CDN for secure and efficient audio delivery in the VoiceLiveness Onboarder system.

## Overview

The CDN configuration provides:
- **Fast audio delivery** via CloudFront edge locations
- **Signed URLs** for secure access control
- **Intelligent caching** with different policies for challenge vs. user audio
- **S3 backend** with encryption and lifecycle management
- **CORS support** for browser-based audio playback

## Architecture

```
Client Browser
    ↓
CloudFront CDN (Edge Locations)
    ↓
S3 Bucket (Origin)
    ├── challenges/     (24h cache, pre-generated TTS)
    └── recordings/     (5min cache, user audio)
```

## Prerequisites

1. AWS account with appropriate permissions
2. Terraform >= 1.0 installed
3. RSA key pair for signed URLs (if enabled)

## Generating RSA Key Pair for Signed URLs

```bash
# Generate private key
openssl genrsa -out private_key.pem 2048

# Generate public key
openssl rsa -pubout -in private_key.pem -out public_key.pem

# Display public key (for Terraform variable)
cat public_key.pem
```

## Configuration

### 1. Set Terraform Variables

Create `terraform.tfvars`:

```hcl
environment            = "dev"
aws_region            = "us-east-1"

# CDN Configuration
cdn_price_class       = "PriceClass_100"  # US, Canada, Europe
cdn_default_ttl       = 3600              # 1 hour
cdn_max_ttl           = 86400             # 24 hours

# Signed URLs
enable_signed_urls    = true
cdn_public_key        = <<-EOT
-----BEGIN PUBLIC KEY-----
[Your public key content here]
-----END PUBLIC KEY-----
EOT

# Audio Retention
audio_retention_days  = 90

# Optional: Custom Domain
cdn_custom_domain     = "cdn.yourdomain.com"
cdn_certificate_arn   = "arn:aws:acm:us-east-1:123456789:certificate/..."
```

### 2. Deploy CDN Infrastructure

```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file="terraform.tfvars"

# Apply configuration
terraform apply -var-file="terraform.tfvars"
```

### 3. Configure Application

After deployment, set environment variables:

```bash
export CDN_DOMAIN="d1234567890.cloudfront.net"  # From Terraform output
export CDN_KEY_ID="APKAEXAMPLE123"              # From Terraform output
export CDN_PRIVATE_KEY="$(cat private_key.pem)"
export AUDIO_BUCKET="dev-vlo-audio-123456789"
```

## Cache Behaviors

### Challenge Audio (`challenges/*`)
- **Purpose**: Pre-generated TTS challenge phrases
- **Cache TTL**: 24 hours (default), up to 7 days (max)
- **Compression**: Enabled
- **Signed URLs**: Optional (recommended for security)

### User Recordings (`recordings/*`)
- **Purpose**: User-submitted audio for verification
- **Cache TTL**: 5 minutes (default), up to 1 hour (max)
- **Compression**: Disabled (already compressed)
- **Signed URLs**: Required (contains PII)

## Using Signed URLs

### In Application Code

```typescript
import { CDNManager, createDefaultCDNConfig } from '@vlo/serverless';

// Initialize CDN manager
const cdnConfig = createDefaultCDNConfig();
const cdnManager = new CDNManager(cdnConfig);

// Generate signed URL for challenge audio
const challengeKey = 'challenges/abc123.mp3';
const signedURL = cdnManager.generateSignedURL(challengeKey, {
  expiresIn: 300,  // 5 minutes
  ipAddress: '192.168.1.1'  // Optional IP restriction
});

// Use signed URL in client
console.log('Audio URL:', signedURL);
```

### URL Format

Signed URLs include three query parameters:
- `Expires`: Unix timestamp when URL expires
- `Signature`: Cryptographic signature
- `Key-Pair-Id`: CloudFront key pair identifier

Example:
```
https://d1234567890.cloudfront.net/challenges/abc123.mp3?
  Expires=1234567890&
  Signature=ABC123...&
  Key-Pair-Id=APKAEXAMPLE
```

## S3 Bucket Configuration

### Encryption
- **Algorithm**: AES-256
- **At Rest**: All objects encrypted automatically
- **In Transit**: TLS 1.2+ required

### Lifecycle Policies

1. **Delete old audio**: After 90 days (configurable)
2. **Transition to IA**: After 30 days (cost optimization)
3. **Delete old versions**: After 7 days

### Access Control
- **Public Access**: Blocked
- **CloudFront Access**: Via Origin Access Identity (OAI)
- **Direct S3 Access**: Denied

## Monitoring

### CloudWatch Metrics

Monitor these CloudFront metrics:
- `Requests`: Total request count
- `BytesDownloaded`: Data transfer
- `4xxErrorRate`: Client errors
- `5xxErrorRate`: Server errors
- `CacheHitRate`: Cache efficiency

### Alarms

Set up CloudWatch alarms for:
- High error rates (>5%)
- Low cache hit rate (<80%)
- Unusual traffic patterns

```bash
# View CloudFront metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=E1234567890 \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Cache Invalidation

### Invalidate Specific Files

```bash
# Using AWS CLI
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/challenges/abc123.mp3" "/challenges/def456.mp3"
```

### Invalidate All Challenge Audio

```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/challenges/*"
```

### Using Terraform

```hcl
resource "aws_cloudfront_invalidation" "audio_invalidation" {
  distribution_id = aws_cloudfront_distribution.audio_cdn.id
  paths           = ["/challenges/*"]
}
```

## Cost Optimization

### Price Classes

- `PriceClass_100`: US, Canada, Europe (lowest cost)
- `PriceClass_200`: + Asia, Africa, Middle East
- `PriceClass_All`: All edge locations (highest performance)

### Storage Optimization

1. **Lifecycle transitions**: Move to IA storage after 30 days
2. **Compression**: Enable for text-based formats
3. **Delete old files**: Automatic cleanup after retention period

### Caching Strategy

1. **Long cache for challenges**: Reduce origin requests
2. **Short cache for recordings**: Balance freshness vs. cost
3. **Query string caching**: Only for signed URL parameters

## Security Best Practices

### 1. Signed URLs
- Always use signed URLs for user recordings (PII)
- Consider signed URLs for challenge audio (prevent hotlinking)
- Set appropriate expiration times (5-10 minutes)

### 2. IP Restrictions
- Use custom policies with IP restrictions for sensitive audio
- Implement geo-blocking if required by compliance

### 3. Key Rotation
- Rotate CloudFront key pairs every 90 days
- Keep private keys secure (AWS Secrets Manager)
- Never commit private keys to version control

### 4. Access Logging
- Enable CloudFront access logs
- Store logs in separate S3 bucket
- Analyze logs for suspicious patterns

## Troubleshooting

### Issue: 403 Forbidden

**Causes:**
- Signed URL expired
- Invalid signature
- IP address mismatch (if IP restriction enabled)

**Solution:**
```typescript
// Generate new signed URL with longer expiration
const url = cdnManager.generateSignedURL(key, { expiresIn: 600 });
```

### Issue: Slow First Request

**Cause:** Cold cache at edge location

**Solution:**
- Pre-warm cache by requesting popular files
- Use longer cache TTLs for challenge audio
- Consider CloudFront Functions for optimization

### Issue: High Origin Requests

**Cause:** Low cache hit rate

**Solution:**
- Increase cache TTLs
- Ensure query string forwarding is configured correctly
- Check cache key configuration

## Multi-Region Deployment

For global deployments:

1. **Use CloudFront's global network** (automatic)
2. **Consider S3 Cross-Region Replication** for origin redundancy
3. **Use Route 53** for DNS failover
4. **Deploy to multiple regions** for disaster recovery

## Compliance

### GDPR
- Audio files contain PII
- Implement right to deletion
- Set appropriate retention periods
- Log all access for audit trail

### HIPAA (if applicable)
- Enable encryption at rest and in transit
- Use signed URLs with short expiration
- Implement access logging
- Regular security audits

## Next Steps

1. Deploy CDN infrastructure with Terraform
2. Configure application with CDN credentials
3. Test signed URL generation
4. Monitor cache hit rates
5. Set up CloudWatch alarms
6. Implement cache invalidation strategy
7. Document key rotation procedures

## Resources

- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [CloudFront Signed URLs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html)
