# Production Environment Configuration

environment = "prod"
aws_region  = "us-east-1"

# Rate limiting
rate_limit_per_minute = 60
rate_limit_per_hour   = 1000
rate_limit_burst      = 100

# Lambda configuration
lambda_memory_size       = 1024
lambda_memory_size_large = 2048
log_level                = "INFO"
log_retention_days       = 90

# DynamoDB configuration
dynamodb_billing_mode = "PAY_PER_REQUEST"
enable_autoscaling    = true

# Backup configuration
enable_backup                  = true
enable_point_in_time_recovery  = true
backup_retention_days          = 90

# CDN configuration
cdn_price_class = "PriceClass_All"
cdn_default_ttl = 3600   # 1 hour
cdn_max_ttl     = 604800 # 7 days

# Monitoring
api_5xx_error_threshold      = 10
api_latency_threshold_ms     = 10000
lambda_error_threshold       = 5
lambda_duration_threshold_ms = 10000
fraud_attempts_threshold     = 20

# Provisioned concurrency (enabled for prod)
enable_provisioned_concurrency = true
provisioned_concurrency        = 10

# Cache
enable_cache = true

# Audio retention
audio_retention_days = 90

# DynamoDB Streams (enabled for prod analytics)
enable_dynamodb_streams = true

# Tags
project_tags = {
  Project     = "VoiceLiveness-Onboarder"
  Environment = "prod"
  ManagedBy   = "Terraform"
  CostCenter  = "Production"
  Compliance  = "GDPR,CCPA"
}
